import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Shield, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCircle,
  Mail,
  Smartphone,
  Fingerprint
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Profile Card */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
        <div className="relative bg-card/50 backdrop-blur-xl border border-border rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2rem] bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-4xl shadow-[0_0_50px_rgba(var(--primary),0.2)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover rounded-[2rem]" alt="Profile" />
              ) : (
                profile?.full_name?.[0].toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-card flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-2 flex-1">
            <h1 className="text-4xl font-syne font-extrabold text-foreground tracking-tight">{profile?.full_name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                {profile?.role || 'Staff Member'}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold font-mono">
                {profile?.employee_code || '#USER-001'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Account Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card/30 backdrop-blur-md border border-border rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <UserCircle size={20} />
              </div>
              <h3 className="font-syne font-bold text-lg">Account Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Mail size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Email Address</p>
                  <p className="text-sm font-medium">{profile?.email || 'Not verified'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Smartphone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Phone Number</p>
                  <p className="text-sm font-medium">{profile?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <Fingerprint size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">System Identity</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{profile?.id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2 text-emerald-400">
              <Shield size={20} />
              <p className="font-bold text-sm tracking-wide">Security Status</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your account is protected by industry-standard encryption. Change your password regularly to maintain security.
            </p>
          </div>
        </div>

        {/* Password Management */}
        <div className="md:col-span-3">
          <div className="bg-card/30 backdrop-blur-md border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Key size={120} />
            </div>
            
            <div className="relative space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-syne font-extrabold text-foreground">Change Password</h3>
                  <p className="text-sm text-muted-foreground">Update your security credentials</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative group">
                      <input
                        type={showNew ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className={`w-full bg-background border rounded-2xl px-5 py-4 text-foreground outline-none transition-all group-focus-within:ring-2 ${passwordData.newPassword && passwordData.newPassword.length < 6 ? 'border-destructive/50' : 'border-border focus:border-primary ring-primary/10'}`}
                        placeholder="Min 6 characters..."
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Confirm New Password</label>
                    <div className="relative group">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={`w-full bg-background border rounded-2xl px-5 py-4 text-foreground outline-none transition-all group-focus-within:ring-2 ${!passwordsMatch ? 'border-destructive/50 ring-destructive/10' : 'border-border focus:border-primary ring-primary/10'}`}
                        placeholder="Repeat new password"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {!passwordsMatch && (
                      <div className="flex items-center gap-2 text-destructive text-xs mt-2 ml-1">
                        <AlertCircle size={14} />
                        Passwords do not match
                      </div>
                    )}
                    
                    {passwordsMatch && passwordData.newPassword && passwordData.confirmPassword && (
                      <div className="flex items-center gap-2 text-emerald-500 text-xs mt-2 ml-1">
                        <CheckCircle2 size={14} />
                        Passwords match perfectly
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading || !passwordsMatch || !passwordData.newPassword}
                    className="w-full bg-primary text-[#0A0F1E] font-bold p-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <Shield size={18} />
                        Update Identity Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
