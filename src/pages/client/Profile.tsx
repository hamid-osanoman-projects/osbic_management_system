import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Lock, Bell,
  Globe, ChevronRight, Camera, X, Eye,
  EyeOff, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ClientProfile = () => {
  const { profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    nationality: 'Omani'
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    new: '',
    confirm: ''
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    if (passwordData.new || passwordData.confirm) {
      setPasswordsMatch(passwordData.new === passwordData.confirm);
    } else {
      setPasswordsMatch(true);
    }
  }, [passwordData.new, passwordData.confirm]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      if (refreshProfile) await refreshProfile();
      toast.success('Identity profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate
    if (file.size > 2 * 1024 * 1024) return toast.error('Photo must be under 2MB');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('Only JPG, PNG or WebP allowed');

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `user-avatars/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile
      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      if (refreshProfile) await refreshProfile();
      toast.success('Identity photo updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) return toast.error('Passwords do not match');
    if (passwordData.new.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;

      toast.success('Account security updated successfully');
      setShowPasswordModal(false);
      setPasswordData({ new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update security');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto pb-20">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 sm:gap-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-[2.5rem] bg-primary/5 border-2 border-primary/20 flex items-center justify-center text-primary text-4xl sm:text-3xl font-bold font-syne overflow-hidden shadow-2xl">
              {uploadingAvatar ? (
                <Loader2 className="animate-spin" size={32} />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.[0] || 'C'
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 p-3 bg-foreground border border-border rounded-2xl text-background hover:scale-110 active:scale-95 transition-all shadow-xl cursor-pointer">
              <Camera size={18} />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-syne font-black text-foreground mb-2 tracking-tight">{profile?.full_name}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                {profile?.client_code || 'CLT-GUEST'}
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 border border-border rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Verified Identity</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={cn(
            "w-full sm:w-auto px-10 py-5 sm:px-6 sm:py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl",
            isEditing
              ? "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
              : "bg-foreground border border-border text-background hover:bg-foreground/90"
          )}
        >
          {isEditing ? 'Discard Changes' : 'Update Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Security & Preferences */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-xl shadow-black/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Shield size={64} className="text-foreground" />
            </div>
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={14} className="text-primary" /> Identity Security
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Security Key', icon: Lock, val: '••••••••••••', onClick: () => setShowPasswordModal(true) },
                { label: 'Verified Identity', icon: User, val: 'SLA-LEVEL 1', accent: true },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={item.onClick}
                  className={cn(
                    "transition-all p-4 rounded-2xl border transition-all group cursor-pointer",
                    item.onClick
                      ? "bg-muted/30 border-border hover:border-primary/30 hover:bg-primary/5"
                      : "bg-transparent border-transparent cursor-default"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-muted-foreground/60 flex items-center gap-2 group-hover:text-primary transition-colors">
                      <item.icon size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                    </div>
                    {item.onClick && <ChevronRight size={14} className="text-muted-foreground/40 group-hover:translate-x-1 transition-all" />}
                  </div>
                  <p className={cn("text-sm font-bold", item.accent ? 'text-primary' : 'text-foreground')}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-6 shadow-xl shadow-black/5">
            <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Bell size={14} className="text-primary" /> Automation Alerts
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 group hover:bg-emerald-500/10 transition-colors">
                <span className="text-[10px] font-bold text-emerald-500 transition-all uppercase tracking-widest leading-none">WhatsApp Pulse</span>
                <div className="w-10 h-5 bg-emerald-500 border border-emerald-600 rounded-full relative cursor-pointer shadow-sm">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border group hover:bg-muted/50 transition-colors opacity-60">
                <span className="text-[10px] font-bold text-muted-foreground transition-all uppercase tracking-widest leading-none underline decoration-dotted decoration-border">Email Audit Logs</span>
                <div className="w-10 h-5 bg-muted rounded-full relative cursor-not-allowed">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-muted-foreground/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Personal Information */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 relative overflow-hidden h-full">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">Operational Identity Hub</h3>
              <Globe size={18} className="text-muted-foreground/30" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px] mb-2 px-1 flex items-center gap-2">
                    <User size={12} className="text-primary" /> Registered Name
                  </label>
                  <input
                    disabled={!isEditing}
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm font-semibold text-foreground outline-none focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all disabled:text-muted-foreground/30 disabled:cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px] mb-2 px-1 flex items-center gap-2">
                    <Mail size={12} className="text-primary" /> Verified System Email
                  </label>
                  <input
                    disabled
                    type="email"
                    defaultValue={profile?.email || ''}
                    className="bg-muted/10 border border-border/50 rounded-2xl p-4 text-sm font-medium text-muted-foreground/40 outline-none cursor-not-allowed w-full shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px] mb-2 px-1 flex items-center gap-2">
                    <Phone size={12} className="text-primary" /> Primary WhatsApp
                  </label>
                  <input
                    disabled={!isEditing}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm font-semibold text-foreground outline-none focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all disabled:text-muted-foreground/30 disabled:cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px] mb-2 px-1 flex items-center gap-2">
                    <Globe size={12} className="text-primary" /> Legal Nationality
                  </label>
                  <input
                    disabled={!isEditing}
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm font-semibold text-foreground outline-none focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all disabled:text-muted-foreground/30 disabled:cursor-not-allowed shadow-inner"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-slate-100 border-t mt-12 pt-8 flex justify-end"
              >
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="px-8 py-4 bg-primary text-white font-extrabold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 text-[10px] uppercase tracking-widest flex items-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Synchronize Changes
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-background/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                <Lock size={120} className="text-foreground" />
              </div>

              <div className="relative space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h3 className="text-xl font-syne font-bold text-foreground">Security Sync</h3>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Update Identity Authentication</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPasswordModal(false)} className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">New Secure Key</label>
                      <div className="relative group">
                        <input
                          type={showNew ? "text" : "password"}
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                          className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 text-foreground outline-none focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all font-mono text-sm shadow-inner"
                          placeholder="••••••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest ml-1">Repeat Secure Key</label>
                      <div className="relative group">
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                          className={cn(
                            "w-full bg-muted/30 border rounded-2xl px-5 py-4 text-foreground outline-none transition-all font-mono text-sm shadow-inner",
                            !passwordsMatch ? "border-rose-500/50 ring-rose-500/10" : "border-border focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/5"
                          )}
                          placeholder="••••••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {!passwordsMatch && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                        <AlertCircle size={14} /> Identity keys do not match
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading || !passwordsMatch || !passwordData.new}
                    className="w-full bg-foreground text-background font-bold p-4 rounded-2xl shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 disabled:scale-100 font-syne"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                      <><Shield size={18} /> Authorize Key Seal</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientProfile;
