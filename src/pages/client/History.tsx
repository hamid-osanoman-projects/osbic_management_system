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
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    
    // Filter by tab status
    const tabFiltered = jobs.filter(j => {
      if (activeTab === 'ongoing') {
        return j.status !== 'completed' && j.status !== 'cancelled';
      }
      return j.status === 'completed' || j.status === 'cancelled';
    });

    // Filter by search query
    return tabFiltered.filter(j => 
        j.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        j.job_code.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.started_date).getTime() - new Date(a.started_date).getTime());
  }, [jobs, searchQuery, activeTab]);

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
    <div className="h-full flex flex-col overflow-hidden relative">
      
      {/* ── Fixed Header & Tabs ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-6 bg-background/80 backdrop-blur-2xl z-20 sticky top-0 border-b border-white/[0.02]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
             <h1 className="text-3xl font-syne font-bold text-foreground mb-1">Service History</h1>
             <p className="text-muted-foreground/40 transition-colors uppercase tracking-[0.2em] font-black text-[8px] leading-none">
               {activeTab === 'ongoing' ? 'Operational Lifecycle' : 'Past Successes'}
             </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-center min-w-[100px]">
                <p className="text-[8px] text-[#475569] uppercase font-black tracking-widest mb-0.5">Records</p>
                <p className="text-xl font-mono font-bold text-foreground">{filteredJobs.length}</p>
             </div>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-6 items-center max-w-7xl mx-auto w-full">
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border self-start shrink-0 shadow-inner">
            <button 
              onClick={() => setActiveTab('ongoing')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'ongoing' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock size={14} /> Ongoing
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'completed' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 size={14} /> Completed
            </button>
          </div>

          <div className="flex-1 relative w-full group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab} records...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-foreground outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── Scrollable Records List ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-12 pt-8">
        <div className="max-w-4xl mx-auto">
          {filteredJobs.length === 0 ? (
            <div className="py-24 text-center bg-card/40 backdrop-blur-xl border border-border rounded-[40px] shadow-2xl flex flex-col items-center justify-center">
               <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 mx-auto border border-white/5">
                  <FolderOpen size={32} className="text-muted-foreground/20" />
               </div>
               <h3 className="text-lg font-syne font-bold text-foreground mb-1">No {activeTab === 'ongoing' ? 'Active' : 'Past'} Services</h3>
               <p className="text-[10px] text-muted-foreground/40 max-w-xs mx-auto uppercase tracking-widest">Repository Clear</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map((job) => (
                <Link 
                  to={`/portal/jobs/${job.id}`} 
                  key={job.id}
                  className="group bg-card/40 backdrop-blur-md border border-border rounded-[32px] p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden"
                >
                   {/* Decorative background badge */}
                   <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110">
                     {job.status === 'completed' ? <CheckCircle2 size={120} /> : <Clock size={120} />}
                   </div>

                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all",
                           job.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                           job.status === 'cancelled' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                           "bg-gold/10 border-gold/20 text-gold"
                         )}>
                            {job.status === 'completed' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                         </div>
                         <div>
                            <div className="flex items-center gap-3 mb-1">
                               <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{job.service_name}</h3>
                               <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                                  job.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : 
                                  job.status === 'cancelled' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                  "bg-gold/10 border-gold/20 text-gold"
                               )}>
                                  {job.status.replace('_', ' ')}
                               </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                               <span className="font-mono text-primary">{job.job_code}</span>
                               <span className="flex items-center gap-1.5"><Calendar size={10} /> {new Date(job.started_date).toLocaleDateString()}</span>
                               <span className="flex items-center gap-1.5"><User size={10} /> {job.employee_name}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-6">
                         <div className="text-right">
                            <p className="text-[10px] text-muted-foreground/40 uppercase font-black mb-0.5 tracking-widest">Price</p>
                            <p className="text-lg font-mono font-bold text-foreground">{job.total_fee.toLocaleString()} OMR</p>
                         </div>
                         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                            <ArrowUpRight size={20} />
                         </div>
                      </div>
                   </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
