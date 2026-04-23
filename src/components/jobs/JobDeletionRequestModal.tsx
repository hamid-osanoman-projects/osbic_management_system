import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send } from 'lucide-react';

interface JobDeletionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  jobCode: string;
  isSubmitting: boolean;
}

const JobDeletionRequestModal: React.FC<JobDeletionRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  jobCode,
  isSubmitting 
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length >= 10) {
      onConfirm(reason.trim());
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
            className="relative w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare size={24} />
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-xl font-syne font-bold text-foreground">Request Project Deletion</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are requesting the removal of <span className="text-primary font-bold">{jobCode}</span>. 
                Please provide a clear justification for the administrator's review.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Justification Required</p>
                  <textarea 
                    autoFocus
                    placeholder="E.g., Client cancelled service, duplicate entry, or incorrect parameters..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-32 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/30 resize-none font-medium"
                  />
                  <p className={cn(
                    "text-[9px] text-right mt-2 font-bold uppercase tracking-widest",
                    reason.trim().length >= 10 ? "text-emerald-500" : "text-muted-foreground/40"
                  )}>
                    {reason.trim().length}/10 chars min
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 bg-muted/50 text-foreground font-bold rounded-2xl hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={reason.trim().length < 10 || isSubmitting}
                  className="flex-2 px-8 py-4 bg-primary text-[#0A0F1E] font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-[#0A0F1E]/30 border-t-[#0A0F1E] rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper for classes (simplified for this component)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default JobDeletionRequestModal;
