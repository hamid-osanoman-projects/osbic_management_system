import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfirmStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
  isActivating: boolean;
  isPending: boolean;
}

const ConfirmStatusModal: React.FC<ConfirmStatusModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  employeeName,
  isActivating,
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
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isActivating ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  {isActivating ? <UserCheck size={20} /> : <AlertTriangle size={20} />}
                </div>
                <h3 className="text-xl font-syne font-bold text-foreground">
                  {isActivating ? 'Activate Account' : 'Deactivate Account'}
                </h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isActivating 
                  ? `Are you sure you want to reactivate the account for ${employeeName}? They will regain access to the platform immediately.`
                  : `Are you sure you want to deactivate the account for ${employeeName}? This will prevent them from logging in and accessing any system resources.`
                }
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
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
                  isActivating 
                    ? "bg-emerald-500 text-[#0A0F1E] hover:bg-emerald-400 shadow-emerald-500/20" 
                    : "bg-red-500 text-foreground hover:bg-red-400 shadow-red-500/20"
                )}
                disabled={isPending}
              >
                {isPending ? 'Processing...' : (isActivating ? 'Activate' : 'Deactivate')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmStatusModal;
