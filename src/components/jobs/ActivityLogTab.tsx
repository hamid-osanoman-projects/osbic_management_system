import { type JobAuditLog } from '../../hooks/shared/useJobs';


interface Props {
  logs: JobAuditLog[];
}

const ActivityLogTab = ({ logs }: Props) => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1">System Audit Trail</h3>
        <p className="text-xs text-muted-foreground mb-8">Unalterable chronological record of job mutations</p>
      </div>

      <div className="relative border-l border-border ml-3 space-y-8">
         {logs.map((log) => (
           <div key={log.id} className="relative pl-6">
              {/* Node */}
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-white/20 border-2 border-[#0A0F1E] z-10" />
              
              <div className="bg-card border border-border rounded-xl p-4 hover:border-border transition-colors">
                 <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold text-foreground">{log.action}</p>
                    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                 </div>
                 <p className="text-xs text-muted-foreground leading-relaxed mb-3">{log.details}</p>
                 <div className="inline-flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <UserIcon size={10} /> Actor: {log.actor_name}
                 </div>
              </div>
           </div>
         ))}
         {logs.length === 0 && (
           <div className="pl-6 py-6 text-muted-foreground/60">No audit logs found.</div>
         )}
      </div>
    </div>
  );
};

const UserIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export default ActivityLogTab;
