import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Check, 
  Trash2, Archive, 
  ArrowRight, AlertCircle,
  Loader2, User
} from 'lucide-react';
import { useClientRequests } from '../../hooks/shared/useClientRequests';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const ApprovalHub = () => {
  const { profile } = useAuth();
  const { useRequestsList, useResolveRequest } = useClientRequests();
  const { data: requests, isLoading } = useRequestsList();
  const resolveMutation = useResolveRequest();

  const handleAction = async (requestId: string, clientId: string, action: 'approve' | 'reject', type: 'DELETE' | 'ARCHIVE') => {
    if (!profile) return;
    try {
      await resolveMutation.mutateAsync({
        requestId,
        clientId,
        action,
        type,
        adminId: profile.id
      });
    } catch (error) {
       // Handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-[32px] p-8 h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">Scanning Requests...</p>
      </div>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];

  return (
    <div className="bg-card border border-border rounded-[32px] p-8 shadow-2xl h-full flex flex-col">
       <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-xl font-syne font-bold text-foreground flex items-center gap-2">
              <ShieldAlert size={20} className="text-primary" /> Request Center
            </h4>
            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Sensitive Operations Queue</p>
          </div>
          <div className="px-3 py-1 bg-primary/10 border border-gold/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest">
            {pendingRequests.length} Pending
          </div>
       </div>

       <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-2 min-h-[300px]">
          <AnimatePresence mode="popLayout">
            {pendingRequests.map((request, idx) => {
              const isDelete = request.type === 'DELETE';
              return (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative bg-background border border-border hover:border-border rounded-[24px] p-5 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        isDelete 
                          ? "bg-red-500/10 text-red-500 border-red-500/20" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {isDelete ? <Trash2 size={18} /> : <Archive size={18} />}
                      </div>
                      <div>
                         <p className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 ${
                           isDelete ? "text-red-500/80" : "text-amber-500/80"
                         }`}>
                           {isDelete ? 'Client Removal' : 'Client Deactivation'}
                         </p>
                         <h5 className="text-sm font-bold text-foreground uppercase">{request.client_name}</h5>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-none mb-1">Requested By</p>
                       <p className="text-xs font-bold text-foreground">{request.requested_by_name}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-border rounded-xl p-3 mb-6">
                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <AlertCircle size={10} /> Justification
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{request.reason}"</p>
                  </div>

                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => handleAction(request.id, request.client_id, 'approve', request.type)}
                       disabled={resolveMutation.isPending}
                       className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30 ${
                         isDelete 
                           ? "bg-red-600 hover:bg-red-500 text-foreground shadow-red-600/10" 
                           : "bg-amber-600 hover:bg-amber-500 text-foreground shadow-amber-600/10"
                       }`}
                     >
                       Approve {isDelete ? 'Delete' : 'Archive'}
                     </button>
                     <button 
                       onClick={() => handleAction(request.id, request.client_id, 'reject', request.type)}
                       disabled={resolveMutation.isPending}
                       className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-muted-foreground/60 hover:text-foreground text-[10px] font-bold uppercase tracking-widest rounded-xl border border-border transition-all active:scale-95 disabled:opacity-30"
                     >
                       Reject
                     </button>
                  </div>
                  
                  <Link 
                    to={`/admin/clients/${request.client_id}`} 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/5 text-muted-foreground/60 hover:text-foreground transition-all"
                  >
                    <User size={14} />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {pendingRequests.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
               <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#475569] flex items-center justify-center mb-4">
                 <Check size={28} className="text-muted-foreground/60" />
               </div>
               <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Queue Clear</p>
            </div>
          )}
       </div>

       <button className="mt-8 w-full py-4 bg-background border border-border rounded-2xl text-[10px] font-bold text-muted-foreground/60 hover:text-foreground uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:border-gold/30 group">
          View Resolution History <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
       </button>
    </div>
  );
};

export default ApprovalHub;
