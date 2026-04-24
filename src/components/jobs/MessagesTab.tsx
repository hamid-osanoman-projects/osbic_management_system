import { useState, useRef, useEffect } from 'react';
import { type JobMessage, useSendMessage } from '../../hooks/shared/useJobs';
import { Send, MessageSquare, Loader2, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  jobId: string;
  messages: JobMessage[];
  isAdmin: boolean;
  currentUserType: 'employee' | 'admin' | 'client';
}

const MessagesTab = ({ jobId, messages, isAdmin, currentUserType }: Props) => {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  // Real-time subscription for instant message popping
  useEffect(() => {
    const channel = supabase
      .channel(`job-chat-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['job', jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, qc]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when messages are viewed
  useEffect(() => {
    const markAsRead = async () => {
      if (!profile?.id || !messages.length) return;

      const unreadIds = messages
        .filter(m => m.sender_id !== profile.id && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length === 0) return;

      const { error } = await (supabase.from('messages') as any)
        .update({ is_read: true })
        .in('id', unreadIds);

      if (!error) {
        // Invalidate global unread count
        qc.invalidateQueries({ queryKey: ['client', 'unread-messages', profile.id] });
      }
    };

    markAsRead();
  }, [messages, profile?.id, qc]);

  const handleSend = () => {
    const cleanContent = content.trim();
    if (!cleanContent || isSending) return;
    
    sendMessage({ jobId, content: cleanContent }, {
      onSuccess: () => {
        setContent('');
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            isAdmin ? "bg-primary/10 border-primary/20 text-primary" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}>
            {isAdmin ? <ShieldCheck size={16} /> : <MessageSquare size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Client Communication Thread</h3>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", isAdmin ? "text-primary/60" : "text-muted-foreground/40")}>
              {isAdmin ? "Management Active Channel" : "Log & Messaging Terminal"}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
         {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <MessageSquare size={32} className="text-muted-foreground/60" />
               </div>
               <p className="text-muted-foreground font-bold text-sm">No messages yet</p>
               <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[200px]">Send a first message to start the thread.</p>
            </div>
         ) : (
            messages.map((msg) => {
              // OPTIMIZATION: Use profile?.id to avoid expensive async auth calls in render loop
              const isCurrentUser = msg.sender_id === profile?.id;
              const isRight = isCurrentUser;

              return (
                <div key={msg.id} className={cn("flex items-end gap-3", isRight ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] uppercase border",
                    msg.sender_type === 'client' ? "bg-accent/10 border-accent/20 text-accent" : 
                    msg.sender_type === 'admin' ? "bg-primary/20 border-primary/30 text-primary" :
                    "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  )}>
                    {msg.sender_name[0] || <User size={12} />}
                  </div>

                  <div className={cn(
                    "max-w-[80%] rounded-2xl p-4 transition-all hover:translate-y-[-1px]", 
                    isRight 
                      ? "bg-primary text-[#0A0F1E] rounded-br-none shadow-xl shadow-gold/5" 
                      : "bg-background border border-border text-foreground rounded-bl-none shadow-sm"
                  )}>
                     <div className="flex items-center justify-between gap-6 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-[9px] font-black uppercase tracking-wider", isRight ? "text-[#0A0F1E]/60" : "text-muted-foreground")}>
                            {isCurrentUser ? (isAdmin ? 'Admin (Me)' : 'Me') : msg.sender_name}
                          </p>
                          {msg.sender_type === 'admin' && !isCurrentUser && (
                            <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-primary/20 text-primary")}>
                              <ShieldCheck size={8} /> Admin
                            </span>
                          )}
                        </div>
                        <p className={cn("text-[8px] font-mono", isRight ? "text-[#0A0F1E]/40" : "text-muted-foreground/40")}>
                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })
         )}
      </div>

      {/* Reply Area (Now Unlocked for Admin) */}
      <div className="p-4 bg-black/40 border-t border-border shrink-0">
         <div className="relative flex items-center gap-3">
            <div className="flex-1 relative group">
              <textarea 
                rows={1}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentUserType === 'admin' ? "Issue Management Instruction..." :
                  currentUserType === 'client' ? "Reply to your Case Officer..." : 
                  "Type a secure message..."
                }
                className="w-full bg-background border border-border rounded-xl pl-4 pr-4 py-3 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none resize-none overflow-hidden h-[48px] transition-all"
              />
              <div className="absolute right-3 bottom-[-18px] opacity-0 group-focus-within:opacity-100 transition-opacity">
                <p className="text-[8px] text-primary font-bold uppercase tracking-widest">Press Enter to Send</p>
              </div>
            </div>
            <button 
              onClick={handleSend}
              disabled={isSending || !content.trim()}
              className={cn(
                "p-3 rounded-xl transition-all shadow-lg flex items-center justify-center shrink-0 h-[48px] w-[50px]",
                content.trim() ? "bg-primary text-[#0A0F1E] hover:scale-105 active:scale-95" : "bg-white/5 text-muted-foreground/30"
              )}
            >
              {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
         </div>
      </div>
    </div>
  );
};

export default MessagesTab;
