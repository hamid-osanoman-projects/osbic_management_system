import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, CheckCircle2, 
  AlertCircle, ArrowUpRight, Bell,
  ChevronRight, Sparkles, Filter
} from 'lucide-react';
import { useEmployeeJobs } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: jobs, isLoading } = useEmployeeJobs(profile?.id || '');
  const [greeting, setGreeting] = useState('Good evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch recent notifications
  const { data: recentNotifications } = useQuery({
    queryKey: ['employee', 'recent-notifications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    }
  });

  const activeJobs = jobs?.filter(j => j.status !== 'completed' && j.status !== 'cancelled') || [];
  const completedToday = jobs?.filter(j => {
    if (j.status !== 'completed') return false;
    const completedDate = new Date(j.expected_completion).toDateString();
    return completedDate === new Date().toDateString();
  }).length || 0;

  const urgentJobs = activeJobs.filter(j => j.days_active > 7 || !j.advance_paid).slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <Skeleton height={200} rounded="xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton height={200} rounded="xl" />
          <Skeleton height={200} rounded="xl" />
          <Skeleton height={200} rounded="xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 p-4 sm:p-8 max-w-7xl mx-auto">
      
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="text-[10px] bg-primary/10 text-primary font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-primary/20">Active Station</span>
             <span className="text-[10px] text-muted-foreground">•</span>
             <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
           </div>
           <h1 className="text-3xl sm:text-4xl font-syne font-bold text-foreground">
             {greeting}, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Member'}</span>
           </h1>
        </div>

        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/employee/notifications')} className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all relative">
              <Bell size={20} />
              {recentNotifications && recentNotifications.length > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
              )}
           </button>
           <button 
             onClick={() => navigate('/employee/my-jobs')}
             className="px-6 py-3 bg-muted/50 border border-border rounded-2xl text-xs font-bold text-foreground uppercase tracking-widest hover:bg-muted transition-all flex items-center gap-2"
           >
             Go to my tasks <ChevronRight size={16} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── LEFT COLUMN: Workload Overview ── */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Primary Stats */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between h-40 group hover:border-primary/20 transition-all shadow-xl">
                 <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                       <Briefcase size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-foreground">{activeJobs.length}</p>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between h-40 group hover:border-primary/20 transition-all shadow-xl">
                 <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                       <CheckCircle2 size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Finalized Today</p>
                    <p className="text-3xl font-bold text-foreground">{completedToday}</p>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between h-40 group hover:border-primary/20 transition-all shadow-xl">
                 <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                       <Filter size={20} />
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Assigned Capacity</p>
                    <p className="text-3xl font-bold text-foreground">85%</p>
                 </div>
              </div>
           </div>

           {/* Live Feed of My Tasks */}
           <div className="space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-primary" /> Active Trajectories
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {activeJobs.slice(0, 4).map(job => (
                  <motion.div 
                    whileHover={{ x: 4 }}
                    key={job.id}
                    onClick={() => navigate(`/employee/my-jobs/${job.id}`)}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:border-primary/20 transition-all"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-foreground font-bold font-syne">
                          {job.client_name[0]}
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{job.client_name}</h4>
                           <p className="text-[10px] text-muted-foreground font-medium tracking-tight mt-0.5">{job.service_name}</p>
                        </div>
                     </div>
                     <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Step {job.completed_steps + 1} of {job.total_steps}</p>
                        <div className="w-24 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                           <div className="h-full bg-primary transition-all" style={{ width: `${(job.completed_steps / job.total_steps) * 100}%` }} />
                        </div>
                     </div>
                  </motion.div>
                ))}
                {activeJobs.length === 0 && (
                  <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                    <p className="text-muted-foreground font-bold">No active jobs assigned yet.</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* ── RIGHT COLUMN: Internal Communications & Urgent ── */}
        <div className="space-y-8">
           
           {/* Notifications Feed */}
           <div className="bg-card border border-border rounded-[32px] p-8 shadow-2xl relative overflow-hidden h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Bell size={16} className="text-primary" /> Staff Briefing
                </h3>
                <button onClick={() => navigate('/employee/notifications')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
              </div>

              <div className="space-y-6">
                 {recentNotifications?.map(notif => (
                   <div key={notif.id} className="relative pl-6 border-l border-border pb-2">
                      <div className="absolute left-[-4.5px] top-0 w-2 h-2 rounded-full bg-primary/50" />
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{new Date(notif.created_at).toLocaleTimeString()}</p>
                      <h4 className="text-[13px] font-bold text-foreground mb-1 line-clamp-1">{notif.title_en}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{notif.body_en}</p>
                   </div>
                 ))}
                 {(!recentNotifications || recentNotifications.length === 0) && (
                   <p className="text-xs text-muted-foreground italic">No recent messages.</p>
                 )}
              </div>

              <div className="mt-12 p-6 bg-primary/5 border border-primary/10 rounded-2xl relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl transition-transform group-hover:scale-150" />
                 <AlertCircle size={20} className="text-primary mb-3" />
                 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Operational Integrity</h4>
                 <p className="text-[10px] text-primary/60 leading-relaxed font-medium">Please ensure all government documentation is uploaded before marking stages as complete.</p>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
