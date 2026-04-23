import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldAlert, Loader2, Send } from 'lucide-react';
import { useDeletionRequests } from '../../hooks/shared/useDeletionRequests';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: { id: string; full_name: string } | null;
}

const DeletionRequestModal = ({ isOpen, onClose, client }: Props) => {
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const { useCreateRequest } = useDeletionRequests();
  const createRequestMutation = useCreateRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !reason.trim() || !profile) return;

    try {
      await createRequestMutation.mutateAsync({
        clientId: client.id,
        clientName: client.full_name,
        employeeId: profile.id,
        reason: reason.trim(),
      });
      onClose();
      setReason('');
    } catch (error) {
      // Error handled by mutation
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
          className="relative w-full max-w-md bg-[#0F1629] border border-red-500/20 rounded-[32px] overflow-hidden shadow-2xl shadow-red-500/10"
        >
          {/* Header Accent */}
          <div className="h-2 bg-gradient-to-r from-red-500/50 via-red-500 to-red-500/50" />

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Protected Deletion</h3>
                  <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Removal Request System</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-[#475569] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl mb-6">
               <div className="flex gap-3">
                 <AlertTriangle size={18} className="text-red-400 shrink-0" />
                 <div className="text-xs text-red-400/80 leading-relaxed">
                   You are requesting to remove <span className="font-bold text-white uppercase">{client.full_name}</span>. This action is **not immediate** and requires Admin approval.
                 </div>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-[#475569] uppercase tracking-widest ml-1 mb-2 block">
                    Why do you want to delete this client?
                 </label>
                 <textarea
                   value={reason}
                   onChange={(e) => setReason(e.target.value)}
                   autoFocus
                   placeholder="e.g. Duplicate entry, Client requested data withdrawal..."
                   className="w-full bg-[#0A0F1E] border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-red-500/50 outline-none transition-all h-32 resize-none placeholder:text-[#475569]"
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
                   className="flex-[2] py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-red-600/20"
                 >
                   {createRequestMutation.isPending ? (
                     <Loader2 className="animate-spin" size={18} />
                   ) : (
                     <>
                        Submit Request <Send size={14} />
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

export default DeletionRequestModal;
