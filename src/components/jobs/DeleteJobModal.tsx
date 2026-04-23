import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobCode: string;
  isDeleting: boolean;
}

const DeleteJobModal: React.FC<DeleteJobModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  jobCode,
  isDeleting 
}) => {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText === jobCode) {
      onConfirm();
    }
  };

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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-card border border-red-500/30 rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Visual Danger Indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
              <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-syne font-bold text-foreground">Extreme Danger Zone</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are about to permanently delete project <span className="text-red-400 font-mono font-bold tracking-wider">{jobCode}</span>. 
                This action is IRREVERSIBLE and will wipe all progress, documents, and messages.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 border border-border rounded-xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Confirmation Mandatory</p>
                <p className="text-xs text-muted-foreground mb-4 font-medium italic">Type the Job ID exactly as shown above:</p>
                <input 
                  type="text" 
                  autoFocus
                  placeholder={jobCode}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-background border border-border focus:border-red-500/50 outline-none rounded-xl px-4 py-3 text-sm font-mono font-bold text-red-500 transition-all placeholder:text-muted-foreground/30"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-muted/50 text-foreground font-bold rounded-2xl hover:bg-muted transition-all"
                >
                  Recall
                </button>
                <button 
                  disabled={confirmText !== jobCode || isDeleting}
                  onClick={handleConfirm}
                  className="flex-2 px-8 py-3 bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95"
                >
                  {isDeleting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Terminate Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteJobModal;
