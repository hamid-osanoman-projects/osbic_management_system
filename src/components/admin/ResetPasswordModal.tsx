import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, AlertCircle } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
  isPending: boolean;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ 
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
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-[80] overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Key size={20} />
                </div>
                <h3 className="text-xl font-syne font-bold text-foreground">Reset Password</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl flex gap-3 text-red-200 text-sm">
                <AlertCircle size={20} className="shrink-0 text-red-400" />
                <p>This will send a secure password reset link to <strong>{employeeName}'s</strong> email address. They will need to follow the link to set a new password.</p>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                Are you sure you want to proceed with resetting the password for this account? Access will not be interrupted until they change it.
              </p>
            </div>

            <div className="p-6 bg-black/20 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border border-border text-foreground font-bold hover:bg-white/5 transition-all"
                disabled={isPending}
              >Cancel</button>
              <button
                onClick={onConfirm}
                className="flex-1 px-6 py-3 rounded-xl bg-primary text-[#0A0F1E] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-gold/20"
                disabled={isPending}
              >
                {isPending ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResetPasswordModal;
