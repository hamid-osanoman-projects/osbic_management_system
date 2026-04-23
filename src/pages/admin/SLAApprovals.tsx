import { useState } from 'react';
import { useOperationalRequests, useResolveOperationalRequest } from '../../hooks/shared/useJobs';
import { Clock, CheckCircle2, XCircle, AlertCircle, Calendar, User, Briefcase, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SLAApprovals = () => {
  const { data: requests, isLoading } = useOperationalRequests();
  const { mutate: resolveRequest, isPending } = useResolveOperationalRequest();
  const { profile } = useAuth();
  const [activeType, setActiveType] = useState<'deadline_extension' | 'job_deletion'>('deadline_extension');

  const handleAction = (request: any, action: 'approved' | 'rejected') => {
    resolveRequest({
      requestId: request.id,
      action,
      type: request.type,
      jobId: request.job_id,
      metadata: request.metadata
    }, {
      onSuccess: () => {
        toast.success(`Request ${action} successfully`);
      },
      onError: (error: any) => {
        toast.error(`Error resolving request: ${error.message}`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredRequests = requests?.filter(r => r.type === activeType) || [];
  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const historyRequests = filteredRequests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-syne font-bold text-foreground mb-2">Operational Control Room</h1>
        <p className="text-muted-foreground">Manage service lifecycle requests and team escalations</p>
      </header>

      {/* ── Tabs ── */}
      <div className="flex bg-card/50 border border-border p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveType('deadline_extension')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeType === 'deadline_extension' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          🕒 SLA Extensions
          {requests?.filter(r => r.type === 'deadline_extension' && r.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
        <button 
          onClick={() => setActiveType('job_deletion')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeType === 'job_deletion' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-muted-foreground hover:text-foreground"
          )}
        >
          ⚠️ Project Terminations
          {requests?.filter(r => r.type === 'job_deletion' && r.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>

      {/* ── Pending Requests ────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-widest bg-muted/50 py-2 px-4 rounded-lg border border-border w-fit">
          <Clock size={16} className="text-primary" />
          Pending Actions ({pendingRequests.length})
        </div>

        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-gold/30 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <AlertCircle size={80} className="text-primary" />
                </div>

                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase rounded border",
                          req.type === 'job_deletion' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-primary/10 text-primary border-gold/20"
                        )}>
                          {req.type === 'job_deletion' ? 'Deletion Request' : 'SLA Extension'}
                        </span>
                        <span className="text-xs text-muted-foreground/60 font-mono">#{req.job?.job_code || 'N/A'}</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground line-clamp-2 pr-12">{req.description || 'No description provided'}</h3>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Requested</p>
                       <p className="text-xs text-foreground uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="p-3 bg-muted/50 rounded-xl border border-border">
                        <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><User size={12} /> Staff Member</p>
                        <p className="text-sm font-medium text-foreground">{req.employee?.full_name}</p>
                     </div>
                     {req.type === 'job_deletion' ? (
                       <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><AlertCircle size={12} /> Severity</p>
                          <p className="text-sm font-bold text-red-500">Permanent Removal</p>
                       </div>
                     ) : (
                       <div className="p-3 bg-primary/5 rounded-xl border border-gold/10">
                          <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={12} /> Proposed Deadline</p>
                          <p className="text-sm font-mono font-bold text-foreground">{new Date(req.metadata?.proposed_deadline).toLocaleString()}</p>
                       </div>
                     )}
                  </div>

                  <div className="mt-auto flex gap-3 pt-4 border-t border-border">
                    <button 
                      onClick={() => handleAction(req, 'rejected')}
                      disabled={isPending}
                      className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                      Reject Request
                    </button>
                     <button 
                      onClick={() => handleAction(req, 'approved')}
                      disabled={isPending}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95",
                        req.type === 'job_deletion' 
                          ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/10" 
                          : "bg-primary text-[#0A0F1E] hover:bg-primary/90 shadow-gold/10"
                      )}
                    >
                      {req.type === 'job_deletion' ? 'Confirm Deletion' : 'Approve Extension'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
            <CheckCircle2 size={40} className="mx-auto text-muted-foreground/60 mb-4" />
            <p className="text-muted-foreground/60 font-medium">All clear! No pending SLA extensions.</p>
          </div>
        )}
      </section>

      {/* ── Approval History ────────────────────────────────────────────────── */}
      <section className="space-y-6 pt-8 border-t border-border">
        <h2 className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest px-4">Request History</h2>
        
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Job / Item</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Staff</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Reason</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Status</th>
                <th className="py-4 px-6 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historyRequests.map((req) => (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-foreground">{req.job?.job_code}</p>
                    <p className="text-[10px] text-muted-foreground/60 uppercase mt-1">{req.type.replace('_', ' ')}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                         {req.employee?.full_name?.[0]}
                       </span>
                       <span className="text-sm text-muted-foreground">{req.employee?.full_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">{req.description || req.metadata?.reason || '-'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border",
                      req.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-xs text-muted-foreground/60">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyRequests.length === 0 && (
            <div className="py-8 text-center text-muted-foreground/60 text-sm italic">No history available</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SLAApprovals;
