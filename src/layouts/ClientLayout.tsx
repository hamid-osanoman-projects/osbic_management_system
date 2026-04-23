import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderOpen, MessageSquare, 
  User, LogOut, Menu, X, Boxes
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/shared/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useAuth } from '../contexts/AuthContext';

const ClientLayout: React.FC = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const isRtl = i18n.dir() === 'rtl';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prompt PWA install after 3rd load
  useEffect(() => {
    const visits = parseInt(localStorage.getItem('pwa_visits') || '0');
    localStorage.setItem('pwa_visits', (visits + 1).toString());
    if (visits === 2) {
      console.log('Final Polish: Trigger PWA Install Prompt');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-gold/30 selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-sidebar border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center font-syne font-bold text-gold">O</div>
          <span className="font-syne font-bold text-white tracking-widest text-sm uppercase">OSBIC</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageToggle variant="minimal" />
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-[#94A3B8]">
             <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              className="fixed top-0 bottom-0 left-0 right-0 w-[280px] bg-sidebar z-[70] lg:hidden flex flex-col p-6 pointer-events-auto"
              style={isRtl ? { left: 'auto', right: 0 } : { right: 'auto', left: 0 }}
            >
               <div className="flex justify-between items-center mb-8">
                 <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center font-syne font-bold text-gold">O</div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#94A3B8]"><X size={20} /></button>
               </div>
               <nav className="space-y-2">
                 {[
                   { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
                   { label: 'Service Catalog', icon: Boxes, path: '/portal/services' },
                   { label: 'Service History', icon: FolderOpen, path: '/portal/history' },
                   { label: 'Messages', icon: MessageSquare, path: '/portal/messages', badge: '2' },
                   { label: 'Profile', icon: User, path: '/portal/profile' }
                 ].map((item, i) => (
                   <Link 
                     key={i} 
                     to={item.path}
                     className={cn(
                       "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all",
                       location.pathname === item.path ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5 active:scale-95"
                     )}
                   >
                     <item.icon size={20} />
                     {item.label}
                   </Link>
                 ))}
                  <button 
                    onClick={() => signOut()}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-all mt-auto"
                  >
                    <LogOut size={20} />
                    Sign Out
                  </button>
               </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 bg-sidebar border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-12">
               <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] shadow-primary/20">O</div>
               <div>
                 <span className="font-syne font-bold text-foreground tracking-[0.2em] text-lg uppercase block leading-none">OSBIC</span>
                 <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1 opacity-60">Client Portal</span>
               </div>
            </div>

            <nav className="space-y-1.5">
                {[
                    { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
                    { label: 'Service Catalog', icon: Boxes, path: '/portal/services' },
                    { label: 'Service History', icon: FolderOpen, path: '/portal/history' },
                    { label: 'Messages', icon: MessageSquare, path: '/portal/messages', badge: '2' },
                    { label: 'Profile', icon: User, path: '/portal/profile' }
                ].map((item, i) => (
                 <Link 
                   key={i} 
                   to={item.path}
                   className={cn(
                     "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                     location.pathname === item.path ? "bg-primary/10 text-primary shadow-inner" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                   )}
                 >
                   <item.icon size={18} className={cn("transition-colors", location.pathname === item.path ? "text-primary" : "text-muted-foreground opacity-60 group-hover:opacity-100")} />
                   {item.label}
                   {item.badge && <span className="ms-auto w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold font-sans">{item.badge}</span>}
                 </Link>
               ))}
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-4">
             <div className="bg-background/50 border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Settings</p>
                   <ThemeToggle />
                </div>
                <LanguageToggle />
             </div>
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-all text-sm font-bold group border border-transparent hover:border-destructive/20"
              >
                 <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                 Sign Out
              </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar bg-background relative">
           <div className="p-4 sm:p-8 lg:p-12 max-w-6xl mx-auto h-full">
             <AnimatePresence mode="wait">
               <motion.div
                 key={location.pathname}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.3, ease: "easeOut" }}
                 className="h-full"
               >
                 <Outlet />
               </motion.div>
             </AnimatePresence>
           </div>
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
