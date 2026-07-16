import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const ResetPasswordModal = ({ isOpen, onClose, userId, userName }: Props) => {
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_password', {
        target_user_id: userId,
        new_password: newPassword
      });

      if (error) throw error;
      
      toast.success(`Password for ${userName} has been successfully reset!`);
      setNewPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => !isSubmitting && onClose()}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden relative z-10 shadow-2xl"
        >
          <div className="p-6 border-b border-border flex justify-between items-center bg-red-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-foreground font-syne">Force Reset Password</h3>
                <p className="text-xs text-muted-foreground">Admin Override</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleReset} className="p-6 space-y-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-500/80 leading-relaxed">
                You are forcefully overriding the password for <strong className="text-red-500 font-bold">{userName}</strong>. They will be logged out of active sessions.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:outline-none transition-colors"
                  required
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground uppercase font-bold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !newPassword}
              className="w-full py-3 bg-red-500 text-[#0A0F1E] rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <span className="w-4 h-4 border-2 border-[#0A0F1E]/30 border-t-[#0A0F1E] rounded-full animate-spin" /> : <Check size={16} />}
              Confirm Password Reset
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ResetPasswordModal;
