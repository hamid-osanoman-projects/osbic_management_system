import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
  isPending: boolean;
}

const DeleteEmployeeModal: React.FC<DeleteEmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  employeeName,
  isPending
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-md bg-background border border-red-500/20 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] z-[80] overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Trash2 size={20} />
                </div>
                <h3 className="text-xl font-syne font-bold text-foreground">Remove Employee</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-200 text-sm">
                <AlertTriangle size={20} className="shrink-0 text-red-500" />
                <p><strong>Warning:</strong> This action is permanent and cannot be undone. All personal data for <strong>{employeeName}</strong> will be removed from the system.</p>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                Are you absolutely sure you want to remove this employee? This may affect historical job records linked to their account.
              </p>
            </div>

            <div className="p-6 bg-black/20 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border border-border text-foreground font-bold hover:bg-white/5 transition-all text-sm"
                disabled={isPending}
              >Cancel</button>
              <button
                onClick={onConfirm}
                className="flex-[1.5] px-6 py-3 rounded-xl bg-red-500 text-foreground font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2"
                disabled={isPending}
              >
                {isPending ? 'Removing...' : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeleteEmployeeModal;
