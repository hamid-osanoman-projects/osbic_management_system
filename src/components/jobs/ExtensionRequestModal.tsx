import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { useRequestExtension } from '../../hooks/shared/useJobs';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  stepId: string;
  currentDeadline: string | null;
}

const ExtensionRequestModal = ({ isOpen, onClose, jobId, stepId, currentDeadline }: Props) => {
  const [newDeadline, setNewDeadline] = useState('');
  const [reason, setReason] = useState('');
  const { mutate: requestExtension, isPending } = useRequestExtension();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadline || !reason) {
      toast.error('Please provide both a new date and a reason');
      return;
    }

    requestExtension({
      jobId,
      stepId,
      newDeadline: new Date(newDeadline).toISOString(),
      reason
    }, {
      onSuccess: () => {
        toast.success('Extension request submitted for Admin review');
        onClose();
        setNewDeadline('');
        setReason('');
      },
      onError: (err) => {
        toast.error('Failed to submit request: ' + (err as any).message);
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-gold/10"
          >
            <div className="p-6 border-b border-border flex justify-between items-center bg-primary/5">
              <div>
                <h3 className="text-xl font-syne font-bold text-foreground">Request SLA Extension</h3>
                <p className="text-xs text-muted-foreground mt-1">Current Deadline: {currentDeadline ? new Date(currentDeadline).toLocaleString() : 'Not set'}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-muted-foreground/60 hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Extensions require Admin approval. Please provide an honest reason for the delay to ensure your performance metrics are adjusted fairly.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    <Calendar size={14} className="text-primary" /> Proposed New Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-gold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    <MessageSquare size={14} className="text-primary" /> Justification / Reason
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe why the extension is necessary (e.g., Client missing documents, Ministry system outage...)"
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-gold outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-border rounded-xl text-foreground font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-[2] px-6 py-3 bg-primary text-[#0A0F1E] rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExtensionRequestModal;
