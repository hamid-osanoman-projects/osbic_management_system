import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { playNotificationSound } from '../../utils/audio';
import toast from 'react-hot-toast';
import { Bell, X, ShieldAlert, AlertTriangle, Info, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const getIcon = (type: string) => {
  switch(type) {
    case 'action_required': return <ShieldAlert size={20} className="text-red-500" />;
    case 'expiry': return <AlertTriangle size={20} className="text-amber-500" />;
    case 'payment': return <Bell size={20} className="text-emerald-500" />;
    default: return <Info size={20} className="text-blue-500" />;
  }
};

const getIconBg = (type: string) => {
  switch(type) {
    case 'action_required': return 'bg-red-500/10 border-red-500/20';
    case 'expiry': return 'bg-amber-500/10 border-amber-500/20';
    case 'payment': return 'bg-emerald-500/10 border-emerald-500/20';
    default: return 'bg-blue-500/10 border-blue-500/20';
  }
};

export const GlobalNotificationListener = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Keep track of processed notification IDs to prevent duplicate toasts
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as any;
          
          // Only process notifications meant for the current user
          if (newNotif.recipient_id === user.id) {
            
            // Prevent duplicates if multiple listeners fire
            if (processedRef.current.has(newNotif.id)) return;
            processedRef.current.add(newNotif.id);

            // Invalidate queries so the UI updates instantly
            queryClient.invalidateQueries({ queryKey: ['employee', 'jobs'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });

            // Play the notification sound
            playNotificationSound();

            // Show Custom Toast Popup
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } w-[450px] bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex ring-1 ring-white/10 overflow-hidden border border-border cursor-pointer hover:bg-muted/30 transition-colors group relative`}
                onClick={() => {
                  toast.dismiss(t.id);
                  if (newNotif.action_url) {
                    let url = newNotif.action_url;
                    if (url.startsWith('/employee/my-jobs/')) {
                       url = `/employee/tasks?jobId=${url.split('/').pop()}`;
                    }
                    
                    if (url.startsWith('/')) {
                      navigate(url);
                    } else if (profile?.role === 'admin') {
                       navigate('/admin/notifications');
                    } else if (profile?.role === 'employee') {
                       navigate('/employee/notifications');
                    }
                  } else if (newNotif.job_id && profile?.role === 'employee') {
                     navigate(`/employee/tasks?jobId=${newNotif.job_id}`);
                  } else {
                     if (profile?.role === 'admin') navigate('/admin/notifications');
                     else if (profile?.role === 'employee') navigate('/employee/notifications');
                     else navigate('/portal/messages');
                  }
                }}
              >
                {/* Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all z-20 shadow-sm opacity-0 group-hover:opacity-100"
                >
                  <X size={16} strokeWidth={3} />
                </button>

                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start pr-8">
                    <div className={`flex-shrink-0 pt-0.5 border rounded-xl w-12 h-12 flex items-center justify-center ${getIconBg(newNotif.type)}`}>
                      {getIcon(newNotif.type)}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-base font-bold text-foreground">
                        {newNotif.title_en}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {newNotif.body_en}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest text-muted-foreground/60 border-t border-border/50 pt-3">
                     <span>{newNotif.job_id ? `Job ${newNotif.job_id}` : 'System'}</span>
                     <span className="flex items-center gap-1"><Clock size={12} /> Just now</span>
                  </div>
                </div>
                <div className="flex border-l border-border">
                  <div className="w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                </div>
              </div>
            ), {
              duration: 5000, // 5 seconds
              position: 'top-right',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate, profile?.role]);

  return null; // This is a logic-only component
};
