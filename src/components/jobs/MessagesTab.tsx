import { useState, useRef, useEffect } from 'react';
import { type JobMessage, useSendMessage } from '../../hooks/shared/useJobs';
import { Send, MessageSquare, Loader2, User, ShieldCheck, Paperclip, Image, Eye, Download, X } from 'lucide-react';
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
  scope?: 'staff_client' | 'admin_client';
}

const MessagesTab = ({ jobId, messages, isAdmin, currentUserType, scope = 'staff_client' }: Props) => {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const qc = useQueryClient();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  // Filter messages by the conversation scope so each party only sees their thread
  const scopedMessages = messages.filter(m => {
    const msgScope = m.conversation_scope ?? 'staff_client';
    return msgScope === scope;
  });

  // Real-time subscription for instant message popping
  useEffect(() => {
    const channel = supabase
      .channel(`job-chat-${jobId}-${scope}`)
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
          qc.invalidateQueries({ queryKey: ['job_messages', jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, scope, qc]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [scopedMessages]);

  // Mark as read when messages are viewed
  useEffect(() => {
    const markAsRead = async () => {
      if (!profile?.id || !scopedMessages.length) return;

      const unreadIds = scopedMessages
        .filter(m => m.sender_id !== profile.id && !m.is_read)
        .map(m => m.id);

      if (unreadIds.length === 0) return;

      const { error } = await (supabase.from('messages') as any)
        .update({ is_read: true })
        .in('id', unreadIds);

      if (!error) {
        qc.invalidateQueries({ queryKey: ['client', 'unread-messages', profile.id] });
        qc.invalidateQueries({ queryKey: ['employee_jobs_latest_messages'] });
        qc.invalidateQueries({ queryKey: ['client_jobs_latest_messages'] });
      }
    };

    markAsRead();
  }, [scopedMessages, profile?.id, qc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };

  const handleSend = async () => {
    const cleanContent = content.trim();
    if (!cleanContent && !attachmentFile) return;
    if (isSending || isUploading) return;

    setIsUploading(true);
    let filePath = '';
    let fileName = '';

    try {
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        fileName = attachmentFile.name;
        filePath = `chat_attachments/${jobId}_${Date.now()}.${fileExt}`;
        
        const { error: storageError } = await supabase.storage.from('documents').upload(filePath, attachmentFile);
        if (storageError) throw storageError;
      }
      
      let finalContent = cleanContent;
      if (filePath) {
        const type = attachmentFile?.type.startsWith('image/') ? 'IMAGE' : 'ATTACHMENT';
        const attachmentStr = `[${type}:${filePath}|${fileName}]`;
        finalContent = finalContent ? `${attachmentStr}\n${finalContent}` : attachmentStr;
      }

      sendMessage({ jobId, content: finalContent, scope }, {
        onSuccess: () => {
          setContent('');
          setAttachmentFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    } catch (err: any) {
      import('react-hot-toast').then(toast => {
        toast.default.error('Failed to upload file');
      });
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewAttachment = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      import('react-hot-toast').then(toast => {
        toast.default.error('Could not open document.');
      });
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(filePath);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      import('react-hot-toast').then(toast => {
        toast.default.error('Download failed');
      });
    }
  };

  const renderMessageContent = (msgContent: string, isMe: boolean) => {
    const matchAttr = msgContent.match(/\[(IMAGE|ATTACHMENT):([^|]+)\|([^\]]+)\]/);
    if (matchAttr) {
      const [fullMatch, type, path, name] = matchAttr;
      const text = msgContent.replace(fullMatch, '').trim();
      return (
        <div className="flex flex-col gap-2">
          <div className={cn(
            "p-2 rounded-lg border flex items-center gap-2 w-fit max-w-[200px] sm:max-w-[250px]",
            isMe ? "bg-primary-foreground/10 border-primary-foreground/20 text-[#0A0F1E]" : "bg-card border-border text-foreground"
          )}>
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center shrink-0",
              isMe ? "bg-[#0A0F1E]/20 text-[#0A0F1E]" : "bg-muted text-muted-foreground"
            )}>
              {type === 'IMAGE' ? <Image size={14} /> : <Paperclip size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate">{name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <button 
                  onClick={() => handleViewAttachment(path)}
                  className={cn(
                    "text-[9px] flex items-center gap-1 uppercase tracking-widest hover:underline opacity-80",
                    isMe ? "text-[#0A0F1E]/80" : "text-primary"
                  )}
                >
                  <Eye size={10} /> View
                </button>
                <button 
                  onClick={() => handleDownloadAttachment(path, name)}
                  className={cn(
                    "text-[9px] flex items-center gap-1 uppercase tracking-widest hover:underline opacity-80",
                    isMe ? "text-[#0A0F1E]/80" : "text-primary"
                  )}
                >
                  <Download size={10} /> Download
                </button>
              </div>
            </div>
          </div>
          {text && <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{text}</p>}
        </div>
      );
    }
    return <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{msgContent}</p>;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const headerLabel = scope === 'admin_client' 
    ? 'Admin — Client Communication' 
    : 'Chat Support';
  
  const headerSub = scope === 'admin_client'
    ? 'Private Admin Channel'
    : isAdmin ? 'Management Active Channel' : 'Log & Messaging Terminal';

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            scope === 'admin_client' ? "bg-primary/10 border-primary/20 text-primary" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}>
            {scope === 'admin_client' || isAdmin ? <ShieldCheck size={16} /> : <MessageSquare size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{headerLabel}</h3>
            <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", scope === 'admin_client' ? "text-primary/60" : "text-muted-foreground/40")}>
              {headerSub}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
         {scopedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <MessageSquare size={32} className="text-muted-foreground/60" />
               </div>
               <p className="text-muted-foreground font-bold text-sm">No messages yet</p>
               <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[200px]">Send a first message to start the thread.</p>
            </div>
         ) : (
            scopedMessages.map((msg) => {
              const isCurrentUser = msg.sender_id === profile?.id;
              const isRight = isCurrentUser;

              return (
                <div key={msg.id} className={cn("flex flex-col gap-1 w-full", isRight ? "items-end" : "items-start")}>
                  {/* Meta above bubble */}
                  <div className={cn("flex items-center gap-1.5 px-2 mb-0.5", isRight ? "flex-row-reverse" : "flex-row")}>
                    <span className={cn("text-[9px] font-black uppercase tracking-wider", isRight ? "text-primary" : "text-muted-foreground/60")}>
                      {isCurrentUser ? (isAdmin ? 'Admin' : 'Me') : (msg.sender_name ?? 'Unknown')}
                    </span>
                    {msg.sender_type === 'admin' && !isCurrentUser && (
                      <span className="inline-flex items-center gap-0.5 px-1 rounded text-[7px] font-black uppercase bg-primary/20 text-primary border border-primary/20">
                        Admin
                      </span>
                    )}
                    <span className="text-[8px] text-muted-foreground/30 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={cn("flex items-end gap-2 max-w-[80%]", isRight ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px] uppercase border shadow-sm",
                      msg.sender_type === 'client' ? "bg-accent/10 border-accent/20 text-accent" : 
                      msg.sender_type === 'admin' ? "bg-primary/20 border-primary/30 text-primary" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    )}>
                      {msg.sender_name?.[0] || <User size={10} />}
                    </div>

                    <div className={cn(
                      "rounded-[20px] px-4 py-2.5 transition-all hover:translate-y-[-1px] shadow-sm", 
                      isRight 
                        ? "bg-primary text-[#0A0F1E] rounded-br-none shadow-xl shadow-gold/5" 
                        : "bg-background border border-border text-foreground rounded-bl-none"
                    )}>
                      {renderMessageContent(msg.content, isRight)}
                    </div>
                  </div>
                </div>
              );
            })
         )}
      </div>

      {/* Reply Area */}
      <div className="p-4 bg-black/40 border-t border-border shrink-0 space-y-3">
         {/* Attachment Preview Chip */}
         {attachmentFile && (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 w-fit max-w-[280px]">
             <div className="text-primary shrink-0">
               {attachmentFile.type.startsWith('image/') ? <Image size={14} /> : <Paperclip size={14} />}
             </div>
             <span className="text-[10px] font-bold text-foreground truncate flex-1">{attachmentFile.name}</span>
             <button 
               onClick={() => {
                 setAttachmentFile(null);
                 if (fileInputRef.current) fileInputRef.current.value = '';
               }}
               className="p-0.5 hover:bg-white/10 rounded-full text-muted-foreground hover:text-red-500 transition-colors"
             >
               <X size={12} />
             </button>
           </div>
         )}

         <div className="relative flex items-center gap-3">
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            
            {/* Attachment Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all flex items-center justify-center shrink-0 h-11 w-11 shadow-sm"
              title="Attach document or image"
            >
              <Paperclip size={16} />
            </button>

            <div className="flex-1 relative group flex items-center">
              <input 
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  scope === 'admin_client' ? "Message client privately..." :
                  currentUserType === 'client' ? "Reply to your Case Officer..." : 
                  "Type a secure message..."
                }
                className="w-full bg-background border border-border rounded-full pl-5 pr-20 py-2.5 text-xs text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none h-11 transition-all"
              />
              <div className="absolute right-4 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none hidden sm:block">
                <p className="text-[8px] text-primary/60 font-black uppercase tracking-widest">Enter to send</p>
              </div>
            </div>

            <button 
              onClick={handleSend}
              disabled={isSending || isUploading || (!content.trim() && !attachmentFile)}
              className={cn(
                "p-3 rounded-full transition-all shadow-lg flex items-center justify-center shrink-0 h-11 w-11",
                (content.trim() || attachmentFile) ? "bg-primary text-[#0A0F1E] hover:scale-105 active:scale-95" : "bg-white/5 text-muted-foreground/30 border border-white/5"
              )}
            >
              {(isSending || isUploading) ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
         </div>
      </div>
    </div>
  );
};

export default MessagesTab;
