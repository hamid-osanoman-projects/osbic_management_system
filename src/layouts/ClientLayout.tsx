import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderOpen, MessageSquare, 
  User, LogOut, Menu, X, Boxes, ChevronRight
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
import { useUnreadMessageCount } from '../hooks/shared/useJobs';
import { useAdminSettings } from '../hooks/admin/useAdminSettings';

const ClientLayout: React.FC = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const isRtl = i18n.dir() === 'rtl';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings, logo } = useAdminSettings();

  // Scroll Lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);


  const { data: unreadCount } = useUnreadMessageCount(profile?.id);

  // Prompt PWA install after 3rd load
  useEffect(() => {
    const visits = parseInt(localStorage.getItem('pwa_visits') || '0');
    localStorage.setItem('pwa_visits', (visits + 1).toString());
    if (visits === 2) {
    }
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col font-sans selection:bg-gold/30 selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* ── Mobile Header ── */}
      <header className="lg:hidden h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 shrink-0 z-[100]">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm hover:scale-105 active:scale-95 transition-all"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xs shadow-sm overflow-hidden">
            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : "O"}
          </div>
          <span className="font-syne font-bold text-foreground tracking-[0.2em] text-[10px] uppercase">OSBIC OS</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle variant="minimal" />
        </div>
      </header>

      {/* ── Mobile Drawer (Sidebar) ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] lg:hidden"
            />
            
            {/* Drawer Content */}
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed top-0 bottom-0 w-[80%] max-w-[320px] bg-[#0A0F1E]/95 backdrop-blur-2xl z-[250] lg:hidden flex flex-col border-r border-white/10 shadow-2xl shadow-black",
                isRtl ? "right-0" : "left-0"
              )}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xs border border-primary/30">
                    {logo ? <img src={logo} alt="" className="w-full h-full object-cover rounded-lg" /> : "X"}
                  </div>
                  <span className="font-syne font-bold text-white tracking-widest text-[11px] uppercase">OSBIC OS</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Brief Section */}
              <Link 
                to="/portal/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-6 border-b border-white/10 bg-white/[0.02] flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xl font-bold font-syne">
                  {profile?.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{profile?.full_name?.split(' ')[0]}</p>
                  <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">View Profile</p>
                </div>
                <ChevronRight size={14} className="ms-auto text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Navigation Menu Items */}
              <nav className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
                {[
                    { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
                    { label: 'Browse Services', icon: Boxes, path: '/portal/services' },
                    { label: 'Service History', icon: FolderOpen, path: '/portal/history' },
                    { label: 'Support Chat', icon: MessageSquare, path: '/portal/messages', badge: unreadCount && unreadCount > 0 ? unreadCount.toString() : null },
                ].map((item, i) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={i} 
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-[20px] text-sm font-bold transition-all relative group",
                        isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon strokeWidth={2} size={20} />
                      {item.label}
                      {item.badge && !isActive && (
                        <span className="ms-auto w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-black">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                         <motion.div layoutId="active-nav" className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Fixed Bottom: Sign Out */}
              <div className="p-6 border-t border-white/10 mt-auto bg-white/[0.01]">
                <button 
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] text-rose-500 bg-rose-500/5 border border-rose-500/10 text-sm font-bold hover:bg-rose-500/10 transition-all active:scale-95"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Fixed) */}
        <aside className="hidden lg:flex w-72 bg-sidebar border-r border-border flex flex-col h-full shrink-0">
          <div className="p-8 flex-1 overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-3 mb-12">
               <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] overflow-hidden">
                 {logo ? (
                   <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                 ) : (
                   "X"
                 )}
               </div>
               <div>
                 <span className="font-syne font-bold text-foreground tracking-[0.2em] text-lg uppercase block leading-none">
                   {settings?.company_name || 'OSBIC'}
                 </span>
                 <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1 opacity-60">Client Portal</span>
               </div>
            </div>

            <nav className="space-y-1.5">
                {[
                    { label: 'Dashboard', icon: LayoutDashboard, path: '/portal' },
                    { label: 'Browse Services', icon: Boxes, path: '/portal/services' },
                    { label: 'Service History', icon: FolderOpen, path: '/portal/history' },
                    { label: 'Support Chat', icon: MessageSquare, path: '/portal/messages', badge: unreadCount && unreadCount > 0 ? unreadCount.toString() : null },
                    { label: 'My Profile', icon: User, path: '/portal/profile' }
                ].map((item, i) => (
                 <Link 
                   key={i} 
                   to={item.path}
                   className={cn(
                     "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                     location.pathname === item.path ? "bg-primary/10 text-primary shadow-inner" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                   )}
                 >
                   <item.icon strokeWidth={1.5} size={18} className={cn("transition-colors", location.pathname === item.path ? "text-primary" : "text-muted-foreground opacity-60 group-hover:opacity-100")} />
                   {item.label}
                   {item.badge && (
                     <motion.span 
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       className="ms-auto w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold font-sans shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                     >
                       {item.badge}
                     </motion.span>
                   )}
                 </Link>
               ))}
            </nav>
          </div>

          <div className="p-6 space-y-4 border-t border-border">
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

        {/* Main Content Area (Fixed Shell) */}
        <main className="flex-1 h-full relative overflow-hidden bg-background">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="h-full w-full overflow-y-auto lg:overflow-hidden"
             >
               <Outlet />
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
