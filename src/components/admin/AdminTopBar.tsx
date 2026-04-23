import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageToggle from '../shared/LanguageToggle';
import ThemeToggle from '../ThemeToggle';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AdminTopBar = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const isRtl = i18n.dir() === 'rtl';

  const pathnames = location.pathname.split('/').filter(Boolean);

  // Realtime Notification Listener
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`,
        },
        () => setHasNewNotification(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);



  return (
    <header className="h-20 flex items-center justify-between px-8 bg-background/50 backdrop-blur-xl border-b border-border z-40 sticky top-0">
      {/* Left: Breadcrumbs */}
      <div className="flex flex-col justify-center">
        <h2 className="text-xl font-syne font-bold text-foreground capitalize leading-none mb-0.5">
          {pathnames[pathnames.length - 1]?.replace(/-/g, ' ') || 'Dashboard'}
        </h2>
        <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
          {pathnames.slice(1).map((name, index) => {
            const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
            const isLast = index === pathnames.slice(1).length - 1;
            return (
              <span key={name} className="flex items-center gap-1.5">
                {isRtl ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
                {isLast ? (
                  <span className="text-primary capitalize">{name.replace(/-/g, ' ')}</span>
                ) : (
                  <Link to={routeTo} className="hover:text-primary transition-colors capitalize">
                    {name.replace(/-/g, ' ')}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          className="flex items-center gap-3 px-4 py-2 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-all group w-60"
          aria-label="Open command palette"
        >
          <Search size={15} className="group-hover:text-primary transition-colors" />
          <span className="text-sm flex-1 text-left">Quick search…</span>
          <kbd className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
        </button>

        <ThemeToggle />
        <LanguageToggle variant="minimal" />

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((o) => !o); setHasNewNotification(false); }}
            className="relative p-2.5 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Notifications"
          >
            <motion.div
              animate={hasNewNotification ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
              transition={{ repeat: hasNewNotification ? Infinity : 0, duration: 1 }}
            >
              <Bell size={18} className={cn(hasNewNotification && 'text-primary')} />
            </motion.div>
            {hasNewNotification && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-sm font-bold text-foreground">Notifications</span>
                  <Link to="/admin/notifications" className="text-xs text-primary hover:underline" onClick={() => setNotifOpen(false)}>
                    View all
                  </Link>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                      <p className="text-sm font-medium text-foreground">Job #{i} status updated</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Awaiting your review or action.</p>
                      <span className="text-[10px] text-muted-foreground block mt-1.5">{i * 2} hours ago</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-bold text-foreground leading-tight">{profile?.full_name}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">{profile?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name || 'Admin'} />
              : <span className="text-primary font-bold">{profile?.full_name?.[0]?.toUpperCase()}</span>}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
