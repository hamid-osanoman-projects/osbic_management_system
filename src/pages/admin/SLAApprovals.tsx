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
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-syne font-bold text-foreground mb-1.5">Operational Control Room</h1>
        <p className="text-sm text-muted-foreground">Manage service lifecycle requests and team escalations</p>
      </header>

      {/* ── Tabs ── */}
      <div className="flex bg-card/50 border border-border p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveType('deadline_extension')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeType === 'deadline_extension' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          SLA Extensions
          {(requests || []).filter(r => r.type === 'deadline_extension' && r.status === 'pending').length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveType('job_deletion')}
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
            activeType === 'job_deletion' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Project Terminations
          {(requests || []).filter(r => r.type === 'job_deletion' && r.status === 'pending').length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>

      {/* ── Pending Requests ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-widest bg-muted/50 py-1.5 px-3 rounded-lg border border-border w-fit">
          <Clock size={14} className="text-primary" />
          Pending Actions ({pendingRequests.length})
        </div>

        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-xl p-5 shadow-xl relative overflow-hidden group hover:border-gold/30 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <AlertCircle size={60} className="text-primary" />
                </div>

                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-bold uppercase rounded border",
                          req.type === 'job_deletion' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-primary/10 text-primary border-gold/20"
                        )}>
                          {req.type === 'job_deletion' ? 'Deletion Request' : 'SLA Extension'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono">#{req.job?.job_code || 'N/A'}</span>
                      </div>
                      <h3 className="text-base font-bold text-foreground line-clamp-2 pr-12">{req.description || 'No description provided'}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-widest">Requested</p>
                      <p className="text-[10px] text-foreground uppercase">{new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-2 bg-muted/50 rounded-lg border border-border">
                      <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><User size={10} /> Staff Member</p>
                      <p className="text-xs font-medium text-foreground">{req.employee?.full_name}</p>
                    </div>
                    {req.type === 'job_deletion' ? (
                      <div className="p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                        <p className="text-[9px] text-red-400 uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><AlertCircle size={10} /> Severity</p>
                        <p className="text-xs font-bold text-red-500">Permanent Removal</p>
                      </div>
                    ) : (
                      <div className="p-2 bg-primary/5 rounded-lg border border-gold/10">
                        <p className="text-[9px] text-primary uppercase font-bold tracking-widest mb-1 flex items-center gap-1.5"><Calendar size={10} /> Proposed Deadline</p>
                        <p className="text-xs font-mono font-bold text-foreground">{new Date(req.metadata?.proposed_deadline).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => handleAction(req, 'rejected')}
                      disabled={isPending}
                      className="flex-1 py-2 px-3 rounded-lg border border-border text-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(req, 'approved')}
                      disabled={isPending}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95",
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
          <div className="text-center py-8 bg-card border border-dashed border-border rounded-xl">
            <CheckCircle2 size={32} className="mx-auto text-muted-foreground/60 mb-3" />
            <p className="text-muted-foreground/60 text-sm font-medium">All clear! No pending SLA extensions.</p>
          </div>
        )}
      </section>

      {/* ── Approval History ────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-6 border-t border-border">
        <h2 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest px-2">Request History</h2>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                  <td className="py-3 px-4 text-right text-[10px] text-muted-foreground/60">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyRequests.length === 0 && (
            <div className="py-6 text-center text-muted-foreground/60 text-xs italic">No history available</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SLAApprovals;
