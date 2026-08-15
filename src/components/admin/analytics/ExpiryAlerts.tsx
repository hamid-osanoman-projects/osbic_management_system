import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Bell, Clock, RefreshCw } from 'lucide-react';
import { useAdminJobs } from '../../../hooks/shared/useJobs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ExpiryAlerts = () => {
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useAdminJobs();

  const expiringList = useMemo(() => {
    if (!jobs) return [];
    
    const now = new Date();
    
    // Filter out only completed jobs that have an explicit expiry date
    const list = jobs
      .filter(j => (j as any).status === 'completed' && (j as any).service_expiry_date)
      .map(job => {
        const expiryDate = new Date((job as any).service_expiry_date!);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let severity: 'safe' | 'soon' | 'approaching' | 'urgent' | 'expired' = 'safe';
        
        if (diffDays <= 0) severity = 'expired';
        else if (diffDays < 30) severity = 'urgent';
        else if (diffDays < 60) severity = 'approaching';
        else if (diffDays <= 180) severity = 'soon';

        return { ...job, daysRemaining: diffDays, severity, expiryDate };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return list;
  }, [jobs]);

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />;
  }

  // Visual Helper Generators
  const getSeverityBadge = (severity: string, days: number) => {
    switch (severity) {
      case 'expired':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30 w-max">
            EXPIRED ({Math.abs(days)} days ago)
          </span>
        );
      case 'urgent':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            URGENT
          </span>
        );
      case 'approaching':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Expiring
          </span>
        );
      case 'soon':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20 w-max">
            Expiring Soon
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-white/5 text-muted-foreground text-xs font-medium w-max">
            Optimal
          </span>
        );
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-red-500/5 to-transparent">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" /> Critical Expiry Radar
        </h2>
        <span className="text-[10px] text-muted-foreground font-mono tracking-wider">{expiringList.length} TRACKED</span>
      </div>

      <div className="flex-1 overflow-x-auto no-scrollbar">
         {expiringList.length > 0 ? (
           <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-background/50 border-b border-border">
                 <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-1/4">Client Identity</th>
                 <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-1/4">Service</th>
                 <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Remaining</th>
                 <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                 <th className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {expiringList.map((job) => (
                 <tr 
                   key={job.id} 
                   className={cn(
                     "border-b border-border transition-colors group",
                     job.severity === 'expired' ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-white/5"
                   )}
                 >
                   <td className="p-4">
                     <p className="text-sm font-bold text-foreground">{job.client_name}</p>
                     <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">{job.job_code}</p>
                   </td>
                   <td className="p-4">
                     <p className="text-sm text-muted-foreground font-medium line-clamp-1">{job.service_name}</p>
                     <p className="text-[10px] text-muted-foreground/60 mt-1">
                       Issued: {new Date((job as any).created_at || Date.now()).toLocaleDateString()}
                     </p>
                   </td>
                   <td className="p-4 text-center">
                     <div className="flex flex-col items-center justify-center">
                       <span className={cn(
                         "text-xl font-bold font-mono",
                         job.severity === 'expired' ? "text-red-500" :
                         job.severity === 'urgent' ? "text-red-400" :
                         job.severity === 'approaching' ? "text-orange-400" :
                         "text-foreground"
                       )}>
                         {job.daysRemaining > 0 ? job.daysRemaining : 0}
                       </span>
                       <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">Days</span>
                     </div>
                   </td>
                   <td className="p-4">
                     {getSeverityBadge(job.severity, job.daysRemaining)}
                   </td>
                   <td className="p-4">
                     <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground transition-colors" title="Send Reminder">
                          <Bell size={14} />
                        </button>
                         <button 
                           onClick={() => navigate(`/employee/tasks?action=new-project&clientId=${(job as any).client_id}&serviceId=${(job as any).service_id}&entryType=renewal`)}
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors" 
                           title="Start Renewal"
                         >
                           <RefreshCw size={12} /> Renew
                         </button>
                        <button 
                          onClick={() => navigate(`/admin/jobs/${job.id}`)}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" 
                          title="View Job"
                        >
                          <ArrowRight size={14} />
                        </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         ) : (
           <div className="flex flex-col items-center justify-center h-48 text-center px-4">
             <Clock size={32} className="text-muted-foreground/60 mb-3 opacity-50" />
             <p className="text-sm font-bold text-foreground">No Upcoming Expirations</p>
             <p className="text-xs text-muted-foreground">All completed service documents are securely within active limits.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default ExpiryAlerts;
