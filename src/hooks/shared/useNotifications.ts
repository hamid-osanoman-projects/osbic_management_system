import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  job_id: string | null;
  type: 'action_required' | 'expiry' | 'system' | 'payment';
  title_en: string;
  title_ar: string;
  body_en: string | null;
  body_ar: string | null;
  is_read: boolean;
  action_required: boolean;
  action_url: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch notifications for current user
  const useNotificationsList = () => {
    return useQuery({
      queryKey: ['notifications', user?.id],
      queryFn: async (): Promise<Notification[]> => {
        if (!user) return [];
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return data || [];
      },
      enabled: !!user,
      refetchInterval: 30000, // Poll every 30s
    });
  };

  // 2. Mark as read
  const useMarkRead = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true } as any)
          .eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  };

  // 3. Mark all as read
  const useMarkAllRead = () => {
    return useMutation({
      mutationFn: async () => {
        if (!user) return;
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true } as any)
          .eq('recipient_id', user.id)
          .eq('is_read', false);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  };

  // 4. Delete notification
  const useDeleteNotification = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'pulse'] });
      },
    });
  };

  return {
    useNotificationsList,
    useMarkRead,
    useMarkAllRead,
    useDeleteNotification,
  };
};
