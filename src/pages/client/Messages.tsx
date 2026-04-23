import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Clock, User, ShieldCheck, 
  Search, ChevronRight, Inbox, Loader2 
} from 'lucide-react';
import { useClientJobs, useJobDetail } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import MessagesTab from '../../components/jobs/MessagesTab';
import { Skeleton } from '../../components/shared/Skeleton';

const ClientMessages = () => {
  const { profile } = useAuth();
  const { data: jobs, isLoading: isLoadingJobs } = useClientJobs(profile?.id || '');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch detail for the active thread
  const { data: jobDetail, isLoading: isLoadingDetail } = useJobDetail(selectedJobId || '');

  // Filter threads based on search
  const filteredThreads = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => 
      j.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.job_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [jobs, searchQuery]);

  // Find selected job metadata from list
  const activeJob = jobs?.find(j => j.id === selectedJobId);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
      
      {/* ── Chat Sidebar (Job Threads) ── */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 h-full">
        <div className="px-2">
           <h1 className="text-2xl font-syne font-bold text-foreground mb-1">Messages</h1>
           <p className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[10px] leading-none">Support Center</p>
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
           ) : filteredThreads.length === 0 ? (
             <div className="text-center py-12 px-4">
                <Inbox size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground italic">No conversations found</p>
             </div>
           ) : (
             filteredThreads.map(thread => (
               <motion.div 
                 key={thread.id} 
                 onClick={() => setSelectedJobId(thread.id)}
                 whileHover={{ x: 4 }}
                 className={`bg-card border transition-all cursor-pointer relative overflow-hidden p-4 rounded-[24px] group ${
                   selectedJobId === thread.id 
                    ? 'border-primary/20 shadow-xl shadow-gold/5 bg-white/[0.02]' 
                    : 'border-border hover:border-white/10'
                 }`}
               >
                  {selectedJobId === thread.id && (
                    <motion.div layoutId="active-indicator" className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-[9px] font-black text-primary uppercase tracking-widest">{thread.job_code}</p>
                     <span className="text-muted-foreground/40 transition-colors font-mono text-[8px] uppercase">{thread.status}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">{thread.service_name}</h4>
                  <p className="text-muted-foreground/60 line-clamp-1 text-[11px] leading-tight flex items-center gap-1.5">
                    <User size={10} className="opacity-40" /> Case Officer: {thread.employee_name}
                  </p>
               </motion.div>
             ))
           )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-h-[500px]">
        {!selectedJobId ? (
          <div className="flex-1 bg-card border border-border rounded-[40px] flex flex-col items-center justify-center text-center p-12 shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
             <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 mx-auto shadow-2xl">
                   <MessageSquare size={36} className="text-primary/20" />
                </div>
                <h3 className="text-xl font-syne font-bold text-foreground mb-2">Service Support Hub</h3>
                <p className="text-muted-foreground/60 max-w-sm mx-auto text-sm">Select a project thread from the sidebar to view your secure conversation history with our operational team.</p>
             </div>
          </div>
        ) : isLoadingDetail ? (
          <div className="flex-1 bg-card border border-border rounded-[40px] flex flex-col items-center justify-center">
             <Loader2 size={32} className="text-primary animate-spin mb-4" />
             <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-black">Decrypting Secure Thread...</p>
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
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-none mb-1.5">{jobDetail.job.service_name}</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px]">Case Officer: {jobDetail.job.employee_name}</span>
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
                />
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientMessages;
