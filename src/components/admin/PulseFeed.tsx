import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, ChevronRight, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const PulseFeed = () => {
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', 'pulse'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Poll every 10s for pulse effect
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-syne font-bold text-foreground flex items-center gap-2">
            <Zap size={18} className="text-primary animate-pulse" /> Real-time Pulse
          </h4>
          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Live Operations Feed</p>
        </div>
        <Bell size={18} className="text-muted-foreground/60" />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-2">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))
        ) : (
          <AnimatePresence>
            {notifications?.map((n: any, idx: number) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white/5 border border-border hover:border-gold/30 rounded-xl p-4 transition-all cursor-pointer"
                onClick={() => {
                  if (n.action_required || n.type === 'action_required') {
                    navigate('/admin/notifications');
                  } else if (n.job_id) {
                    navigate(`/admin/jobs/${n.job_id}`);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-[10px] font-bold text-foreground overflow-hidden">
                    {n.sender?.avatar_url ? (
                      <img src={n.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{n.sender?.full_name?.[0] || 'S'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <p className="text-xs font-bold text-foreground truncate">{n.title_en}</p>
                        {(n.action_required || n.type === 'action_required') && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.body_en}</p>
                    
                    {(n.action_required || n.type === 'action_required') && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                          Requires Decision
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-primary" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!isLoading && notifications?.length === 0 && (
          <div className="py-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-muted-foreground/60 mb-2 opacity-20" />
            <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">System Neutral</p>
          </div>
        )}
      </div>

      <button 
        className="mt-6 w-full py-3 bg-background border border-border rounded-xl text-[10px] font-bold text-foreground uppercase tracking-widest hover:border-gold/50 transition-colors"
        onClick={() => navigate('/admin/notifications')}
      >
        View All Activity
      </button>
    </div>
  );
};

export default PulseFeed;
