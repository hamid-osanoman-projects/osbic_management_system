import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Top Indicator Line */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent to-transparent",
              isDestructive ? "via-red-500" : "via-amber-500"
            )} />

            <div className="flex items-center justify-between mb-5">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                isDestructive ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {isDestructive ? <AlertCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-syne font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-muted/50 text-foreground text-sm font-bold rounded-xl hover:bg-muted transition-all"
              >
                {cancelText}
              </button>
              <button 
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50",
                  isDestructive 
                    ? "bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                    : "bg-amber-500 hover:bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                )}
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isDestructive ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    {confirmText}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
