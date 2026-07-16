import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useChatRooms = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['chat_rooms', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // Fetch rooms the user is participating in
      const { data: participants, error: pError } = await supabase
        .from('chat_participants')
        .select('chat_id, last_read_at, role')
        .eq('user_id', profile.id);

      if (pError) throw pError;
      if (!participants || participants.length === 0) return [];

      const chatIds = participants.map((p: any) => p.chat_id);

      // Fetch the rooms
      const { data: rooms, error: rError } = await (supabase as any)
        .from('chat_rooms')
        .select(`
          *,
          participants:chat_participants(user_id, role, last_read_at, profiles(id, full_name, avatar_url, role, is_active)),
          latest_message:chat_messages(content, created_at, sender_id)
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (rError) throw rError;

      // Transform data for easier consumption in UI
      return (rooms || []).map((room: any) => {
        const currentUserParticipant = room.participants.find((p: any) => p.user_id === profile.id);
        const otherParticipants = room.participants.filter((p: any) => p.user_id !== profile.id);
        
        let roomName = room.name;
        let roomAvatar = null;
        
        // If it's a direct message, derive name from the other person
        if (room.type === 'direct' && otherParticipants.length > 0) {
           const otherUser = otherParticipants[0].profiles;
           roomName = otherUser?.full_name || 'Unknown User';
           roomAvatar = otherUser?.avatar_url;
           room.is_client = otherUser?.role === 'client';
           room.is_team = otherUser?.role === 'employee' || otherUser?.role === 'admin';
        } else {
           // Groups are considered team
           room.is_client = false;
           room.is_team = true;
        }

        // Sort latest messages if returned as array
        const sortedMessages = Array.isArray(room.latest_message) 
          ? room.latest_message.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          : [];
        const lastMsg = sortedMessages[0] || null;

        // Calculate unread count (if message created after last_read_at)
        let unread = false;
        if (lastMsg && currentUserParticipant?.last_read_at) {
           unread = new Date(lastMsg.created_at) > new Date(currentUserParticipant.last_read_at);
        } else if (lastMsg && !currentUserParticipant?.last_read_at) {
           unread = true;
        }
        
        // Avoid marking own messages as unread
        if (lastMsg && lastMsg.sender_id === profile.id) {
           unread = false;
        }

        return {
          ...room,
          display_name: roomName,
          display_avatar: roomAvatar,
          other_participants: otherParticipants,
          last_message: lastMsg,
          has_unread: unread,
          current_user_role: currentUserParticipant?.role
        };
      });
    },
    enabled: !!profile?.id,
    refetchInterval: 10000 // Poll every 10s for new chats/messages
  });
};

export const useChatMessages = (chatId: string | null) => {
  return useQuery({
    queryKey: ['chat_messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url, role)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!chatId,
    refetchInterval: 3000 // Fast polling for active chat
  });
};

export const useSendChatMessage = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!profile) throw new Error('Not authenticated');

      // 1. Send message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: profile.id,
          content
        } as any);

      if (msgError) throw msgError;

      // 2. Bump room's updated_at
      await (supabase as any)
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      // 3. Update my own last_read_at so my message isn't unread to me
      await (supabase as any)
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', profile.id);

      return true;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['chat_messages', variables.chatId] });
      qc.invalidateQueries({ queryKey: ['chat_rooms'] });
    }
  });
};

export const useCreateDirectChat = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!profile) throw new Error('Not authenticated');

      // 1. Check if direct chat already exists
      // We look for a direct room where both users are participants
      const { data: existingParticipantRows } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .in('user_id', [profile.id, targetUserId]);
      
      if (existingParticipantRows && existingParticipantRows.length > 0) {
        // Group by chat_id and see if any chat_id has exactly 2 occurrences
        const counts: Record<string, number> = {};
        existingParticipantRows.forEach((row: any) => {
           counts[row.chat_id] = (counts[row.chat_id] || 0) + 1;
        });
        
        for (const [chatId, count] of Object.entries(counts)) {
           if (count === 2) {
             // Verify it's a direct room
             const { data: roomCheck } = await supabase.from('chat_rooms').select('type').eq('id', chatId).single();
             if (roomCheck && roomCheck.type === 'direct') {
                return chatId; // Return existing chat ID
             }
           }
        }
      }

      // 2. Create new direct room
      const newRoomId = crypto.randomUUID();
      const { error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          id: newRoomId,
          type: 'direct',
          created_by: profile.id
        } as any);

      if (roomError) throw roomError;

      // 3. Add both participants
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newRoomId, user_id: profile.id, role: 'admin' },
          { chat_id: newRoomId, user_id: targetUserId, role: 'member' }
        ] as any);

      if (partError) throw partError;

      return newRoomId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat_rooms'] });
    }
  });
};

export const useCreateGroupChat = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ name, participantIds }: { name: string; participantIds: string[] }) => {
      if (!profile) throw new Error('Not authenticated');

      // 1. Create room
      const newRoomId = crypto.randomUUID();
      const { error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          id: newRoomId,
          type: 'group',
          name,
          created_by: profile.id
        } as any);

      if (roomError) throw roomError;

      // 2. Add participants
      const allParticipants = [profile.id, ...participantIds.filter(id => id !== profile.id)];
      const inserts = allParticipants.map(id => ({
        chat_id: newRoomId,
        user_id: id,
        role: id === profile.id ? 'admin' : 'member'
      }));

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(inserts as any);

      if (partError) throw partError;

      return newRoomId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat_rooms'] });
      toast.success('Group created successfully');
    }
  });
};

export const useMarkChatRead = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!profile) return;
      const { error } = await (supabase as any)
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', profile.id);
        
      if (error) throw error;
    },
    onSuccess: (_, chatId) => {
      qc.invalidateQueries({ queryKey: ['chat_rooms'] });
    }
  });
};
