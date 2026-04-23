import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Smartphone, Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ClientLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');

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
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col justify-center py-12 px-6 sm:px-8 lg:px-12 relative overflow-hidden">
      {/* Delicate background illumination */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top right language toggle */}
      <div className="absolute top-6 right-6 md:top-8 md:right-12 z-10">
        <button 
          onClick={() => setLang(lang === 'EN' ? 'AR' : 'EN')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-white text-xs font-bold font-syne hover:bg-white/5 transition-colors backdrop-blur-sm"
        >
          <Globe size={14} />
          {lang === 'EN' ? 'العربية' : 'English'}
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mx-auto flex items-center justify-center font-syne text-2xl font-bold text-gold mb-6 shadow-xl shadow-gold/5">
            O
          </div>
          <h2 className="text-3xl font-syne font-bold text-white tracking-tight mb-2">
            Secure Service Portal
          </h2>
          <p className="text-sm text-[#94A3B8]">
            {lang === 'EN' ? 'Authorized Client Access Only' : 'دخول العملاء المصرح لهم فقط'}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0F1629]/80 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-[2.5rem] border border-white/10 shadow-2xl"
        >
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-3 font-syne ml-1">
                Identity Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0A0F1E] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold outline-none transition-all placeholder:text-[#475569] disabled:opacity-50 shadow-inner"
                  placeholder="client@osan.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-3 font-syne ml-1">
                Identity Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0F1E] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-gold outline-none transition-all placeholder:text-[#475569] disabled:opacity-50 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 mb-2 px-1">
               <div className="flex items-center">
                 <input id="remember-me" type="checkbox" className="h-4 w-4 bg-[#0A0F1E] border-white/10 rounded text-gold focus:ring-gold/20" />
                 <label htmlFor="remember-me" className="ml-2 block text-[10px] font-bold text-[#475569] uppercase tracking-widest">
                   Keep Session
                 </label>
               </div>
               <div className="text-[10px]">
                 <a href="#" className="font-bold text-gold hover:text-gold/80 hover:underline uppercase tracking-widest">
                   Recovery
                 </a>
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-[1.25rem] shadow-xl text-xs font-bold text-[#0A0F1E] bg-gold hover:bg-gold/90 focus:outline-none transition-all duration-200 uppercase tracking-widest active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <><Lock size={16} /> Decrypt & Access</>
              )}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-4 bg-[#0F1629] text-[#475569] uppercase font-extrabold tracking-[0.3em]">Osbic Secure</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      <p className="mt-10 text-center text-[10px] font-bold text-[#475569] uppercase tracking-[0.2em] z-10">
        Staff Member? <a href="/login" className="text-gold hover:underline">Internal Portal →</a>
      </p>
    </div>
  );
};

export default ClientLogin;
