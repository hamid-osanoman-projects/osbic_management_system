import React from 'react';
import { TaskDashboard } from './TaskDashboard';
import { ChevronRight, LayoutGrid, List as ListIcon, Clock, CheckCircle2, Briefcase, Plus, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TaskListViewProps {
  jobs: any[];
  activeFilter: 'all' | 'self' | 'manager' | 'coworker';
  onFilterChange: (filter: 'all' | 'self' | 'manager' | 'coworker') => void;
  profileId: string;
  onTaskSelect: (jobId: string) => void;
  onViewToggle: (mode: 'split' | 'list') => void;
  currentMode: 'split' | 'list';
  onNewTask: () => void;
  onQuickTask: () => void;
  jobTypeFilter: 'standard' | 'quick';
  onJobTypeChange: (type: 'standard' | 'quick') => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ 
  jobs, 
  activeFilter, 
  onFilterChange, 
  profileId, 
  onTaskSelect,
  onViewToggle,
  currentMode,
  onNewTask,
  onQuickTask,
  jobTypeFilter,
  onJobTypeChange
}) => {
  const queryClient = useQueryClient();

  const acceptJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'active' })
        .eq('id', jobId);
      if (error) throw error;
      
      await supabase
        .from('job_steps')
        .update({ status: 'in_progress' })
        .eq('job_id', jobId)
        .eq('assigned_to', profileId)
        .eq('status', 'pending');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      toast.success('Task accepted and moved to active workload!');
    }
  });

  const pendingJobs = jobs?.filter(job => job.status === 'pending' && job.assigned_by !== profileId) || [];

  // Apply the same filter logic here
  let filteredJobs = jobs.filter(job => !(job.status === 'pending' && job.assigned_by !== profileId));
  if (activeFilter === 'self') {
    filteredJobs = jobs.filter(j => j.assigned_by === profileId);
  } else if (activeFilter === 'manager') {
    filteredJobs = jobs.filter(j => j.assigned_by_role === 'admin' || j.assigned_by_role === 'manager');
  } else if (activeFilter === 'coworker') {
    filteredJobs = jobs.filter(j => j.assigned_by !== profileId && j.assigned_by_role === 'employee');
  }

  const quickTasks = filteredJobs.filter(j => j.service_name === 'Quick Task (POS)');
  const standardTasks = filteredJobs.filter(j => j.service_name !== 'Quick Task (POS)');
  
  const displayJobs = jobTypeFilter === 'quick' ? quickTasks : standardTasks;

  const getClientName = (job: any) => {
    if (job.service_name === 'Quick Task (POS)' && job.notes) {
      const match = job.notes.match(/Walk-in Name:\s*(.*?)\s*\|/);
      if (match && match[1] && match[1] !== 'Anonymous') {
        return match[1];
      }
    }
    return job.client_name;
  };

  const renderJobRow = (job: any, isQuick: boolean) => (
    <tr 
      key={job.id} 
      onClick={() => onTaskSelect(job.id)}
      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer group"
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isQuick ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
             {isQuick ? <Zap size={18} /> : <Briefcase size={18} />}
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{getClientName(job)}</div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${isQuick ? 'text-amber-500' : 'text-muted-foreground'}`}>{job.job_code}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="text-sm text-foreground">{job.service_name}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{job.service_category}</div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${
            job.status === 'completed' ? 'bg-emerald-500' :
            job.status === 'active' || job.status === 'in_progress' ? 'bg-primary' :
            job.status === 'draft' ? 'bg-amber-500' : 'bg-muted-foreground'
          }`} />
          <span className="text-xs font-bold uppercase tracking-wider">{job.status}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {job.completed_steps} of {job.total_steps} steps
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="text-sm font-bold text-foreground">{(job.total_fee || 0).toFixed(3)} OMR</div>
        {job.remaining_paid || job.total_fee === 0 ? (
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Fully Paid
          </div>
        ) : (
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1 mt-1">
            <Clock size={12} /> Pending: {job.remaining_paid ? 0 : (job.remaining_due_amount > 0 ? job.remaining_due_amount : job.total_fee).toFixed(3)} OMR
          </div>
        )}
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock size={12} />
          {format(new Date(job.started_date), 'MMM dd, yyyy')}
        </div>
      </td>
      <td className="py-4 px-6 text-right">
        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
      </td>
    </tr>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-background no-scrollbar">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-syne font-bold text-foreground">Task Management</h2>
          <div className="flex items-center gap-4">
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border mr-4">
              <button 
                onClick={() => onJobTypeChange('standard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${jobTypeFilter === 'standard' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Briefcase size={14} /> Standard
              </button>
              <button 
                onClick={() => onJobTypeChange('quick')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${jobTypeFilter === 'quick' ? 'bg-card shadow-sm text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Zap size={14} /> Quick (POS)
              </button>
            </div>
            
            <button 
              onClick={onQuickTask}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-amber-950 font-bold text-xs tracking-widest uppercase rounded-xl hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
            >
              <Zap size={16} /> Quick Task
            </button>
            <button 
              onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs tracking-widest uppercase rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              <Plus size={16} /> New Task
            </button>
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
              <button 
                onClick={() => onViewToggle('split')}
                className={`p-1.5 rounded-lg transition-all ${currentMode === 'split' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => onViewToggle('list')}
                className={`p-1.5 rounded-lg transition-all ${currentMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Pending Acceptance Tray */}
        {pendingJobs.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8 relative overflow-hidden shadow-[0_0_40px_rgba(212,175,55,0.05)]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
             <h2 className="text-sm font-syne font-bold text-foreground flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Pending Acceptance ({pendingJobs.length})
             </h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
               {pendingJobs.map(job => (
                 <div key={job.id} className="bg-card border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{job.client_name}</h3>
                      <p className="text-xs text-muted-foreground">{job.service_name}</p>
                      <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mt-1">
                        Assigned by: {job.assigned_by_role}
                      </p>
                    </div>
                    <button
                      onClick={() => acceptJobMutation.mutate(job.id)}
                      disabled={acceptJobMutation.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg hover:bg-gold transition-all disabled:opacity-50"
                    >
                      Accept Task
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* The Dashboard fits perfectly here in a full-width view */}
        <TaskDashboard 
          jobs={jobs} 
          activeFilter={activeFilter} 
          onFilterChange={onFilterChange} 
          profileId={profileId} 
        />

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client & Task ID</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Service</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status & Progress</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Financials</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Start Date</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayJobs.map((job) => renderJobRow(job, jobTypeFilter === 'quick'))}
                
                {displayJobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      No {jobTypeFilter === 'quick' ? 'Quick Tasks' : 'Standard Jobs'} found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
