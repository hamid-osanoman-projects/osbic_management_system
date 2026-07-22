import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCircle2, Clock, AlertTriangle, Trash2, 
  Eye, Check, MailOpen, CreditCard, Calendar, Settings, ShieldAlert
} from 'lucide-react';
import { useNotifications } from '../../hooks/shared/useNotifications';
import { useTranslation } from 'react-i18next';
import Skeleton from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const { 
    useNotificationsList, 
    useMarkRead, 
    useMarkAllRead, 
    useDeleteNotification 
  } = useNotifications();

  const { data: notifications, isLoading } = useNotificationsList();
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();
  const deleteMutation = useDeleteNotification();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'action'>('all');

  const filteredNotifs = useMemo(() => {
    if (!notifications) return [];
    let temp = [...notifications];

    if (activeTab === 'unread') {
      temp = temp.filter(n => !n.is_read);
    } else if (activeTab === 'action') {
      temp = temp.filter(n => n.action_required);
    }

    return temp;
  }, [notifications, activeTab]);

  const stats = useMemo(() => {
    if (!notifications) return { total: 0, unread: 0, action: 0 };
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length,
      action: notifications.filter(n => n.action_required).length,
    };
  }, [notifications]);

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markReadMutation.mutate(id, {
      onSuccess: () => {
        toast.success(isRtl ? 'تم تحديد الإشعار كمقروء' : 'Notification marked as read');
      }
    });
  };

  const handleMarkAllRead = () => {
    if (stats.unread === 0) return;
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(isRtl ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All notifications marked as read');
      }
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isRtl ? 'هل تريد حذف هذا الإشعار نهائياً؟' : 'Permanently delete this notification?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(isRtl ? 'تم حذف الإشعار' : 'Notification deleted');
      }
    });
  };

  const handleNotificationClick = (notif: any) => {
    // 1. Mark as read first if unread
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }

    // 2. Navigate to action URL if present
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={18} className="text-emerald-400" />;
      case 'action_required':
        return <ShieldAlert size={18} className="text-red-400" />;
      case 'expiry':
        return <Calendar size={18} className="text-amber-500" />;
      case 'system':
      default:
        return <Settings size={18} className="text-blue-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 sm:p-12 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div className="p-6 sm:p-8 lg:p-12 pb-4 bg-background/50 border-b border-white/[0.02] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-syne font-bold text-foreground mb-1">
              {isRtl ? 'مركز الإشعارات' : 'Notifications'}
            </h1>
            <p className="text-muted-foreground/40 transition-colors uppercase tracking-[0.2em] text-[8px] font-black leading-none">
              {isRtl ? 'صندوق تنبيهات وتحديثات النظام الفورية' : 'Your real-time inbox for status updates & required actions'}
            </p>
          </div>
          
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 self-start"
            >
              <MailOpen size={14} />
              {isRtl ? 'تعيين الكل كمقروء' : 'Mark all read'}
            </button>
          )}
        </div>

        {/* Filters Tab Row */}
        <div className="flex bg-muted/50 p-1 rounded-2xl border border-border self-start shrink-0 shadow-inner max-w-full overflow-x-auto no-scrollbar scroll-smooth">
          <button 
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap shrink-0",
              activeTab === 'all' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isRtl ? 'الكل' : 'All'} ({stats.total})
          </button>
          <button 
            onClick={() => setActiveTab('unread')}
            className={cn(
              "px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0",
              activeTab === 'unread' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock size={13} className={activeTab === 'unread' ? "text-[#0A0F1E]" : "text-amber-500"} />
            {isRtl ? 'غير مقروء' : 'Unread'} ({stats.unread})
          </button>
          <button 
            onClick={() => setActiveTab('action')}
            className={cn(
              "px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0",
              activeTab === 'action' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle size={13} className={activeTab === 'action' ? "text-[#0A0F1E]" : "text-red-500"} />
            {isRtl ? 'بحاجة لإجراء' : 'Action Required'} ({stats.action})
          </button>
        </div>
      </div>

      {/* ── Notifications List ── */}
      <div className="p-6 sm:p-8 lg:p-12 pt-4 pb-24 shrink-0">
        <div className="max-w-4xl mx-auto">
          {filteredNotifs.length === 0 ? (
            <div className="py-24 text-center bg-card/40 backdrop-blur-xl border border-border rounded-[40px] shadow-2xl flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 mx-auto border border-white/5">
                <Bell size={32} className="text-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-syne font-bold text-foreground mb-1">
                {isRtl ? 'صندوق الوارد فارغ' : 'Inbox is empty'}
              </h3>
              <p className="text-[10px] text-muted-foreground/40 max-w-xs mx-auto uppercase tracking-widest">
                {isRtl ? 'لا توجد إشعارات مطابقة' : 'No matching notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filteredNotifs.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "bg-card/40 backdrop-blur-md border rounded-3xl p-5 hover:bg-card/60 transition-all cursor-pointer flex gap-4 items-start relative group shadow-sm overflow-hidden",
                      !notif.is_read ? "border-primary/20 shadow-primary/5" : "border-border/60"
                    )}
                  >
                    {/* Left unread stripe indicator */}
                    {!notif.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                    )}

                    {/* Icon Container */}
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      {getNotifIcon(notif.type)}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className={cn(
                          "text-sm tracking-tight text-foreground truncate",
                          !notif.is_read ? "font-bold" : "font-semibold"
                        )}>
                          {isRtl ? notif.title_ar : notif.title_en}
                        </h4>
                        
                        <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0 font-medium">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
                        {isRtl ? notif.body_ar : notif.body_en}
                      </p>

                      {/* Display action label if actionable */}
                      {notif.action_url && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest pt-2">
                          <span>{isRtl ? 'عرض التفاصيل والاتخاذ' : 'Take Action'}</span>
                          <CheckCircle2 size={12} className="text-primary animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Hover Actions (Mark read & Delete) */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 p-1.5 rounded-xl border border-border/40 shrink-0 self-center">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                          title={isRtl ? 'تحديد كمقروء' : 'Mark as read'}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-muted-foreground transition-colors"
                        title={isRtl ? 'حذف الإشعار' : 'Delete notification'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
