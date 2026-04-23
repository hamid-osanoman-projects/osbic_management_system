import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Search, Filter, ChevronRight, CheckCircle2, Clock, Calendar, ArrowUpRight, User } from 'lucide-react';
import { useClientJobs } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/shared/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const History = () => {
  const { profile } = useAuth();
  const { data: jobs, isLoading } = useClientJobs(profile?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const historyJobs = useMemo(() => {
    if (!jobs) return [];
    // Only show completed or cancelled jobs in history
    return jobs.filter(j => 
        (j.status === 'completed' || j.status === 'cancelled') &&
        (j.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         j.job_code.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => new Date(b.started_date).getTime() - new Date(a.started_date).getTime());
  }, [jobs, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h1 className="text-3xl font-syne font-bold text-foreground mb-2">Service History</h1>
           <p className="text-muted-foreground/60 transition-colors uppercase tracking-[0.2em] font-bold text-[10px] leading-none">Archives & Performance Records</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-center min-w-[100px]">
              <p className="text-[9px] text-[#475569] uppercase font-bold tracking-widest mb-0.5">Total Cases</p>
              <p className="text-xl font-mono font-bold text-foreground">{historyJobs.length}</p>
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
         <div className="flex-1 relative w-full group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by service or job code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm text-foreground outline-none focus:border-primary/30 transition-all font-medium"
            />
         </div>
         <button className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-muted-foreground hover:text-foreground transition-all shrink-0">
            <Filter size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Filter</span>
         </button>
      </div>

      {/* History List */}
      <div className="grid gap-4">
        {historyJobs.length === 0 ? (
          <div className="py-20 text-center bg-card border border-border rounded-[40px] shadow-inner">
             <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 mx-auto">
                <FolderOpen size={40} className="text-muted-foreground/20" />
             </div>
             <h3 className="text-lg font-syne font-bold text-foreground mb-1">No Archives Yet</h3>
             <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Once your active services are marked as complete, they will appear here as permanent records.</p>
          </div>
        ) : (
          historyJobs.map((job) => (
            <Link 
              to={`/portal/jobs/${job.id}`} 
              key={job.id}
              className="group bg-card border border-border rounded-[32px] p-6 hover:border-primary/20 hover:shadow-2xl hover:shadow-gold/5 transition-all relative overflow-hidden"
            >
               {/* Decorative background badge */}
               <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110">
                 <CheckCircle2 size={160} />
               </div>

               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner",
                       job.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                     )}>
                        {job.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{job.service_name}</h3>
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                              job.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500"
                           )}>
                              {job.status}
                           </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/60">
                           <span className="font-mono text-primary font-bold">{job.job_code}</span>
                           <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(job.started_date).toLocaleDateString()}</span>
                           <span className="flex items-center gap-1.5"><User size={12} /> {job.employee_name}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <p className="text-[10px] text-muted-foreground/40 uppercase font-black mb-0.5 tracking-widest">Service Fee</p>
                        <p className="text-lg font-mono font-bold text-foreground">{job.total_fee.toLocaleString()} OMR</p>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                        <ArrowUpRight size={20} />
                     </div>
                  </div>
               </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
