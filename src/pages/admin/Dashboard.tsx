import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown,
  Briefcase, UserCheck, AlertCircle,
  ChevronRight, Trophy,
  Wallet,
} from 'lucide-react';
import {
  useAdminDashboardStats,
  useRevenueChart,
  useRecentJobs,
  useTopEmployees,
  useJobDistribution
} from '../../hooks/admin/useAdminDashboard';
import Skeleton from '../../components/ui/Skeleton';
import ExpiryAlerts from '../../components/admin/analytics/ExpiryAlerts';
import ApprovalHub from '../../components/admin/ApprovalHub';
import PulseFeed from '../../components/admin/PulseFeed';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DASHBOARD_COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: 'text-blue-600 dark:text-blue-400 ring-blue-500/20 bg-blue-500/10',
    completed: 'text-emerald-600 dark:text-emerald-400 ring-emerald-500/20 bg-emerald-500/10',
    on_hold: 'text-amber-600 dark:text-amber-400 ring-amber-500/20 bg-amber-500/10',
    cancelled: 'text-red-600 dark:text-red-400 ring-red-500/20 bg-red-500/10',
  };
  return (
    <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset', map[status] ?? 'text-slate-400 ring-slate-400/30 bg-slate-400/10')}>
      {status.replace('_', ' ')}
    </span>
  );
};

const Dashboard = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: revenue } = useRevenueChart();
  const { data: distribution } = useJobDistribution();
  const { data: recentJobs, isLoading: jobsLoading } = useRecentJobs();
  const { data: employees, isLoading: employeesLoading } = useTopEmployees();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: stats ? `OMR ${stats.totalRevenue.toLocaleString()}` : '—',
      icon: Wallet,
      iconBg: 'bg-primary/10 border-primary/20 text-primary',
      change: stats?.revenueChange,
    },
    {
      label: 'Active Jobs',
      value: stats?.activeJobs ?? '—',
      icon: Briefcase,
      iconBg: 'bg-accent/10 border-accent/20 text-accent',
      change: stats?.jobsChange,
    },
    {
      label: 'Total Clients',
      value: stats?.totalClients ?? '—',
      icon: UserCheck,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
      change: stats?.clientsChange,
    },
    {
      label: 'Pending Actions',
      value: stats?.pendingActions ?? '—',
      icon: AlertCircle,
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
      change: stats?.actionsChange,
    },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-16"
    >
      {/* ── Row 1: KPI Cards ────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpiCards.map((card) => (
          <motion.div
            key={card.label}
            variants={item}
            whileHover={{ scale: 1.015 }}
            className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{card.label}</p>
                {statsLoading ? (
                  <Skeleton height={32} width={120} className="mt-2" />
                ) : (
                  <h3 className="text-2xl font-bold font-mono text-foreground">{card.value}</h3>
                )}
              </div>
              <div className={cn('p-3 rounded-xl border', card.iconBg)}>
                <card.icon size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {card.change !== undefined && !statsLoading && (
                <span className={cn('flex items-center text-xs font-bold', card.change >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {card.change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                  {Math.abs(card.change)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/50">vs last month</span>
            </div>
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </motion.div>
        ))}
      </section>

      {/* ── Row 2: Charts ───────────────────────────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Financial Intelligence - High Visibility Bar Chart */}
        <motion.div variants={item} className="xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-lg font-syne font-bold text-foreground">Financial Intelligence</h4>
              <p className="text-sm text-muted-foreground">Revenue Stream vs. Official Fees (Last 6 Months)</p>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsla(var(--border), 0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 12, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'hsla(var(--primary), 0.05)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--primary))', borderRadius: 16, border: '1px solid hsla(var(--primary), 0.2)', color: 'hsl(var(--foreground))', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="service" name="Agency Revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="ministry" name="Ministry Fees" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Operational Breakdown - Donut Chart */}
        <motion.div variants={item} className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
          <h4 className="text-lg font-syne font-bold text-foreground mb-1">Operational Mix</h4>
          <p className="text-xs text-muted-foreground mb-6">Real-time Job Status Distribution</p>
          
          <div className="flex-1 w-full min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={distribution ?? []}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={8}
                   dataKey="value"
                   stroke="none"
                 >
                   {distribution?.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: 12, border: 'none', color: '#fff' }}
                 />
                 <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }} />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* ── Row 3: Jobs Table + Top Employees ───────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Jobs */}
        <motion.div variants={item} className="xl:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-syne font-bold text-foreground">In-Flight Operations</h4>
            <Link to="/admin/jobs" className="text-xs text-primary flex items-center gap-1 hover:underline">
              All Jobs <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {['Job Code', 'Client', 'Service', 'Employee', 'Progress', 'Status'].map((h) => (
                    <th key={h} className="pb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobsLoading
                  ? [1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td colSpan={6} className="py-4"><Skeleton height={24} /></td>
                    </tr>
                  ))
                  : (recentJobs as any[])?.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/admin/jobs/${job.id}`)}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-4 font-mono text-primary text-sm">{job.job_code}</td>
                      <td className="py-4 text-foreground text-sm font-medium">{(job.client as any)?.full_name}</td>
                      <td className="py-4 text-muted-foreground text-sm">{isRtl ? (job.service as any)?.name_ar : (job.service as any)?.name_en}</td>
                      <td className="py-4 text-muted-foreground text-sm">{(job.employee as any)?.full_name}</td>
                      <td className="py-4 pr-8">
                        <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden border border-border">
                          <div className="h-full bg-accent rounded-full" style={{ width: '65%' }} />
                        </div>
                      </td>
                      <td className="py-4"><StatusBadge status={job.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top Employees */}
        <motion.div variants={item} className="xl:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h4 className="text-lg font-syne font-bold text-foreground mb-6">Efficiency Leaders</h4>
          <div className="space-y-5">
            {employeesLoading
              ? [1, 2, 3].map((i) => <Skeleton key={i} height={56} rounded="xl" />)
              : (employees as any[])?.map((emp, idx) => (
                <div key={emp.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden">
                      {emp.avatar_url
                        ? <img src={emp.avatar_url} className="w-full h-full object-cover" alt={emp.full_name} />
                        : <span className="text-muted-foreground font-bold text-lg">{emp.full_name[0]}</span>}
                    </div>
                    {idx < 3 && (
                      <div className={cn(
                        'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card',
                        idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-slate-300' : 'bg-orange-400'
                      )}>
                        <Trophy size={10} className="text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{emp.full_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono uppercase">{emp.employee_code ?? 'EMP'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold font-mono text-foreground leading-none">{emp.completed_month}</p>
                    <p className="text-[10px] text-muted-foreground/60 uppercase">Jobs</p>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      </section>

      {/* ── Row 4: Approval Hub & Expiry Monitor ──────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="h-[500px]">
           <ApprovalHub />
        </motion.div>
        
        <motion.div variants={item} className="h-[500px]">
           <ExpiryAlerts />
        </motion.div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
