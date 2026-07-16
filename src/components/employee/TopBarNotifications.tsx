import React, { useState } from 'react';
import { Bell, Check, Clock, Briefcase, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/shared/useNotifications';
import { useAuth } from '../../contexts/AuthContext';

export const TopBarNotifications = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { useNotificationsList, useMarkRead } = useNotifications();
  const { data: notifications } = useNotificationsList();
  const markReadMutation = useMarkRead();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleAction = async (notif: any) => {
    setIsOpen(false);
    if (!notif.is_read) {
      await markReadMutation.mutateAsync(notif.id);
    }
    
    if (notif.action_url) {
       let url = notif.action_url;
       if (url.startsWith('/employee/my-jobs/')) {
          url = `/employee/tasks?jobId=${url.split('/').pop()}`;
       }
       if (profile?.role === 'admin' && url.startsWith('/employee/')) {
          url = url.replace('/employee/', '/admin/');
       }
       navigate(url);
    } else if (notif.job_id) {
       if (profile?.role === 'admin') {
          navigate(`/admin/jobs/${notif.job_id}`);
       } else {
          navigate(`/employee/tasks?jobId=${notif.job_id}`);
       }
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-[400px] bg-card border border-border rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-border bg-muted/10 flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-bold text-foreground text-[15px]">Notifications</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                    {unreadCount} Unread alerts
                  </p>
                </div>
                <button 
                  onClick={() => navigate(profile?.role === 'admin' ? '/admin/notifications' : '/employee/notifications')}
                  className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-gold transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto no-scrollbar divide-y divide-border/50">
                {(!notifications || notifications.length === 0) ? (
                  <div className="p-10 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-muted-foreground/50">
                       <Bell size={20} />
                    </div>
                    <p className="text-muted-foreground font-bold text-sm">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleAction(notif)}
                      className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer group relative ${!notif.is_read ? 'bg-primary/[0.02]' : ''}`}
                    >
                      {!notif.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                      )}
                      <div className="flex gap-4">
                        <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          notif.type === 'assignment' 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                            : 'bg-white/5 border-border text-muted-foreground/60'
                        }`}>
                          {notif.type === 'assignment' ? <Briefcase size={16} /> : <Bell size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-bold leading-tight mb-1 truncate ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title_en}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2 pr-4">
                            {notif.body_en}
                          </p>
                          <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">
                             <span>{notif.job_id ? `Job ${notif.job_id}` : 'System'}</span>
                             <span className="flex items-center gap-1"><Clock size={10} /> {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
