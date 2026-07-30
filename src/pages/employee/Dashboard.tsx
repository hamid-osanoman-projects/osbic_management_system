import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, CheckCircle2, 
  ArrowUpRight, Bell,
  ChevronRight, Activity, Zap
} from 'lucide-react';
import { useEmployeeJobs } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import { useNotifications } from '../../hooks/shared/useNotifications';
import { Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const weeklyData = [
  { day: 'Mon', tasks: 3 },
  { day: 'Tue', tasks: 6 },
  { day: 'Wed', tasks: 4 },
  { day: 'Thu', tasks: 9 },
  { day: 'Fri', tasks: 7 },
  { day: 'Sat', tasks: 2 },
  { day: 'Sun', tasks: 5 },
];

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: jobs, isLoading } = useEmployeeJobs(profile?.id || '');
  const [greeting, setGreeting] = useState('Good evening');

  // Mode switcher logic
  const canDoSales = profile?.can_do_sales ?? false;
  const canDoOps = profile?.can_do_ops ?? false;
  const isPro = profile?.is_pro ?? false;
  const showModeSwitcher = canDoSales && canDoOps;
  const [mode, setMode] = useState<'sales' | 'ops'>('sales');

  useEffect(() => {
    if (profile) {
      if (isPro) {
        navigate('/employee/pro-queue', { replace: true });
      } else if (canDoOps && !canDoSales) {
        navigate('/employee/my-tasks', { replace: true });
      }
    }
  }, [profile, isPro, canDoOps, canDoSales, navigate]);

  useEffect(() => {
    if (profile) {
      if (canDoSales && canDoOps) {
        const saved = localStorage.getItem('employee_mode');
        setMode(saved === 'ops' ? 'ops' : 'sales');
      } else if (canDoOps) {
        setMode('ops');
      } else {
        setMode('sales');
      }
    }
  }, [profile, canDoSales, canDoOps]);

  const handleModeChange = (newMode: 'sales' | 'ops') => {
    setMode(newMode);
    localStorage.setItem('employee_mode', newMode);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const { useNotificationsList, useMarkRead } = useNotifications();
  const { data: notifications } = useNotificationsList();
  const markReadMutation = useMarkRead();

  const activeJobs = jobs?.filter(j => j.status !== 'completed' && j.status !== 'cancelled') || [];
  const completedToday = jobs?.filter(j => {
    if (j.status !== 'completed') return false;
    const completedDate = new Date(j.expected_completion).toDateString();
    return completedDate === new Date().toDateString();
  }).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-8 p-8 max-w-6xl mx-auto">
        <Skeleton height={100} rounded="xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height={120} rounded="xl" />
          <Skeleton height={120} rounded="xl" />
          <Skeleton height={120} rounded="xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 p-4 sm:p-8 max-w-6xl mx-auto">
      
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
           <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-2 flex items-center gap-2 flex-wrap">
             <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
             <span className="text-muted-foreground/30">•</span>
             <span className="text-primary font-bold">{mode === 'sales' ? 'Sales Workspace' : 'Operations Workspace'}</span>
           </p>
           <h1 className="text-3xl font-syne font-bold text-foreground tracking-tight">
             {greeting}, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Member'}</span>.
           </h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {showModeSwitcher && (
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
              <button
                onClick={() => handleModeChange('sales')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'sales' ? 'bg-primary text-[#0A0F1E]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sales Mode
              </button>
              <button
                onClick={() => handleModeChange('ops')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'ops' ? 'bg-primary text-[#0A0F1E]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ops Mode
              </button>
            </div>
          )}

          <button 
            onClick={() => navigate('/employee/my-jobs')}
            className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-widest hover:text-primary transition-colors pb-1"
          >
            Open Workflow <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Top Stats (Minimal Row) ── */}
      {mode === 'sales' ? (
        <>
          {/* ── Top Stats (Minimal Row) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             <div className="bg-transparent border border-border/60 rounded-xl p-5 flex flex-col justify-between group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                   <Briefcase size={16} className="text-muted-foreground" />
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Projects</p>
                </div>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-bold text-foreground tracking-tighter">{activeJobs.length}</p>
                </div>
             </div>

             <div className="bg-transparent border border-border/60 rounded-xl p-5 flex flex-col justify-between group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                   <CheckCircle2 size={16} className="text-muted-foreground" />
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Finalized Today</p>
                </div>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-bold text-foreground tracking-tighter">{completedToday}</p>
                </div>
             </div>

             <div className="bg-transparent border border-border/60 rounded-xl p-5 flex flex-col justify-between group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                   <Activity size={16} className="text-muted-foreground" />
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Assigned Capacity</p>
                </div>
                <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-bold text-foreground tracking-tighter">85<span className="text-xl text-muted-foreground">%</span></p>
                </div>
             </div>
          </div>

          {/* ── Main Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: Flow & Tasks List */}
            <div className="space-y-12">
               
               {/* Productivity Flow Chart */}
               <div>
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                       <Activity size={14} className="text-primary" /> Productivity Flow
                     </h2>
                     <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Last 7 Days</span>
                  </div>
                  <div className="h-[140px] w-full -ml-4">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={weeklyData}>
                         <defs>
                           <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Tooltip 
                           contentStyle={{ backgroundColor: 'rgba(20, 27, 50, 0.9)', borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: '12px', fontSize: '10px', backdropFilter: 'blur(8px)' }}
                           itemStyle={{ color: '#d4af37', fontWeight: 'bold' }}
                           labelStyle={{ color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                           cursor={{ stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
                         />
                         <Area 
                           type="monotone" 
                           dataKey="tasks" 
                           stroke="#d4af37" 
                           strokeWidth={2}
                           fillOpacity={1} 
                           fill="url(#colorTasks)" 
                         />
                       </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Right Column: Live Feed */}
            <div>
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Bell size={14} className="text-primary" /> Inbox Feed
                  </h2>
               </div>

               <div className="relative pl-4 border-l border-border/40 space-y-6">
                  {notifications?.slice(0, 6).map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                         if (!notif.is_read) markReadMutation.mutate(notif.id);
                         if (notif.action_url) {
                            let url = notif.action_url;
                            if (url.startsWith('/employee/my-jobs/')) {
                               url = `/employee/tasks?jobId=${url.split('/').pop()}`;
                            }
                            navigate(url);
                         } else if (notif.job_id) {
                            navigate(`/employee/tasks?jobId=${notif.job_id}`);
                         }
                      }}
                      className="relative group cursor-pointer"
                    >
                       {/* Timeline dot */}
                       <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full ring-4 ring-background transition-colors ${!notif.is_read ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground'}`} />
                       
                       <div>
                         <div className="flex items-center justify-between mb-1">
                           <h4 className={`text-sm font-medium ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                             {notif.title_en}
                           </h4>
                           <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                             {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                         <p className="text-[13px] text-muted-foreground/80 leading-relaxed pr-4">
                           {notif.body_en}
                         </p>
                       </div>
                    </div>
                  ))}
                  {(!notifications || notifications.length === 0) && (
                    <p className="text-sm text-muted-foreground italic py-4">You have no new alerts.</p>
                  )}
               </div>
            </div>

          </div>
        </>
      ) : (
        /* ── Ops Mode View ── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} className="text-primary" /> Assigned Operations Jobs
            </h2>
          </div>

          {jobs?.filter(j => j.ops_employee_id === profile?.id).length > 0 ? (
            <div className="overflow-x-auto bg-card border border-border rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Job Code</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Client Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Service Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs
                    .filter(j => j.ops_employee_id === profile?.id)
                    .map((job) => (
                      <tr 
                        key={job.id} 
                        onClick={() => navigate(`/employee/tasks?jobId=${job.id}`)}
                        className="border-b border-border/40 hover:bg-muted/10 transition-colors cursor-pointer"
                      >
                        <td className="p-4 text-sm font-mono font-bold text-primary">{job.job_code}</td>
                        <td className="p-4 text-sm text-foreground font-medium">{job.client_name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{job.service_name}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'active' 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : job.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-3xl bg-muted/5 text-center px-6">
              <Briefcase size={36} className="text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground font-medium">No operations jobs assigned to you yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
