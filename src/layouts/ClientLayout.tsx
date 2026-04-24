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
import { useUnreadMessageCount } from '../hooks/shared/useJobs';

const ClientLayout: React.FC = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const isRtl = i18n.dir() === 'rtl';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: unreadCount } = useUnreadMessageCount(profile?.id);

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
      
      {/* Mobile Header (Fixed) */}
      <header className="lg:hidden h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6 sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xs shadow-sm">O</div>
          <span className="font-syne font-bold text-foreground tracking-[0.2em] text-[10px] uppercase">OSBIC OS</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle variant="minimal" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden lg:static">
        {/* Desktop Sidebar (Unchanged) */}
        <aside className="hidden lg:flex w-72 bg-sidebar border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-12">
               <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-syne font-bold text-primary text-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">O</div>
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
                    { label: 'Messages', icon: MessageSquare, path: '/portal/messages', badge: unreadCount && unreadCount > 0 ? unreadCount.toString() : null },
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
        <main className="flex-1 overflow-y-auto no-scrollbar bg-background relative selection:bg-primary/30">
           <div className="p-4 sm:p-8 lg:p-12 max-w-6xl mx-auto h-full mb-20 lg:mb-0">
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

      <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-[100] flex items-center justify-around p-2 bg-foreground/90 backdrop-blur-xl rounded-[2.5rem] border border-border shadow-2xl shadow-black/40 h-20">
        {[
          { icon: LayoutDashboard, path: '/portal', label: 'Home' },
          { icon: Boxes, path: '/portal/services', label: 'Packages' },
          { icon: MessageSquare, path: '/portal/messages', label: 'Chat', badge: unreadCount && unreadCount > 0 ? unreadCount.toString() : null },
          { icon: FolderOpen, path: '/portal/history', label: 'Files' },
          { icon: User, path: '/portal/profile', label: 'Me' }
        ].map((item, i) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={i} 
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full group"
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-[2rem] border border-primary/20 m-1"
                />
              )}
              <item.icon 
                size={22} 
                className={cn(
                  "transition-all duration-300 relative z-10",
                  isActive ? "text-primary scale-110 -translate-y-1" : "text-white/40 group-active:scale-95"
                )} 
              />
              {item.badge && !isActive && (
                <span className="absolute top-2 right-1/4 w-4 h-4 bg-primary text-[#0A0F1E] text-[8px] font-black rounded-full flex items-center justify-center shadow-lg border border-foreground">
                  {item.badge}
                </span>
              )}
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest mt-1 relative z-10 transition-all duration-300",
                isActive ? "text-primary opacity-100" : "text-white/20 opacity-0"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ClientLayout;
