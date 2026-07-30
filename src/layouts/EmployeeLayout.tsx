import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ClipboardList, 
  Bell, 
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
   Search,
   Globe,
   User,
   MessageSquare,
   PieChart,
   LayoutDashboard,
   FileText,
   Shield,
   Zap
 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { TopBarNotifications } from '../components/employee/TopBarNotifications';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { GlobalNotificationListener } from '../components/shared/GlobalNotificationListener';
import { AssignmentBanner } from '../components/employee/AssignmentBanner';
import { QuickUpdateWidget } from '../components/employee/QuickUpdateWidget';
import { useRealtime } from '../hooks/useRealtime';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EmployeeLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  useRealtime(profile?.id);

  const [availability, setAvailability] = useState(profile?.availability_status || 'on-work');

  React.useEffect(() => {
    if (profile) setAvailability(profile.availability_status || 'on-work');
  }, [profile]);

  const toggleAvailability = async () => {
    const newStatus = availability === 'available' ? 'on-work' : 'available';
    setAvailability(newStatus);
    try {
      await supabase.from('profiles').update({ availability_status: newStatus }).eq('id', profile?.id);
      toast.success(newStatus === 'available' ? 'You are now marked as Available for tasks' : 'You are now marked as On-Work');
    } catch (err) {
      toast.error('Failed to update status');
      setAvailability(availability);
    }
  };

  const navItems = [
    { key: 'home', icon: LayoutDashboard, path: '/employee' },
    { key: 'my_clients', icon: Users, path: '/employee/clients' },
    { key: 'my_tasks', icon: ClipboardList, path: '/employee/tasks' },
    // Ops queue — shown if employee can do ops work
    ...(profile?.can_do_ops ? [{ key: 'ops_queue', icon: Zap, path: '/employee/my-tasks', label: 'My Work Queue' }] : []),
    // PRO queue — shown for PRO agents
    ...(profile?.is_pro ? [{ key: 'pro_queue', icon: Shield, path: '/employee/pro-queue', label: 'PRO Queue' }] : []),
    { key: 'reports', icon: PieChart, path: '/employee/reports' },
    { key: 'invoices', icon: FileText, path: '/employee/invoices' },
    { key: 'messages', icon: MessageSquare, path: '/employee/messages' },
    { key: 'notifications', icon: Bell, path: '/employee/notifications' },
    { key: 'profile', icon: User, path: '/employee/profile' },
    ...(profile?.can_do_sales ? [{ key: 'leads', icon: Users, path: '/employee/leads' }] : []),
    ...(profile?.is_manager ? [{ key: 'pipeline', icon: Globe, path: '/employee/pipeline' }] : []),
  ];

  const handleLanguageToggle = () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <GlobalNotificationListener />
      {/* Removed AssignmentBanner for immediate direct task activation workflow */}
      <QuickUpdateWidget />
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="relative z-30 flex flex-col bg-sidebar border-r border-border h-full transition-all duration-300"
      >
        <div className="flex h-20 items-center justify-between px-6">
          {!collapsed && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-syne font-bold text-primary tracking-wider"
            >
              OSBIC STAFF
            </motion.h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground transition-colors"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )
              }
            >
              <item.icon size={20} className={cn("shrink-0")} />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {t(`sidebar.${item.key}`)}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={handleLanguageToggle}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all text-sm"
          >
            <Globe size={20} />
            {!collapsed && <span>{i18n.language.toUpperCase()}</span>}
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-sm"
          >
            <LogOut size={20} />
            {!collapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="relative z-50 h-20 flex items-center justify-between px-8 bg-background/50 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-4 bg-muted/20 border border-border px-4 py-2 rounded-xl w-80 group focus-within:border-primary/50 transition-all">
            <Search size={18} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={t('common.search')} 
              className="bg-transparent border-none outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-4">
            <TopBarNotifications />
            <div className="w-[1px] h-6 bg-border mx-2" />
            <ThemeToggle />
            
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest transition-all ml-2 ${
                availability === 'available' 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${availability === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {availability === 'available' ? 'Available' : 'On-Work'}
            </button>

            <NavLink to="/employee/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-foreground leading-tight">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground uppercase">{profile?.employee_code || 'Employee'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg">
                {profile?.full_name?.[0].toUpperCase()}
              </div>
            </NavLink>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.35 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default EmployeeLayout;
