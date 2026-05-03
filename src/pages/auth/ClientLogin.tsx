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
  const { logo } = useAdminSettings();



  const handleLogin = async (e: React.FormEvent) => {
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
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 font-syne ml-1">
                Password
              </label>
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
