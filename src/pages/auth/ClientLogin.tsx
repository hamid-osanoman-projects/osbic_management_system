import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Smartphone, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ThemeToggle from '../../components/ThemeToggle';
import { useAdminSettings } from '../../hooks/admin/useAdminSettings';

const ClientLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');
  const [view, setView] = useState<'login' | 'forgot_email' | 'forgot_otp' | 'set_password'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { logo } = useAdminSettings();  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error, role } = await signIn(email, password);
      
      if (error) {
        toast.error(error || 'Authentication failed');
        return;
      }

      if (role !== 'client') {
        toast.error('This portal is reserved for clients only.');
        return;
      }

      toast.success('Identity verified. Entering portal...');
      navigate('/portal/dashboard', { replace: true });
    } catch (err: any) {
      toast.error('A secure connection could not be established.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Needs supabase imported. We'll use the import { supabase } from '../../lib/supabase';
    const { supabase } = await import('../../lib/supabase');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      setView('forgot_otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { supabase } = await import('../../lib/supabase');
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'recovery'
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setView('set_password');
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { supabase } = await import('../../lib/supabase');
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setView('login');
      setPassword('');
      toast.success('Password updated successfully. Please log in.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 sm:px-8 lg:px-12 relative overflow-hidden">
      {/* Delicate background illumination */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top right language toggle & theme toggle */}
      <div className="absolute top-6 right-6 md:top-8 md:right-12 z-10 flex items-center gap-4">
        <ThemeToggle />
        <button 
          onClick={() => setLang(lang === 'EN' ? 'AR' : 'EN')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-foreground text-xs font-bold font-syne hover:bg-muted transition-colors backdrop-blur-sm"
        >
          <Globe size={14} />
          {lang === 'EN' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-muted border border-border rounded-2xl mx-auto flex items-center justify-center font-syne text-2xl font-bold text-primary mb-6 shadow-xl shadow-primary/5 overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              "O"
            )}
          </div>
          <h2 className="text-3xl font-syne font-bold text-foreground tracking-tight mb-2">
            Client Login
          </h2>
          <p className="text-sm text-muted-foreground">
            {lang === 'EN' ? 'Please log in to access your services.' : 'يرجى تسجيل الدخول للوصول إلى خدماتك'}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[2.5rem] border border-border shadow-2xl"
        >
          {view === 'login' && (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-syne ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground/40 disabled:opacity-50 shadow-inner"
                    placeholder="client@osan.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 ml-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-syne">
                    Password
                  </label>
                  <button type="button" onClick={() => setView('forgot_email')} className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground/40 disabled:opacity-50 shadow-inner pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-[1.25rem] shadow-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none transition-all duration-200 uppercase tracking-widest active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <><Lock size={16} /> Log In</>
                )}
              </button>
            </form>
          )}

          {view === 'forgot_email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-syne font-bold text-foreground mb-2">Reset Password</h3>
                <p className="text-xs text-muted-foreground">Enter your email and we will send you an 8-digit verification code.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-syne ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-foreground focus:border-primary outline-none transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-[1.25rem] shadow-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-200 uppercase tracking-widest active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Verification Code'}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 font-bold uppercase tracking-wider">
                Back to Login
              </button>
            </form>
          )}

          {view === 'forgot_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-syne font-bold text-foreground mb-2">Enter Verification Code</h3>
                <p className="text-xs text-muted-foreground">We sent an 8-digit code to <span className="text-primary font-bold">{email}</span></p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-syne ml-1">8-Digit Code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-center tracking-[0.5em] font-mono text-xl focus:border-primary outline-none transition-all"
                  placeholder="------"
                  maxLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-[1.25rem] shadow-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-200 uppercase tracking-widest active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 font-bold uppercase tracking-wider">
                Back to Login
              </button>
            </form>
          )}

          {view === 'set_password' && (
            <form onSubmit={handleSetNewPassword} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-syne font-bold text-foreground mb-2">Set New Password</h3>
                <p className="text-xs text-muted-foreground">Code verified successfully. Please choose a new secure password.</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-syne ml-1">New Password</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-sm text-foreground focus:border-primary outline-none transition-all pr-12"
                    placeholder="Min 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground/60 hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-[1.25rem] shadow-xl text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-200 uppercase tracking-widest active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Update Password & Login'}
              </button>
            </form>
          )}

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-4 bg-card text-muted-foreground/60 uppercase font-extrabold tracking-[0.3em]">Secure Login</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientLogin;
