import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../../contexts/BranchContext';
import { 
  Search, Filter, LayoutGrid, List as ListIcon,
  CheckCircle2, Clock, PlayCircle, PauseCircle, Plus,
  Trash2
} from 'lucide-react';
import { useAdminJobs, useAdminDeleteJob } from '../../hooks/shared/useJobs';
import CreateJobModal from '../../components/jobs/CreateJobModal';
import DeleteJobModal from '../../components/jobs/DeleteJobModal';
import Skeleton from '../../components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLUMN_DEF = [
  { id: 'pending', label: 'Pending', color: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'awaiting_govt', label: 'Awaiting Govt', color: 'bg-amber-500' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-red-500' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

const Jobs = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const { data: jobs, isLoading } = useAdminJobs();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [mainTab, setMainTab] = useState<'jobs' | 'packages'>('jobs');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'awaiting_govt' | 'completed' | 'on_hold' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string, code: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAssociate, setSelectedAssociate] = useState<string>('all');

  const deleteMutation = useAdminDeleteJob();

  // Query package groups
  const { data: packageGroups, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['admin_package_groups'],
    enabled: mainTab === 'packages',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_job_groups')
        .select(`
          id,
          group_code,
          created_at,
          status,
          client:profiles!client_id(full_name),
          package:service_packages!package_id(name_en),
          creator:profiles!sales_employee_id(full_name),
          jobs(
            id,
            job_code,
            status,
            updated_at,
            hold_reason,
            branch_id,
            service:services!service_id(name_en),
            ops:profiles!ops_employee_id(full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const toggleGroup = (groupId: string) => {
    if (expandedGroups.includes(groupId)) {
      setExpandedGroups(expandedGroups.filter(id => id !== groupId));
    } else {
      setExpandedGroups([...expandedGroups, groupId]);
    }
  };

  const getComputedStatus = (childJobs: any[]) => {
    if (childJobs.length === 0) return { label: 'EMPTY', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
    
    const allCompleted = childJobs.every((j: any) => j.status === 'completed');
    if (allCompleted) return { label: 'COMPLETED', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };

    const anyOnHold = childJobs.some((j: any) => j.status === 'on_hold');
    if (anyOnHold) return { label: 'ON HOLD', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };

    const anyActive = childJobs.some((j: any) => j.status === 'active' || j.status === 'in_progress' || j.status === 'awaiting_govt');
    if (anyActive) return { label: 'IN PROGRESS', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };

    const allDraft = childJobs.every((j: any) => j.status === 'draft' || j.status === 'pending');
    if (allDraft) return { label: 'NOT STARTED', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };

    return { label: 'IN PROGRESS', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  useEffect(() => {
    const saved = localStorage.getItem('osbic_admin_jobs_view');
    if (saved === 'kanban' || saved === 'table') setViewMode(saved);
  }, []);

  const handleSetView = (v: 'table' | 'kanban') => {
    setViewMode(v);
    localStorage.setItem('osbic_admin_jobs_view', v);
  };

  // 1. Filter jobs by branch first
  const branchJobs = jobs?.filter(j => {
    if (selectedBranchId) return j.branch_id === selectedBranchId;
    return true;
  }) || [];

  // Dynamically compute unique categories and associates from branch-filtered jobs list
  const categories = Array.from(new Set(branchJobs.map(j => j.service_category).filter(Boolean)));
  const associates = Array.from(new Set(branchJobs.map(j => j.employee_name).filter(Boolean)));

  const filteredJobs = branchJobs.filter(j => {
    const matchesSearch = j.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          j.job_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') {
      matchesTab = j.status === 'pending' || j.status === 'draft';
    } else if (activeTab === 'active') {
      matchesTab = j.status === 'in_progress' || j.status === 'active';
    } else if (activeTab === 'awaiting_govt') {
      matchesTab = j.status === 'awaiting_govt';
    } else if (activeTab !== 'all') {
      matchesTab = j.status === activeTab;
    }

    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      matchesCategory = j.service_category === selectedCategory;
    }

    let matchesAssociate = true;
    if (selectedAssociate !== 'all') {
      matchesAssociate = j.employee_name === selectedAssociate;
    }

    return matchesSearch && matchesTab && matchesCategory && matchesAssociate;
  });

  const filteredPackageGroups = (packageGroups || []).map((group: any) => {
    const groupJobs = selectedBranchId 
      ? (group.jobs || []).filter((j: any) => j.branch_id === selectedBranchId)
      : (group.jobs || []);
    return {
      ...group,
      jobs: groupJobs
    };
  }).filter((group: any) => {
    if (selectedBranchId && group.jobs.length === 0) return false;
    
    return group.group_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
           group.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           group.package?.name_en?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const counts = {
    all: branchJobs.length,
    pending: branchJobs.filter(j => j.status === 'pending' || j.status === 'draft').length,
    active: branchJobs.filter(j => j.status === 'in_progress' || j.status === 'active').length,
    awaiting_govt: branchJobs.filter(j => j.status === 'awaiting_govt').length,
    completed: branchJobs.filter(j => j.status === 'completed').length,
    on_hold: branchJobs.filter(j => j.status === 'on_hold').length,
    cancelled: branchJobs.filter(j => j.status === 'cancelled').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] uppercase font-bold tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> In Progress</span>;
      case 'awaiting_govt':
        return <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] uppercase font-bold tracking-wider"><Clock size={10} /> Awaiting Govt</span>;
      case 'on_hold':
        return <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] uppercase font-bold tracking-wider"><PauseCircle size={10} /> On Hold</span>;
      case 'completed':
        return <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] uppercase font-bold tracking-wider"><CheckCircle2 size={10} /> Completed</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded text-[10px] uppercase font-bold tracking-wider"><PlayCircle size={10} /> Pending</span>;
    }
  };

  const renderTable = () => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-black/20">
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Project Detail</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Service Categorization</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Ownership</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Execution Roadmap</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Pulse Status</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50 text-right">Financials</th>
              <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredJobs?.map((job) => {
              const progressRaw = job.total_steps > 0 ? (job.completed_steps / job.total_steps) * 100 : 0;
              const isOverdue = job.days_active > 15;
              
              return (
                <tr key={job.id} onClick={() => navigate(`/admin/jobs/${job.id}`)} className="group hover:bg-primary/[0.02] transition-all cursor-pointer">
                  <td className="py-5 px-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-primary/70 mb-0.5">{job.job_code}</span>
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{job.client_name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-0.5 tracking-wider">{job.service_category}</span>
                      <span className="text-xs font-medium text-foreground">{job.service_name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                         {job.employee_name ? job.employee_name[0].toUpperCase() : 'U'}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-xs font-semibold text-foreground">{job.employee_name || 'Unassigned'}</span>
                         <span className="text-[10px] text-muted-foreground">Lead Associate</span>
                       </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="w-full max-w-[140px]">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-muted-foreground font-medium">{job.completed_steps}/{job.total_steps} Stages</span>
                        <span className="font-bold text-foreground">{Math.round(progressRaw)}%</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressRaw}%` }}
                          className="h-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.4)]" 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-1.5 items-start">
                       {getStatusBadge(job.status)}
                       <span className={cn("text-[9px] uppercase font-bold tracking-tight", isOverdue ? "text-red-400" : "text-muted-foreground/40")}>
                         Clocked {job.days_active}D
                       </span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <p className="text-sm font-bold text-foreground">{job.total_fee.toLocaleString()} <span className="text-[10px] text-muted-foreground ml-0.5">OMR</span></p>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setJobToDelete({ id: job.id, code: job.job_code });
                      }}
                      className="p-2 text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredJobs?.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center text-muted-foreground/40 mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Projects Found</h3>
            <p className="text-sm text-muted-foreground">Adjust your filters or search query to find what you're looking for.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderKanban = () => {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar min-h-[600px] items-start">
        {COLUMN_DEF.map(col => {
          const columnJobs = filteredJobs?.filter(j => j.status === col.id) || [];
          return (
            <div key={col.id} className="w-[300px] shrink-0 flex flex-col bg-card/50 border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{col.label}</h3>
                </div>
                <div className="bg-muted px-2 py-0.5 rounded text-xs font-bold text-foreground">{columnJobs.length}</div>
              </div>

              <div className="flex flex-col gap-3">
                {columnJobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => navigate(`/admin/jobs/${job.id}`)}
                    className="bg-background border border-border hover:border-gold/30 rounded-xl p-4 cursor-pointer transition-colors shadow-lg relative overflow-hidden group"
                  >
                    {/* Category color bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    
                    <div className="flex items-start justify-between mb-2">
                       <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate pr-2">{job.client_name}</p>
                       <p className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{job.job_code}</p>
                    </div>

                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-1">{job.service_name}</p>

                    <div className="flex items-center justify-between mt-auto">
                       <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                         <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold text-foreground">{job.employee_name[0]}</div>
                         <span className="text-[9px] text-foreground truncate max-w-[80px]">{job.employee_name.split(' ')[0]}</span>
                       </div>
                       
                       {job.status === 'in_progress' ? (
                         <div className="text-[10px] font-bold text-blue-400">{Math.round((job.completed_steps/job.total_steps)*100)}%</div>
                       ) : (
                         <div className="text-[10px] font-bold text-emerald-400">{job.total_fee} OMR</div>
                       )}
                    </div>
                  </div>
                ))}
                {columnJobs.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl p-4 text-center">
                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Empty</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  const renderPackages = () => {
    if (isGroupsLoading) {
      return (
        <div className="bg-card border border-border rounded-2xl p-6">
           <Skeleton height={300} rounded="xl" />
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-black/20">
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Group Code</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Client Name</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Package Name</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Created By</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Status</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground/50">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredPackageGroups?.map((group: any) => {
                const childJobs = group.jobs || [];
                const completedCount = childJobs.filter((j: any) => j.status === 'completed').length;
                const totalCount = childJobs.length;
                const statusBadge = getComputedStatus(childJobs);
                const isExpanded = expandedGroups.includes(group.id);

                return (
                  <React.Fragment key={group.id}>
                    <tr 
                      onClick={() => toggleGroup(group.id)} 
                      className="group hover:bg-primary/[0.01] transition-all cursor-pointer border-b border-border/30"
                    >
                      <td className="py-5 px-6 font-mono text-xs text-primary/80 font-bold">
                        <div className="flex items-center gap-2">
                          <span>{isExpanded ? '▼' : '►'}</span>
                          <span>{group.group_code}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-sm font-bold text-foreground">{group.client?.full_name || 'Unknown'}</td>
                      <td className="py-5 px-6 text-xs text-foreground font-medium">{group.package?.name_en || 'Custom Bundle Package'}</td>
                      <td className="py-5 px-6 text-xs text-muted-foreground">{group.creator?.full_name || 'System'}</td>
                      <td className="py-5 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-5 px-6 text-xs font-semibold text-foreground">
                        {completedCount} of {totalCount} services complete
                      </td>
                    </tr>
                    
                    {/* Expanded child list */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-muted/10 p-6 border-b border-border/40">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Associated Service Jobs</h4>
                            
                            <div className="space-y-2">
                              {childJobs.map((job: any) => (
                                <div 
                                  key={job.id} 
                                  onClick={() => navigate(`/admin/jobs/${job.id}`)}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border/80 bg-card rounded-xl hover:border-gold/30 transition-all cursor-pointer"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-primary font-bold">{job.job_code}</span>
                                      <span className="text-sm font-bold text-foreground">{job.service?.name_en || 'Service'}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                      Assigned Ops: <span className="text-foreground font-medium">{job.ops?.full_name || 'Unassigned'}</span>
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                                      }`}>
                                        {job.status.replace('_', ' ')}
                                      </span>
                                      {job.status === 'on_hold' && job.hold_reason && (
                                        <p className="text-[9px] text-amber-500 mt-1">Reason: {job.hold_reason}</p>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                                      Updated: {job.updated_at ? new Date(job.updated_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {(!filteredPackageGroups || filteredPackageGroups.length === 0) && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-bold text-foreground">No Package Groups</h3>
              <p className="text-sm text-muted-foreground">There are no multi-job packages registered in the pipeline yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16 h-full flex flex-col min-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-syne font-bold text-foreground">Job Pipeline</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage active service workflows</p>
          </div>
          
          <div className="flex bg-card border border-border p-1 rounded-xl w-fit">
            <button
              onClick={() => setMainTab('jobs')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainTab === 'jobs' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Jobs
            </button>
            <button
              onClick={() => setMainTab('packages')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                mainTab === 'packages' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Packages
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreateJobOpen(true)}
            className="px-6 py-2.5 bg-primary text-[#0A0F1E] font-bold rounded-xl flex items-center gap-2 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-95"
          >
            <Plus size={18} /> Launch New Job
          </button>
          <div className="flex bg-card border border-border p-1 rounded-xl">
            <button 
              onClick={() => handleSetView('table')} 
              className={cn("px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors", viewMode === 'table' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => handleSetView('kanban')} 
              className={cn("px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors", viewMode === 'kanban' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar & Pipeline Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-card border border-border p-2 rounded-2xl shrink-0 shadow-lg">
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Stage Dropdown */}
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="bg-background/50 border border-border rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer outline-none shrink-0"
          >
            <option value="all">All Stages ({counts.all})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="active">Active ({counts.active})</option>
            <option value="awaiting_govt">Awaiting Govt ({counts.awaiting_govt})</option>
            <option value="on_hold">On Hold ({counts.on_hold})</option>
            <option value="completed">Completed ({counts.completed})</option>
            <option value="cancelled">Cancelled ({counts.cancelled})</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background/50 border border-border rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer outline-none shrink-0"
          >
            <option value="all">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>

          {/* Associate Filter */}
          <select
            value={selectedAssociate}
            onChange={(e) => setSelectedAssociate(e.target.value)}
            className="bg-background/50 border border-border rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer outline-none shrink-0"
          >
            <option value="all">All Associates</option>
            {associates.map((name: string) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <div className="flex-1 lg:w-64 relative bg-background/50 rounded-xl border border-border group-focus-within:border-primary/50 transition-colors">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            <input 
              type="text" 
              placeholder="Search by Code or Client..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-foreground placeholder:text-muted-foreground/40 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border ml-auto">
            <button 
              onClick={() => handleSetView('table')} 
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'table' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <ListIcon size={18} />
            </button>
            <button 
              onClick={() => handleSetView('kanban')} 
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'kanban' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {mainTab === 'jobs' ? (
        isLoading ? (
          <div className="flex-1 bg-card border border-border rounded-2xl p-6">
             <Skeleton height={400} rounded="xl" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={viewMode}
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className={cn("flex-1", viewMode === 'kanban' && "overflow-hidden")}
            >
              {viewMode === 'table' ? renderTable() : renderKanban()}
            </motion.div>
          </AnimatePresence>
        )
      ) : (
        renderPackages()
      )}

      <CreateJobModal 
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
      />

      <DeleteJobModal 
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={() => {
          if (jobToDelete) {
             deleteMutation.mutate(jobToDelete.id, {
               onSuccess: () => {
                 toast.success('Job deleted successfully');
                 setJobToDelete(null);
               }
             });
          }
        }}
        jobCode={jobToDelete?.code || ''}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};

export default Jobs;
