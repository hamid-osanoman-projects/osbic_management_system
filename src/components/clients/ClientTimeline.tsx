import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, CheckCircle2, Clock, 
  FileText, CornerDownRight, Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Job {
  id: string;
  job_code: string;
  service_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_fee: number;
}

interface Props {
  jobs: Job[];
  isLoading?: boolean;
}

const ClientTimeline = ({ jobs, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-6">
            <div className="w-12 h-12 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded w-1/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!jobs?.length) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
         <Briefcase size={40} className="mx-auto text-foreground/5 mb-4" />
         <p className="text-sm text-muted-foreground/60 font-bold uppercase tracking-widest">No service record found</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-12 after:absolute after:left-[23px] after:top-2 after:bottom-2 after:w-[2px] after:bg-gradient-to-b after:from-gold/50 after:via-gold/20 after:to-transparent">
      {jobs.map((job, idx) => (
        <motion.div
          key={job.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative flex gap-8 pl-14"
        >
          {/* Icon Circle */}
          <div className="bg-background border border-border rounded-2xl flex items-center justify-center z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] w-12 h-12 absolute left-0 top-0">
            {job.status === 'completed' ? (
              <CheckCircle2 size={20} className="text-emerald-400" />
            ) : (
              <Clock size={20} className="text-primary" />
            )}
          </div>

          <div className="bg-background border border-border rounded-3xl p-6 hover:border-primary/30 transition-all group flex-1">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-primary uppercase tracking-widest">{job.job_code}</span>
                    <span className="text-foreground/20">•</span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-bold uppercase">
                      <Calendar size={10} />
                      {new Date(job.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors font-syne capitalize">{job.service_name}</h4>
               </div>
               <div className="text-right">
                  <p className="text-xl font-bold text-emerald-400 font-mono">{job.total_fee.toLocaleString()} OMR</p>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Total Value</p>
               </div>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-muted-foreground/60 transition-colors bg-white/5 border border-border rounded-2xl p-4 flex items-center gap-4">
                   <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                     <FileText size={18} />
                   </div>
                   <div>
                     <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-0.5">Documents Provided</p>
                     <p className="text-xs font-bold text-foreground">Commercial Register, ID Copy</p>
                   </div>
                </div>
                <div className="text-muted-foreground/60 transition-colors bg-white/5 border border-border rounded-2xl p-4 flex items-center gap-4">
                   <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                     <CornerDownRight size={18} />
                   </div>
                   <div>
                     <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-0.5">Final Status</p>
                     <p className={cn("text-xs font-bold uppercase tracking-wider", job.status === 'completed' ? 'text-emerald-400' : 'text-primary')}>
                       {job.status.replace('_', ' ')}
                     </p>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ClientTimeline;
