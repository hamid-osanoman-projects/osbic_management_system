import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useBottleneckMetrics } from '../../../hooks/admin/useAnalytics';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BottleneckAnalytics = () => {
  const { data: bottlenecks, isLoading } = useBottleneckMetrics();

  // Determine MAX hours to scale horizontal graph smoothly
  const maxHrs = useMemo(() => {
    if (!bottlenecks || bottlenecks.length === 0) return 100;
    return Math.max(...bottlenecks.map(c => Math.max(c.expectedHrs, c.actualHrs)));
  }, [bottlenecks]);

  if (isLoading) {
    return (
      <div className="h-full bg-card rounded-2xl border border-border flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={24} />
        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Profiling Execution Delays...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-2xl flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between pb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} className="text-orange-400" /> Operational SLA Delays
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Expected SLA Vs Average Delivery (in hours)</p>
        </div>
      </div>

      {/* CHART AREA */}
      <div className="p-6 pb-2 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {bottlenecks?.length === 0 && (
           <div className="text-center py-12">
              <p className="text-xs text-muted-foreground/60">No performance data available yet.</p>
           </div>
        )}
        {bottlenecks?.map((item, i) => {
           const expPerc = (item.expectedHrs / maxHrs) * 100;
           const actPerc = (item.actualHrs / maxHrs) * 100;
           
           const isCritical = item.actualHrs >= item.expectedHrs * 1.5;

           return (
             <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground line-clamp-1">{item.step}</span>
                  <span className="text-muted-foreground shrink-0 font-mono">
                    <span className={cn("font-bold", item.actualHrs > item.expectedHrs ? "text-red-400" : "text-emerald-400")}>
                      {item.actualHrs}h
                    </span> / {item.expectedHrs}h
                  </span>
                </div>
                
                {/* Dual Bar Track */}
                <div className="relative h-4 w-full bg-background rounded-full overflow-hidden border border-border">
                   
                   {/* Expected Bar */}
                   <motion.div 
                     initial={{ width: 0 }}
                     whileInView={{ width: `${expPerc}%` }}
                     viewport={{ once: true }}
                     transition={{ duration: 1, type: "spring" }}
                     className="absolute top-0 left-0 h-full bg-blue-500/40 border-r border-white/20 z-10"
                   />
                   
                   {/* Actual Bar */}
                   <motion.div 
                     initial={{ width: 0 }}
                     whileInView={{ width: `${actPerc}%` }}
                     viewport={{ once: true }}
                     transition={{ duration: 1.2, type: "spring", delay: 0.2 }}
                     className={cn(
                       "absolute top-0 left-0 h-full z-0 opacity-80",
                       isCritical ? "bg-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-white/20"
                     )}
                   />
                </div>
             </div>
           );
        })}
      </div>

      {/* DETAIL TABLES */}
      <div className="flex-1 overflow-x-auto no-scrollbar border-t border-border mt-4">
         <table className="w-full text-left border-collapse text-xs">
            <thead>
               <tr className="bg-background/50 border-b border-border">
                  <th className="p-3 font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Phase</th>
                  <th className="p-3 font-bold text-muted-foreground uppercase tracking-widest text-center">Volume</th>
                  <th className="p-3 font-bold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Oldest Waiting</th>
               </tr>
            </thead>
            <tbody>
               {bottlenecks?.map((item, i) => (
                 <tr key={i} className="border-b border-border hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-foreground line-clamp-1">{item.step}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]">{item.service}</p>
                    </td>
                    <td className="p-3 text-center">
                       <span className={cn(
                         "inline-flex items-center justify-center px-2 py-0.5 rounded font-mono font-bold",
                         item.count > 10 ? "bg-red-500/20 text-red-500" : "bg-white/5 text-foreground"
                       )}>
                         {item.count}
                       </span>
                    </td>
                    <td className="p-3 text-right">
                       <p className={cn("font-mono font-bold", item.oldestDays > 5 ? "text-red-400" : "text-muted-foreground/60")}>
                         {item.oldestDays} d
                       </p>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

    </div>
  );
};

export default BottleneckAnalytics;
