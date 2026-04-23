import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Search, Filter, Calendar, 
  User, Activity, Database, ChevronDown, 
  ExternalLink, Eye, RotateCcw, Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAdminAudit, type AuditLog } from '../../hooks/admin/useAdminAudit';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AuditRow = ({ audit }: { audit: AuditLog }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "border-b border-border transition-all cursor-pointer group",
          isExpanded ? "bg-muted/50" : "hover:bg-white/[0.02]"
        )}
      >
        <td className="p-4">
           <div className="flex flex-col">
             <span className="text-sm font-bold text-foreground">{new Date(audit.created_at).toLocaleTimeString()}</span>
             <span className="text-[10px] text-muted-foreground/60">{new Date(audit.created_at).toLocaleDateString()}</span>
           </div>
        </td>
        <td className="p-4">
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
                <User size={12} />
             </div>
             <span className="text-sm text-muted-foreground font-medium">
               {audit.profiles?.full_name || 'System (AI)'}
             </span>
           </div>
        </td>
        <td className="p-4">
           <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
              {audit.action.replace(/_/g, ' ')}
           </span>
        </td>
        <td className="p-4">
           <div className="flex items-center gap-1.5 text-foreground text-sm font-bold">
              <Database size={14} className="text-muted-foreground/60" /> {audit.entity_type}: {audit.entity_id?.slice(0, 8)}
           </div>
        </td>
        <td className="p-4 text-right">
           <ChevronDown size={14} className={cn("text-muted-foreground/60 transition-transform inline-block", isExpanded && "rotate-180")} />
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={5} className="p-0">
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden bg-background border-b border-border"
               >
                 <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                          <Activity size={14} /> Action Summary
                       </p>
                       <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/50 px-4 py-3 rounded-xl border border-border">
                         Event triggered by {audit.profiles?.full_name || 'system automation'} affecting {audit.entity_type}.
                       </p>
                       <div className="flex gap-3 pt-2">
                          <button className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-white/10 text-foreground rounded-lg text-xs font-bold transition-all border border-border">
                             <ExternalLink size={12} /> View Record
                          </button>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                          <Eye size={14} /> Payload Inspection
                       </p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <p className="text-[10px] text-red-400/60 uppercase font-bold tracking-tighter">Stale Values</p>
                             <pre className="text-[11px] p-4 bg-red-500/5 text-red-400/80 rounded-xl border border-red-500/10 overflow-auto max-h-48 custom-scrollbar">
                                {JSON.stringify(audit.old_values || {}, null, 2)}
                             </pre>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[10px] text-emerald-400/60 uppercase font-bold tracking-tighter">Current Values</p>
                             <pre className="text-[11px] p-4 bg-emerald-500/5 text-emerald-400/80 rounded-xl border border-emerald-500/10 overflow-auto max-h-48 custom-scrollbar">
                                {JSON.stringify(audit.new_values || {}, null, 2)}
                             </pre>
                          </div>
                       </div>
                    </div>
                 </div>
               </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
};

const Audit = () => {
  const { data: audits, isLoading } = useAdminAudit();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!audits) return [];
    if (!searchQuery) return audits;
    const q = searchQuery.toLowerCase();
    return audits.filter(a => 
      a.action.toLowerCase().includes(q) || 
      a.entity_type?.toLowerCase().includes(q) ||
      a.entity_id?.toLowerCase().includes(q) ||
      a.profiles?.full_name?.toLowerCase().includes(q)
    );
  }, [audits, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">Opening Audit Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground mb-1 flex items-center gap-3">
             <ShieldCheck className="text-primary" size={32} />
             System Audit Vault
          </h1>
          <p className="text-muted-foreground font-medium">Immutable chronological record of every administrative trajectory.</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-white/10 text-foreground rounded-xl text-sm font-bold border border-border transition-colors">
              <Calendar size={16} /> Filter by Date
           </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
            <input 
              type="text" 
              placeholder="Search actors, entity IDs, or specific actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm text-foreground focus:border-gold outline-none transition-all focus:ring-4 focus:ring-gold/5"
            />
         </div>
      </div>

      {/* Audit Feed */}
      <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-background border-b border-border">
                    <th className="p-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Temporal Log</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Administrative Actor</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Mutation Event</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Target Entity</th>
                    <th className="p-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest text-right whitespace-nowrap">Inspection</th>
                 </tr>
              </thead>
              <tbody>
                 {filtered.map(audit => (
                   <AuditRow key={audit.id} audit={audit} />
                 ))}
              </tbody>
           </table>
         </div>

         {filtered.length === 0 && (
           <div className="p-24 text-center">
              <ShieldCheck size={48} className="mx-auto mb-4 text-muted-foreground/60 opacity-20" />
              <p className="text-foreground font-bold">The Vault is Silent</p>
              <p className="text-sm text-muted-foreground">No audit logs matched your search filters.</p>
           </div>
         )}
      </div>

    </div>
  );
};

export default Audit;
