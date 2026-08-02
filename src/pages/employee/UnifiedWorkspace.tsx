import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminJobs, useEmployeeJobs } from '../../hooks/shared/useJobs';
import { useEmployeeClients } from '../../hooks/admin/useAdminClients';
import { JobDetailsView } from '../../components/employee/JobDetailsView';
import { ClientDetailsView } from '../../components/employee/ClientDetailsView';
import { ClientListView } from '../../components/employee/ClientListView';
import { TaskListView } from '../../components/employee/TaskListView';
import { TaskDashboard } from '../../components/employee/TaskDashboard';
import { Filter, Search, Plus, Clock, AlertCircle, CheckCircle2, ArrowLeft, X, User, LayoutGrid, List, Zap, Briefcase } from 'lucide-react';
import { JobBuilder } from '../../components/employee/JobBuilder';
import CreateClientSlideOver from '../../components/shared/clients/CreateClientSlideOver';
import WalkInModal from '../../components/employee/WalkInModal';

interface UnifiedWorkspaceProps {
  filterType: 'tasks' | 'clients' | 'pipeline';
}

const UnifiedWorkspace: React.FC<UnifiedWorkspaceProps> = ({ filterType }) => {
  const { profile } = useAuth();
  
  const adminQuery = useAdminJobs();
  const employeeQuery = useEmployeeJobs(profile?.id || '');

  const jobs = profile?.is_manager ? adminQuery.data : employeeQuery.data;
  const isLoading = profile?.is_manager ? adminQuery.isLoading : employeeQuery.isLoading;
  const refetch = profile?.is_manager ? adminQuery.refetch : employeeQuery.refetch;

  const { data: realClients } = useEmployeeClients(profile?.id);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientViewMode, setClientViewMode] = useState<'split' | 'list'>('list');
  const [taskViewMode, setTaskViewMode] = useState<'split' | 'list'>('list');
  const [taskFilter, setTaskFilter] = useState<'all' | 'self' | 'manager' | 'coworker'>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<'standard' | 'quick'>('standard');
  const [clientTypeFilter, setClientTypeFilter] = useState<'standard' | 'walk-in'>('standard');
  const [isBuildingJob, setIsBuildingJob] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isRegisterClientOpen, setIsRegisterClientOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlJobId = searchParams.get('jobId');
    if (urlJobId && jobs && jobs.find(j => j.id === urlJobId)) {
      setSelectedJobId(urlJobId);
      setTaskViewMode('split');
    }
  }, [searchParams, jobs]);

  // Filtering logic based on role & view type
  const getFilteredJobs = () => {
    if (!jobs || !profile) return [];
    
    switch (filterType) {
      case 'tasks':
        let taskJobs = jobs.filter(job => job.employee_id === profile.id);
        if (taskFilter === 'self') {
           taskJobs = taskJobs.filter(j => j.assigned_by === profile.id);
        } else if (taskFilter === 'manager') {
           taskJobs = taskJobs.filter(j => j.assigned_by_role === 'admin' || j.assigned_by_role === 'manager');
        } else if (taskFilter === 'coworker') {
           taskJobs = taskJobs.filter(j => j.assigned_by !== profile.id && j.assigned_by_role === 'employee');
        }
        return taskJobs;
      
      case 'clients':
        // My Clients: Jobs that the employee personally sold/brought in (assigned_by them)
        return jobs.filter(job => job.assigned_by === profile.id);
        
      case 'pipeline':
        // Sales/Manager view: All jobs
        return profile.is_manager ? jobs : [];
        
      default:
        return [];
    }
  };

  const filteredJobs = getFilteredJobs();
  const quickTasks = filteredJobs.filter(j => j.service_name === 'Quick Task (POS)');
  const standardTasks = filteredJobs.filter(j => j.service_name !== 'Quick Task (POS)');
  
  const displayJobs = jobTypeFilter === 'quick' ? quickTasks : standardTasks;
  const selectedJob = jobs?.find(j => j.id === selectedJobId);

  const getClientName = (job: any) => {
    if (job.service_name === 'Quick Task (POS)' && job.notes) {
      const match = job.notes.match(/Walk-in Name:\s*(.*?)\s*\|/);
      if (match && match[1] && match[1] !== 'Anonymous') {
        return match[1];
      }
    }
    return job.client_name;
  };

  // Derive unique clients from the filtered jobs
  const uniqueClients = React.useMemo(() => {
    if (!jobs) return [];
    
    if (clientTypeFilter === 'walk-in') {
      const walkInClientsMap = new Map();
      jobs.forEach(job => {
        if (filterType === 'clients' && (job.employee_id === profile?.id || profile?.is_manager)) {
          if (job.service_name === 'Quick Task (POS)' && job.client_name === 'Walk-in Customer') {
            const actualName = getClientName(job);
            
            let phone = undefined;
            if (job.notes) {
              const phoneMatch = job.notes.match(/\((.*?)\)/);
              if (phoneMatch && phoneMatch[1] && phoneMatch[1] !== 'Anonymous') {
                phone = phoneMatch[1];
              }
            }
            
            const key = `${actualName}-${phone || 'no-phone'}`;
            
            if (!walkInClientsMap.has(key)) {
               walkInClientsMap.set(key, {
                 id: `walkin-${key}`,
                 full_name: actualName,
                 avatar_url: null,
                 created_at: job.started_date,
                 email: undefined,
                 phone: phone,
                 client_code: `WALKIN`
               });
            }
          }
        }
      });
      return Array.from(walkInClientsMap.values());
    } else {
      // Standard Clients: Use actual DB clients if available, fallback to job extraction
      if (realClients && realClients.length > 0) {
         return realClients;
      }
      
      const clientMap = new Map();
      jobs.forEach(job => {
        // Only include clients the user owns, unless they are a manager
        if (filterType === 'clients' && (job.employee_id === profile?.id || profile?.is_manager)) {
          if (job.client_name !== 'Walk-in Customer') {
            if (!clientMap.has(job.client_id)) {
              clientMap.set(job.client_id, {
                id: job.client_id,
                full_name: job.client_name,
                avatar_url: job.client_avatar,
                created_at: new Date().toISOString(), // Mocking for now since it's not in Job
                email: 'client@example.com',
                phone: '+968 9XXXXXXX'
              });
            }
          }
        }
      });
      return Array.from(clientMap.values());
    }
  }, [jobs, filterType, profile, clientTypeFilter, realClients]);

  const selectedClient = uniqueClients.find(c => c.id === selectedClientId);
  const clientJobs = React.useMemo(() => {
     if (!jobs || !selectedClientId) return [];
     if (clientTypeFilter === 'walk-in' && selectedClient) {
         return jobs.filter(j => getClientName(j) === selectedClient.full_name && j.client_name === 'Walk-in Customer');
     }
     return jobs.filter(j => j.client_id === selectedClientId);
  }, [jobs, selectedClientId, clientTypeFilter, selectedClient]);

  const renderJobBuilderModal = () => (
    <AnimatePresence>
      {isBuildingJob && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-3xl max-h-[90vh] bg-[#1a2130] rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col border border-white/10"
          >
            <JobBuilder 
              onClose={() => setIsBuildingJob(false)}
              onJobCreated={() => {
                setIsBuildingJob(false);
                refetch(); // Refetch jobs after creation
              }} 
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderModals = () => (
    <>
      {renderJobBuilderModal()}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onJobCreated={() => {
          setIsWalkInOpen(false);
          refetch();
        }}
      />
      {isRegisterClientOpen && (
        <CreateClientSlideOver 
          isOpen={isRegisterClientOpen}
          onClose={() => {
            setIsRegisterClientOpen(false);
            setClientToEdit(null);
          }}
          clientToEdit={clientToEdit}
        />
      )}
    </>
  );

  if (filterType === 'clients' && clientViewMode === 'list') {
    return (
      <>
        {renderModals()}
        <div className="h-full flex overflow-hidden bg-background">
        <ClientListView 
              clients={uniqueClients} 
              jobs={jobs || []} 
              onClientSelect={(clientId) => {
                setSelectedClientId(clientId);
                setClientViewMode('split');
              }}
              onViewToggle={setClientViewMode}
              currentMode={clientViewMode}
              clientTypeFilter={clientTypeFilter}
              onClientTypeChange={setClientTypeFilter}
              onNewClient={() => {
                setClientToEdit(null);
                setIsRegisterClientOpen(true);
              }}
              onEditClient={(client) => {
                setClientToEdit(client);
                setIsRegisterClientOpen(true);
              }}
            />
      </div>
      </>
    );
  }

  if (filterType === 'tasks' && taskViewMode === 'list') {
    return (
      <>
        {renderModals()}
        <div className="h-full flex overflow-hidden bg-background">
        <TaskListView 
          jobs={jobs || []}
          activeFilter={taskFilter}
          onFilterChange={setTaskFilter}
          profileId={profile?.id || ''}
          onTaskSelect={(jobId) => {
            setSelectedJobId(jobId);
            setTaskViewMode('split');
            setSearchParams({ jobId });
          }}
          onViewToggle={setTaskViewMode}
          currentMode={taskViewMode}
          jobTypeFilter={jobTypeFilter}
          onJobTypeChange={setJobTypeFilter}
          onNewTask={() => setIsBuildingJob(true)}
          onWalkIn={() => setIsWalkInOpen(true)}
        />
      </div>
      </>
    );
  }

  return (
      <>
        {renderModals()}
    <div className="h-full flex overflow-hidden bg-background">
      {/* ── Left Pane: Master List ── */}
      <div className={`flex flex-col border-r border-border transition-all duration-300 ${
        (selectedJobId || selectedClientId) ? 'w-1/3 hidden lg:flex' : 'w-full lg:w-1/3'
      }`}>
        
        {/* Header & Controls */}
        <div className="p-6 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-syne font-bold text-foreground capitalize">
              {filterType.replace('_', ' ')}
            </h2>
            {filterType === 'pipeline' && (
              <button 
                onClick={() => {
                  setSelectedJobId(null);
                  setSelectedClientId(null);
                  setIsBuildingJob(true);
                }}
                className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg hover:scale-105 transition-all"
              >
                <Plus size={20} />
              </button>
            )}
            {filterType === 'clients' && (
              <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                <button 
                  onClick={() => setClientViewMode('split')}
                  className={`p-1.5 rounded-lg transition-all ${clientViewMode === 'split' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setClientViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${clientViewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List size={16} />
                </button>
              </div>
            )}
            
            {filterType === 'tasks' && (
              <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                <button 
                  onClick={() => setTaskViewMode('split')}
                  className={`p-1.5 rounded-lg transition-all ${taskViewMode === 'split' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setTaskViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${taskViewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List size={16} />
                </button>
              </div>
            )}
          </div>

          {filterType === 'tasks' && taskViewMode === 'split' && (
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border mb-4 w-full">
              <button 
                onClick={() => setJobTypeFilter('standard')}
                className={`flex-1 flex justify-center items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${jobTypeFilter === 'standard' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Briefcase size={14} /> Standard
              </button>
              <button 
                onClick={() => setJobTypeFilter('quick')}
                className={`flex-1 flex justify-center items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${jobTypeFilter === 'quick' ? 'bg-card shadow-sm text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Zap size={14} /> Walk-in
              </button>
            </div>
          )}
          
          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 border border-border rounded-xl flex items-center px-3 focus-within:border-primary/50 transition-colors">
              <Search size={16} className="text-muted-foreground mr-2" />
              <input 
                type="text" 
                placeholder="Search jobs or clients..." 
                className="w-full bg-transparent py-2.5 text-sm outline-none"
              />
            </div>
            <button className="p-2.5 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>
        
        {/* Task / Client List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {isLoading ? (
            <div className="text-center text-muted-foreground p-8 text-sm animate-pulse">Loading workspace...</div>
          ) : filterType === 'clients' ? (
            uniqueClients.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-muted/10">
                <p className="text-muted-foreground text-sm font-medium">No clients found.</p>
              </div>
            ) : (
              uniqueClients.map(client => (
                <div 
                  key={client.id}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setSelectedJobId(null);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center gap-4 ${
                    selectedClientId === client.id 
                      ? 'bg-primary/10 border-primary/30 shadow-inner' 
                      : 'bg-card border-border hover:border-primary/30 hover:shadow-lg shadow-black/5'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                     {client.avatar_url ? (
                       <img src={client.avatar_url} alt={client.full_name} className="w-full h-full object-cover" />
                     ) : (
                       <User size={20} />
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-syne font-bold truncate ${selectedClientId === client.id ? 'text-primary' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                      {client.full_name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                </div>
              ))
            )
          ) : filteredJobs.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-muted/10">
              <p className="text-muted-foreground text-sm font-medium">No tasks found in this view.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayJobs.map(job => (
                  <div 
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setSelectedClientId(null);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                      selectedJobId === job.id 
                        ? (jobTypeFilter === 'quick' ? 'bg-amber-500/10 border-amber-500/30 shadow-inner' : 'bg-primary/10 border-primary/30 shadow-inner')
                        : `bg-card border-border hover:shadow-lg shadow-black/5 ${jobTypeFilter === 'quick' ? 'hover:border-amber-500/30' : 'hover:border-primary/30'}`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${jobTypeFilter === 'quick' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-primary bg-primary/10 border-primary/20'}`}>
                        {job.job_code}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground">
                        <User size={12} />
                        {getClientName(job)}
                      </div>
                    </div>
                    <h3 className={`font-syne font-bold leading-tight mb-2 ${selectedJobId === job.id ? (jobTypeFilter === 'quick' ? 'text-amber-500' : 'text-primary') : `text-foreground transition-colors ${jobTypeFilter === 'quick' ? 'group-hover:text-amber-500' : 'group-hover:text-primary'}`}`}>
                      {job.service_name}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-4">
                       <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${
                         job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                         job.status === 'draft' ? 'bg-muted text-muted-foreground' :
                         'bg-amber-500/10 text-amber-500'
                       }`}>
                         {job.status}
                       </span>
                    </div>
                  </div>
                ))}
                {displayJobs.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-border rounded-2xl bg-muted/10 mt-4">
                    <p className="text-muted-foreground text-sm font-medium">No {jobTypeFilter === 'quick' ? 'Walk-in Tasks' : 'Standard Jobs'} found.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedJobId && selectedJob ? (
          <motion.div 
            key={selectedJobId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col bg-card relative z-10 border-l border-border shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)] lg:shadow-none"
          >
             {/* We will build the StepDetailsDrawer / JobBuilder / Ledger components inside here */}
             <div className="h-20 border-b border-border bg-background/50 backdrop-blur-md px-4 lg:px-8 flex items-center gap-4">
                <button 
                  onClick={() => setSelectedJobId(null)}
                  className="lg:hidden p-2 bg-muted/50 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                   <h2 className="text-lg lg:text-xl font-syne font-bold text-foreground">Job Details</h2>
                   <p className="text-[10px] font-bold text-primary tracking-widest uppercase">{selectedJob.job_code}</p>
                </div>
             </div>
             
             <JobDetailsView job={selectedJob} />
          </motion.div>
        ) : selectedClientId && selectedClient ? (
          <motion.div 
            key={selectedClientId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col bg-card relative z-10 border-l border-border shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)] lg:shadow-none"
          >
             <div className="h-20 border-b border-border bg-background/50 backdrop-blur-md px-4 lg:px-8 flex items-center gap-4">
                <button 
                  onClick={() => setSelectedClientId(null)}
                  className="lg:hidden p-2 bg-muted/50 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                   <h2 className="text-lg lg:text-xl font-syne font-bold text-foreground">Client Details</h2>
                </div>
             </div>
             
             <ClientDetailsView 
               client={selectedClient} 
               jobs={clientJobs} 
               onJobClick={(jobId) => {
                 setSelectedClientId(null);
                 setSelectedJobId(jobId);
               }} 
             />
          </motion.div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-background">
             <div className="text-center text-muted-foreground opacity-50">
               <div className="w-24 h-24 rounded-full bg-muted/20 border border-border mx-auto mb-6 flex items-center justify-center">
                 <Search size={32} />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest">
                 {filterType === 'pipeline' ? 'Select a task or create a new job' : 'Select a task to view details'}
               </p>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default UnifiedWorkspace;
