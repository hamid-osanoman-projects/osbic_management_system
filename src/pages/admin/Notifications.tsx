import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, Clock, Info, Check, ShieldAlert, Loader2, X } from 'lucide-react';
import { useNotifications } from '../../hooks/shared/useNotifications';
import { useOperationalRequests, useResolveOperationalRequest } from '../../hooks/shared/useJobs';
import { useClientRequests } from '../../hooks/shared/useClientRequests';
import { useAuth } from '../../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Notifications = () => {
  const { profile } = useAuth();
  const { useNotificationsList, useMarkAllRead, useMarkRead, useDeleteNotification } = useNotifications();
  const { useResolveRequest } = useClientRequests();
  
  const { data: notifications, isLoading } = useNotificationsList();
  const markAllReadMutation = useMarkAllRead();
  const markReadMutation = useMarkRead();
  const deleteMutation = useDeleteNotification();
  const resolveMutation = useResolveRequest();
  const { mutateAsync: resolveJobRequestAsync } = useResolveOperationalRequest();

  const [filter, setFilter] = useState<'all' | 'unread' | 'action_required' | 'expiry'>('all');
  
  // Instant Dismissal Hook (Zero Latency)
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // When data refreshes, we can clear the dismissed IDs that are no longer in the list anyway
  useEffect(() => {
    if (notifications) {
      const realIds = notifications.map(n => n.id);
      setDismissedIds(prev => prev.filter(id => realIds.includes(id)));
    }
  }, [notifications]);

  const filtered = useMemo(() => {
    if (!notifications) return [];
    return notifications
      .filter(n => !dismissedIds.includes(n.id)) // Filter out locally dismissed
      .filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'action_required') return n.action_required || n.type === 'action_required';
        if (filter === 'expiry') return n.type === 'expiry';
        return true;
      });
  }, [notifications, filter, dismissedIds]);

  const getIcon = (type: string) => {
    switch(type) {
      case 'action_required': return <ShieldAlert size={18} className="text-red-400" />;
      case 'expiry': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'payment': return <Bell size={18} className="text-emerald-400" />;
      default: return <Info size={18} className="text-blue-400" />;
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

  const handleResolution = async (notif: any, action: 'approve' | 'reject') => {
    if (!profile) return;
    
    // 1. Instant Optimistic Dismissal (UI becomes clean immediately)
    setDismissedIds(prev => [...prev, notif.id]);

    try {
      if (notif.action_url?.startsWith('request://')) {
        const dataStr = notif.action_url.replace('request://', '');
        const [requestId, clientId, type] = dataStr.split('|');

        if (requestId && clientId) {
          await resolveMutation.mutateAsync({
            requestId,
            clientId,
            action,
            type: type as 'DELETE' | 'ARCHIVE',
            adminId: profile.id
          });
          
          await deleteMutation.mutateAsync(notif.id);
          toast.success(action === 'approve' ? 'Request accepted' : 'Request declined');
        }
      } else if (notif.action_url?.startsWith('job_request://')) {
        const dataStr = notif.action_url.replace('job_request://', '');
        const [requestId, jobId, type] = dataStr.split('|');

        if (requestId && jobId) {
          await resolveJobRequestAsync({
             requestId,
             jobId,
             action: action === 'approve' ? 'approved' : 'rejected',
             type
          });

          await deleteMutation.mutateAsync(notif.id);
          toast.success(action === 'approve' ? 'Decision processed successfully' : 'Request declined');
        }
      } else {
        // Fallback for standard or unknown action notifications
        await markReadMutation.mutateAsync(notif.id);
        await deleteMutation.mutateAsync(notif.id);
        toast.success('Action recorded');
      }
    } catch (error: any) {
      console.error('Resolution failed:', error);
      toast.error(`Decision error: ${error.message}`);
      // Rollback optimistic dismissal so user knows it failed
      setDismissedIds(prev => prev.filter(id => id !== notif.id));
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // 1. Instant Dismissal (UI only)
    setDismissedIds(prev => [...prev, id]);
    
    // 2. Background Deletion
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Notification removed');
    } catch (error: any) {
      console.error('Dismissal error:', error);
      // Fallback: If delete fails (RLS), at least mark as read so it doesn't show in "Unread"
      await markReadMutation.mutateAsync(id);
      toast.error('Deletion failed. Policy update required in SQL Editor.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">Accessing Notification Feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col max-w-5xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-syne font-bold text-foreground flex items-center gap-3">
             Notification Center
             {notifications?.filter(n => !n.is_read && !dismissedIds.includes(n.id)).length! > 0 && (
               <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-tighter">
                 {notifications?.filter(n => !n.is_read && !dismissedIds.includes(n.id)).length} Unread
               </span>
             )}
          </h1>
          <p className="text-sm text-muted-foreground">Manage system alerts and required executive actions.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => markAllReadMutation.mutate()} 
             disabled={markAllReadMutation.isPending || !notifications?.length}
             className="px-6 py-2.5 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all border border-border disabled:opacity-50 flex items-center gap-2"
           >
             <Check size={14} /> Mark All Read
           </button>
        </div>
      </div>

      {/* Modern Pill Filter Ribbon */}
      <div className="bg-background p-1.5 rounded-2xl border border-border flex items-center gap-1 inline-flex w-fit">
         {[
           { id: 'all', label: 'All Alerts', icon: <Bell size={14} /> },
           { id: 'unread', label: 'Unread', icon: <Info size={14} /> },
           { id: 'action_required', label: 'Action Required', icon: <ShieldAlert size={14} /> },
           { id: 'expiry', label: 'Expiring Soon', icon: <AlertTriangle size={14} /> }
         ].map(f => (
           <button 
             key={f.id}
             onClick={() => setFilter(f.id as any)} 
             className={cn(
               "px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap",
               filter === f.id 
                ? "bg-primary text-[#0A0F1E] shadow-lg shadow-gold/20" 
                : "text-muted-foreground/60 hover:text-foreground"
             )}
           >
             {f.icon} {f.label}
           </button>
         ))}
      </div>

      {/* Feed List */}
      <div className="flex-1 space-y-4">
         <AnimatePresence mode="popLayout">
            {filtered.map(notif => (
              <motion.div 
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group bg-card rounded-2xl p-4 sm:p-6 shadow-xl relative border transition-all hover:bg-[#141B32]",
                  !notif.is_read ? "border-gold/30" : "border-border opacity-80"
                )}
                onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
              >
                 {/* Dismiss Icon (X) - Always visible for admins */}
                 <button 
                   onClick={(e) => handleDismiss(e, notif.id)}
                   className="absolute top-4 right-4 p-2 text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                 >
                   <X size={16} />
                 </button>

                 <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 pr-8">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border", getIconBg(notif.type))}>
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <h3 className="text-base font-bold text-foreground">{notif.title_en}</h3>
                         {notif.job_id && (
                           <span className="text-[10px] text-muted-foreground/60 font-mono bg-muted/50 px-2 py-0.5 rounded border border-border truncate max-w-[100px]">{notif.job_id}</span>
                         )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 pr-4">
                        {notif.body_en}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                             <Clock size={12} /> {new Date(notif.created_at).toLocaleString()}
                           </p>
                        </div>
                      </div>

                      {/* Decision Block (Accept/Decline) */}
                      {(notif.action_required || notif.type === 'action_required' || notif.action_url?.startsWith('request://')) && (
                        <div className="mt-6 pt-6 border-t border-border">
                           <div className="flex items-center gap-2 mb-4">
                              <ShieldAlert size={14} className="text-primary" />
                              <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Executive Decision Required</p>
                           </div>
                           <div className="flex gap-3">
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleResolution(notif, 'approve'); }} 
                               disabled={resolveMutation.isPending}
                               className="px-6 py-3 bg-emerald-500 text-foreground hover:bg-emerald-400 font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                             >
                               <Check size={14} /> Accept Request
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleResolution(notif, 'reject'); }} 
                               disabled={resolveMutation.isPending}
                               className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl text-xs transition-all disabled:opacity-50 active:scale-95"
                             >
                               Decline
                             </button>
                           </div>
                        </div>
                      )}
                    </div>
                 </div>
              </motion.div>
            ))}
         </AnimatePresence>

         {filtered.length === 0 && (
           <div className="text-center py-24 bg-card border-2 border-dashed border-border rounded-[32px]">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell size={32} className="text-muted-foreground/60 opacity-30" />
              </div>
              <p className="text-foreground font-bold text-lg mb-2">Workspace Zero</p>
              <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">All systems are nominal. No active alerts or pending decisions found in this view.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Notifications;
