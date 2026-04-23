import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldAlert, Loader2, Send, Archive, Trash2 } from 'lucide-react';
import { useClientRequests } from '../../hooks/shared/useClientRequests';
import { useAuth } from '../../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: { id: string; full_name: string } | null;
  mode: 'DELETE' | 'ARCHIVE';
}

const ClientActionRequestModal = ({ isOpen, onClose, client, mode }: Props) => {
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const { useCreateRequest } = useClientRequests();
  const createRequestMutation = useCreateRequest();

  const isDelete = mode === 'DELETE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !reason.trim() || !profile) return;

    try {
      await createRequestMutation.mutateAsync({
        clientId: client.id,
        clientName: client.full_name,
        employeeId: profile.id,
        reason: reason.trim(),
        type: mode
      });
      onClose();
      setReason('');
    } catch (error) {
      // Handled by mutation
    }
  };

  if (!isOpen || !client) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "relative w-full max-w-md bg-[#0F1629] border rounded-[32px] overflow-hidden shadow-2xl",
            isDelete ? "border-red-500/20 shadow-red-500/10" : "border-amber-500/20 shadow-amber-500/10"
          )}
        >
          {/* Header Accent */}
          <div className={cn(
            "h-2 bg-gradient-to-r",
            isDelete ? "from-red-500/50 via-red-500 to-red-500/50" : "from-amber-500/50 via-amber-500 to-amber-500/50"
          )} />

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl border",
                  isDelete ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {isDelete ? <ShieldAlert size={20} /> : <Archive size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isDelete ? 'Request Deletion' : 'Request Deactivation'}
                  </h3>
                  <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Administrative Approval Required</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-[#475569] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className={cn(
              "border p-4 rounded-2xl mb-6",
              isDelete ? "bg-red-500/5 border-red-500/10" : "bg-amber-500/5 border-amber-500/10"
            )}>
               <div className="flex gap-3">
                 <AlertTriangle size={18} className={cn("shrink-0", isDelete ? "text-red-400" : "text-amber-400")} />
                 <div className={cn("text-xs leading-relaxed", isDelete ? "text-red-400/80" : "text-amber-400/80")}>
                   You are requesting to {isDelete ? 'permanently remove' : 'deactivate'} <span className="font-bold text-white uppercase">{client.full_name}</span>. This will be sent to Admin for final review.
                 </div>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest ml-1 mb-2 block">
                    Please provide a justification:
                 </label>
                 <textarea
                   value={reason}
                   onChange={(e) => setReason(e.target.value)}
                   autoFocus
                   placeholder={isDelete ? "e.g. Duplicate entry, Data removal request..." : "e.g. Client moving abroad, Service no longer needed..."}
                   className={cn(
                     "w-full bg-[#0A0F1E] border border-white/10 rounded-2xl p-4 text-sm text-white outline-none transition-all h-32 resize-none placeholder:text-[#475569]",
                     isDelete ? "focus:border-red-500/50" : "focus:border-amber-500/50"
                   )}
                 />
               </div>

               <div className="pt-2 flex gap-3">
                 <button
                   type="button"
                   onClick={onClose}
                   className="flex-1 py-4 rounded-2xl text-xs font-bold text-[#475569] hover:text-white transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="submit"
                   disabled={!reason.trim() || createRequestMutation.isPending}
                   className={cn(
                     "flex-[2] py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-95 shadow-lg",
                     isDelete ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                   )}
                 >
                   {createRequestMutation.isPending ? (
                     <Loader2 className="animate-spin" size={18} />
                   ) : (
                     <>
                        Submit to Admin <Send size={14} />
                     </>
                   )}
                 </button>
               </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ClientActionRequestModal;
