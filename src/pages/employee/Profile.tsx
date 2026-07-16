import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Key, CheckCircle2, AlertCircle, Eye, EyeOff,
  UserCircle, Mail, Smartphone, Fingerprint
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const EmployeeProfile = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    if (passwordData.newPassword && passwordData.confirmPassword) {
      setPasswordsMatch(passwordData.newPassword === passwordData.confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwordData.newPassword 
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 p-4 sm:p-8">
      {/* Header Profile Card (Minimalist) */}
      <div className="flex flex-col md:flex-row items-center gap-6 border-b border-border pb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover rounded-xl" alt="Profile" />
            ) : (
              profile?.full_name?.[0].toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-background flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-2xl font-syne font-bold text-foreground tracking-tight">{profile?.full_name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
              {profile?.role || 'Staff Member'}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-muted/50 border border-border text-muted-foreground text-[10px] font-bold font-mono">
              {profile?.employee_code || '#USER-001'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Account Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-transparent border border-border/50 rounded-xl p-5 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/30 pb-4">
              <UserCircle size={16} className="text-muted-foreground" />
              <h3 className="font-bold text-sm">Account Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={14} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Email Address</p>
                  <p className="text-xs font-medium text-foreground">{profile?.email || 'Not verified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Smartphone size={14} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Phone Number</p>
                  <p className="text-xs font-medium text-foreground">{profile?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Fingerprint size={14} className="text-muted-foreground mt-0.5" />
                <div className="w-full min-w-0">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">System ID</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate w-full">{profile?.id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2 text-emerald-500">
              <Shield size={14} />
              <p className="font-bold text-xs tracking-wide">Security Status</p>
            </div>
            <p className="text-[10px] text-emerald-500/80 leading-relaxed">
              Your account is protected by industry-standard encryption. Change your password regularly to maintain security.
            </p>
          </div>
        </div>

        {/* Password Management */}
        <div className="md:col-span-3">
          <div className="bg-transparent border border-border/50 rounded-xl p-6">
            
            <div className="flex items-center gap-3 border-b border-border/30 pb-4 mb-6">
               <Key size={16} className="text-muted-foreground" />
               <div>
                 <h3 className="text-sm font-bold text-foreground">Change Password</h3>
                 <p className="text-[10px] text-muted-foreground">Update your security credentials</p>
               </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Password</label>
                   <div className="relative group">
                     <input
                       type={showNew ? "text" : "password"}
                       value={passwordData.newPassword}
                       onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                       className={`w-full bg-muted/10 border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-all ${passwordData.newPassword && passwordData.newPassword.length < 6 ? 'border-destructive/50' : 'border-border focus:border-primary ring-primary/10'}`}
                       placeholder="Min 6 characters..."
                       required
                     />
                     <button 
                       type="button" 
                       onClick={() => setShowNew(!showNew)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                     >
                       {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                     </button>
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirm Password</label>
                   <div className="relative group">
                     <input
                       type={showConfirm ? "text" : "password"}
                       value={passwordData.confirmPassword}
                       onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                       className={`w-full bg-muted/10 border rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-all ${!passwordsMatch ? 'border-destructive/50 ring-destructive/10' : 'border-border focus:border-primary ring-primary/10'}`}
                       placeholder="Repeat new password"
                       required
                     />
                     <button 
                       type="button" 
                       onClick={() => setShowConfirm(!showConfirm)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                     >
                       {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                     </button>
                   </div>
                   
                   {!passwordsMatch && (
                     <div className="flex items-center gap-1.5 text-destructive text-[10px] mt-1.5 ml-1">
                       <AlertCircle size={12} />
                       Passwords do not match
                     </div>
                   )}
                   
                   {passwordsMatch && passwordData.newPassword && passwordData.confirmPassword && (
                     <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] mt-1.5 ml-1">
                       <CheckCircle2 size={12} />
                       Passwords match
                     </div>
                   )}
                 </div>
               </div>

               <div className="pt-2">
                 <button
                   type="submit"
                   disabled={loading || !passwordsMatch || !passwordData.newPassword}
                   className="w-full bg-primary text-[#0A0F1E] font-bold p-3 text-xs rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                   {loading ? (
                     <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                   ) : (
                     <>
                       <Shield size={14} />
                       Update Password
                     </>
                   )}
                 </button>
               </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
