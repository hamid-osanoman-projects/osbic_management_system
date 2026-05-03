import { useState } from 'react';
import { 
  X, User, Mail, 
  Phone, Shield, Loader2, 
  Copy, Check, UserPlus,
  Eye, EyeOff, Key,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateClient } from '../../../hooks/admin/useAdminClients';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CreateClientSlideOver = ({ isOpen, onClose }: Props) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const { profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [createdClient, setCreatedClient] = useState<any>(null);

  const createClientMutation = useCreateClient();

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pass }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createClientMutation.mutateAsync({
        ...formData,
        created_by: profile?.id
      });
      setCreatedClient(data);
      toast.success('Client registered successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleClose = () => {
    setFormData({ full_name: '', email: '', phone: '', password: '' });
    setCreatedClient(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-[101] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Register New Client</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Onboarding & Credentials</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {!createdClient ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        required
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="e.g. Abdullah Ahmed"
                        className="w-full bg-background border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="client@example.com"
                        className="w-full bg-background border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+968 9xxx xxxx"
                        className="w-full bg-background/50 border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Credentials</label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="text-[10px] font-bold text-primary hover:text-foreground uppercase tracking-widest transition-colors"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <div className="relative group">
                      <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Secure Portal Password"
                        className="w-full bg-background/50 border border-border rounded-xl py-3.5 pl-12 pr-12 text-sm text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-3">
                    <Shield className="text-primary shrink-0" size={18} />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Registering this client will create a secure OSBIC account. Credentials will be <span className="text-primary">securely revealed</span> upon success.
                    </p>
                  </div>
 
                  <button
                    type="submit"
                    disabled={createClientMutation.isPending}
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-primary/10 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
                  >
                    {createClientMutation.isPending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>Register Client Portal <ChevronRight size={16} /></>
                    )}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-8 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                    <Check size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Registration Success</h3>
                  <p className="text-sm text-muted-foreground mb-8">One-time account credentials for {createdClient.full_name}</p>
 
                  <div className="space-y-4">
                    <div className="bg-background border border-border rounded-2xl p-6 relative group overflow-hidden">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Secure Password</p>
                       <p className="text-xl font-mono text-foreground tracking-widest">{createdClient.password}</p>
                       <button
                         onClick={() => copyToClipboard(createdClient.password)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-gold/10 text-gold opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                       >
                         <Copy size={16} />
                       </button>
                    </div>
 
                    <div className="bg-background border border-border rounded-2xl p-6 relative group overflow-hidden">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Portal Access</p>
                       <p className="text-sm text-foreground font-mono">{createdClient.email}</p>
                       <button
                         onClick={() => copyToClipboard(createdClient.email)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-gold/10 text-gold opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                       >
                         <Copy size={16} />
                       </button>
                    </div>
                  </div>
 
                  <button
                    onClick={handleClose}
                    className="w-full mt-8 py-5 bg-muted text-foreground font-bold rounded-2xl hover:bg-muted/80 transition-all"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateClientSlideOver;
