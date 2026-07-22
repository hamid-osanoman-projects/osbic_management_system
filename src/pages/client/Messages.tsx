import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Clock, User, ShieldCheck, 
  Search, ChevronRight, Inbox, Loader2, ChevronLeft 
} from 'lucide-react';
import { useClientJobs, useJobDetail } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import MessagesTab from '../../components/jobs/MessagesTab';
import { Skeleton } from '../../components/shared/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const ClientMessages = () => {
  const { profile } = useAuth();
  const { data: jobs, isLoading: isLoadingJobs } = useClientJobs(profile?.id || '');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch detail for the active thread
  const { data: jobDetail, isLoading: isLoadingDetail } = useJobDetail(selectedJobId || '');

  // Fetch latest message for each of the client's jobs to support sorting and snippets
  const { data: latestMessages = {} } = useQuery({
    queryKey: ['client_jobs_latest_messages', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};
      const { data, error } = await supabase
        .from('messages')
        .select('job_id, created_at, content, sender_id, is_read, conversation_scope, sender:profiles!messages_sender_id_fkey(full_name)')
        .eq('conversation_scope', 'staff_client')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      const mapping: Record<string, any> = {};
      (data || []).forEach((m: any) => {
        if (!mapping[m.job_id]) {
          mapping[m.job_id] = { ...m, sender_name: m.sender?.full_name ?? 'Unknown' };
        }
      });
      return mapping;
    },
    enabled: !!profile?.id
  });

  // Filter threads based on search
  const filteredThreads = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => 
      j.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.job_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobs, searchQuery]);

  // Sort threads based on latest message time strictly
  const sortedThreads = useMemo(() => {
    if (!filteredThreads) return [];
    return [...filteredThreads].sort((a, b) => {
      const aMsg = latestMessages[a.id];
      const bMsg = latestMessages[b.id];
      
      const aTime = aMsg ? new Date(aMsg.created_at).getTime() : 0;
      const bTime = bMsg ? new Date(bMsg.created_at).getTime() : 0;
      
      if (aTime || bTime) {
        return bTime - aTime;
      }
      return new Date(b.started_date || 0).getTime() - new Date(a.started_date || 0).getTime();
    });
  }, [filteredThreads, latestMessages]);

  // Find selected job metadata from list
  const activeJob = jobs?.find(j => j.id === selectedJobId);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden h-full p-6 sm:p-8 lg:p-12">
      
      {/* ── Chat Sidebar (Job Threads) ── */}
      <div className={cn(
        "w-full lg:w-80 flex flex-col gap-6 shrink-0 h-full",
        selectedJobId ? "hidden lg:flex" : "flex"
      )}>
        <div className="px-2">
           <h1 className="text-2xl font-syne font-bold text-foreground mb-1">Messages</h1>
           <p className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[10px] leading-none">Help & Support</p>
        </div>

        <div className="relative group px-1">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
           <input 
             type="text" 
             placeholder="Search threads..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-card border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground outline-none focus:border-primary/30 transition-all font-medium" 
           />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
           {isLoadingJobs ? (
             Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[24px]" />)
           ) : sortedThreads.length === 0 ? (
             <div className="text-center py-12 px-4">
                <Inbox size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground italic">No messages yet</p>
             </div>
           ) : (
             sortedThreads.map(thread => {
                const isUnread = latestMessages[thread.id] && latestMessages[thread.id].sender_id !== profile?.id && !latestMessages[thread.id].is_read;
                
                return (
                  <motion.div 
                    key={thread.id} 
                    onClick={() => setSelectedJobId(thread.id)}
                    whileHover={{ x: 4 }}
                    className={`bg-card border transition-all cursor-pointer relative overflow-hidden p-4 rounded-[24px] group flex gap-3 ${
                      selectedJobId === thread.id 
                       ? 'border-primary/20 shadow-xl shadow-gold/5 bg-white/[0.02]' 
                       : (isUnread ? 'border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/5' : 'border-border hover:border-white/10')
                    }`}
                  >
                     {selectedJobId === thread.id && (
                       <motion.div layoutId="active-indicator" className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                     )}
                     
                     <div className="relative shrink-0 mt-0.5">
                       <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                         {thread.employee_name[0] || 'A'}
                       </div>
                       {isUnread && (
                         <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border border-card flex items-center justify-center">
                           <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                         </div>
                       )}
                     </div>

                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-0.5">
                         <h4 className={cn("text-sm truncate group-hover:text-primary transition-colors", isUnread ? "font-black text-foreground" : "font-bold text-foreground")}>
                           {thread.employee_name}
                         </h4>
                         {latestMessages[thread.id] && (
                           <span className={cn("font-mono text-[8px] tracking-tight", isUnread ? "text-primary font-bold" : "text-muted-foreground/40")}>
                             {new Date(latestMessages[thread.id].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         )}
                       </div>
                       
                       <p className="text-[10px] text-muted-foreground/50 transition-colors uppercase tracking-widest font-black mb-1.5">
                         {thread.service_name}
                       </p>
                       
                       {latestMessages[thread.id] ? (
                         <p className={cn("text-[10px] truncate font-medium bg-muted/20 px-2.5 py-1 rounded-xl border", isUnread ? "text-foreground border-primary/20 bg-primary/5 font-semibold" : "text-muted-foreground/60 border-border/30")}>
                           <span className={cn("mr-1", isUnread ? "font-black text-primary" : "font-bold text-primary")}>
                             {latestMessages[thread.id].sender_id === profile?.id ? 'You' : latestMessages[thread.id].sender_name}:
                           </span>
                           {latestMessages[thread.id].content}
                         </p>
                       ) : (
                         <p className="text-[10px] text-muted-foreground/40 italic">No messages yet</p>
                       )}
                     </div>
                  </motion.div>
                );
              })
           )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className={cn(
        "flex-1 flex flex-col h-full min-h-[500px]",
        selectedJobId ? "flex" : "hidden lg:flex"
      )}>
        {!selectedJobId ? (
          <div className="flex-1 bg-card/40 backdrop-blur-xl border border-border rounded-[40px] flex flex-col items-center justify-center text-center p-12 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-20" />
             <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shadow-2xl">
                   <MessageSquare size={42} className="text-primary" />
                </div>
                <h3 className="text-2xl font-syne font-bold text-foreground mb-3">Message Center</h3>
                <p className="text-muted-foreground/50 max-w-sm mx-auto text-sm font-medium leading-relaxed">Select a service from the list to start chatting with our support team.</p>
             </div>
          </div>
        ) : isLoadingDetail || !jobDetail ? (
          <div className="flex-1 bg-card border border-border rounded-[40px] flex flex-col items-center justify-center">
             <Loader2 size={32} className="text-primary animate-spin mb-4" />
             <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-black">Loading messages...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col h-full"
          >
              {/* Header Override for Global Inbox Look */}
             <div className="bg-card border border-border rounded-t-3xl border-b-0 p-6 flex items-center justify-between shrink-0 shadow-lg relative z-10">
                <div className="flex items-center gap-4">
                  {/* Mobile Back Button */}
                  <button 
                    onClick={() => setSelectedJobId(null)}
                    className="lg:hidden p-2.5 rounded-xl bg-muted border border-border text-foreground hover:bg-white/5 active:scale-95 transition-all shrink-0 mr-2"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-none mb-1.5">{jobDetail.job.service_name}</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px]">Support Agent: {jobDetail.job.employee_name}</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* Functional Chat Tab */}
             <div className="flex-1 overflow-hidden rounded-b-3xl">
                <MessagesTab 
                  jobId={selectedJobId} 
                  messages={jobDetail.messages} 
                  isAdmin={false} 
                  currentUserType="client"
                  scope="staff_client"
                />
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientMessages;
