import { useState } from 'react';
import { Eye, EyeOff, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { copyToClipboard } from '../../lib/credentialUtils';

interface Props {
  username: string;
  password?: string;
  hideWarning?: boolean;
}

const CredentialRevealCard = ({ username, password, hideWarning = false }: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleCopy = async (text: string, type: 'user' | 'pass') => {
    await copyToClipboard(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-3">
      {!hideWarning && password && (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-left items-start">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Important</p>
            <p className="text-xs text-amber-200/80">Screenshot or copy these credentials now. The password cannot be shown again.</p>
          </div>
        </div>
      )}

      <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
        <div className="text-left w-full overflow-hidden">
          <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Username</p>
          <p className="text-foreground font-mono truncate">{username}</p>
        </div>
        <button 
          onClick={() => handleCopy(username, 'user')} 
          className="p-2 hover:text-primary text-muted-foreground transition-colors shrink-0 outline-none"
        >
          {copiedUser ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>

      {password && (
        <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
          <div className="text-left w-full overflow-hidden">
            <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Password</p>
            <p className="text-foreground font-mono truncate">{showPassword ? password : '••••••••••••••••'}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => setShowPassword(!showPassword)} 
              className="p-2 hover:text-primary text-muted-foreground transition-colors outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={() => handleCopy(password, 'pass')} 
              className="p-2 hover:text-primary text-muted-foreground transition-colors outline-none"
            >
              {copiedPass ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialRevealCard;
