import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, Briefcase, ChevronRight, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

const EmployeeNotifications = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['employee', 'notifications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'notifications'] });
    }
  });

  const handleAction = async (notif: any) => {
    if (!notif.is_read) {
      await markReadMutation.mutateAsync(notif.id);
    }
    if (notif.job_id) {
      navigate(`/employee/my-jobs/${notif.job_id}`);
    }
  };

  const markAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', profile?.id)
      .eq('is_read', false);
    
    if (error) {
      toast.error('Failed to mark all as read');
    } else {
      qc.invalidateQueries({ queryKey: ['employee', 'notifications'] });
      toast.success('All notifications marked as read');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground mb-1">Internal Communications</h1>
          <p className="text-sm text-muted-foreground/60">Assignments, status updates, and system alerts.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2"
        >
          <Check size={14} /> Mark all read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton height={80} rounded="xl" />
          <Skeleton height={80} rounded="xl" />
          <Skeleton height={80} rounded="xl" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[32px] overflow-hidden shadow-2xl">
          <div className="divide-y divide-border">
            <AnimatePresence>
              {notifications?.map((notif) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={notif.id}
                  onClick={() => handleAction(notif)}
                  className={`p-6 flex items-start gap-5 cursor-pointer transition-all hover:bg-white/[0.02] relative group ${!notif.is_read ? 'bg-blue-500/[0.02]' : ''}`}
                >
                  {!notif.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                    notif.type === 'assignment' 
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                      : 'bg-white/5 border-border text-muted-foreground/60'
                  }`}>
                    {notif.type === 'assignment' ? <Briefcase size={20} /> : <Bell size={20} />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.title_en}
                      </h4>
                      <span className="text-[10px] text-muted-foreground/60 font-medium flex items-center gap-1.5">
                        <Clock size={10} /> {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">
                      {notif.body_en}
                    </p>
                  </div>

                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} className="text-muted-foreground/60" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {notifications?.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-muted-foreground/60">
                   <Bell size={32} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Clean Slate</h3>
                <p className="text-sm text-muted-foreground/60">You have no notifications at this time.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeNotifications;
