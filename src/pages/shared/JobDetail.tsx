import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, LayoutTemplate, FolderOpen, 
  MessageCircle, Activity, DollarSign, Clock,
  MoreVertical, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useJobDetail } from '../../hooks/shared/useJobs';
import { Skeleton } from '../../components/shared/Skeleton';
import FinanceWarning from '../../components/shared/FinanceWarning';
import { useAuth } from '../../contexts/AuthContext';

// Tab Components
import WorkflowProgressTab from '../../components/jobs/WorkflowProgressTab';
import DocumentsTab from '../../components/jobs/DocumentsTab';
import FinancialsTab from '../../components/jobs/FinancialsTab';
import MessagesTab from '../../components/jobs/MessagesTab';
import { JobTimelinePanel } from '../../components/jobs/JobTimelinePanel';
import DeleteJobModal from '../../components/jobs/DeleteJobModal';
import JobDeletionRequestModal from '../../components/jobs/JobDeletionRequestModal';
import { useAdminDeleteJob, useRequestJobDeletion } from '../../hooks/shared/useJobs';
import { toast } from 'react-hot-toast';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = window.location.pathname.startsWith('/admin');
  const isEmployee = window.location.pathname.startsWith('/employee');
  const currentUserType = isAdmin ? 'admin' : isEmployee ? 'employee' : 'client'; // basic proxy
  
  const { data, isLoading } = useJobDetail(id || '');
  const [activeTab, setActiveTab] = useState<'timeline' | 'documents' | 'financials' | 'messages' | 'logs'>('timeline');
  const [hasCelebrated, setHasCelebrated] = useState(false);
  
  // Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const deleteMutation = useAdminDeleteJob();
  const requestMutation = useRequestJobDeletion();

  useEffect(() => {
    if (data?.job?.status === 'completed' && !hasCelebrated) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFFFFF', '#0A0F1E']
      });
      setHasCelebrated(true);
    }
  }, [data?.job?.status, hasCelebrated]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) return <div className="text-foreground p-12 text-center font-bold">Job not found</div>;

  const { job, steps, documents, payments, messages, logs } = data;

  const unreadCount = messages ? messages.filter((m: any) => m.sender_id !== profile?.id && !m.is_read).length : 0;

  // Milestone logic: trigger if 2 steps remaining and payment pending
  const stepsRemaining = job.total_steps - job.completed_steps;
  const showFinanceWarning = !job.remaining_paid && job.remaining_due_amount > 0 && stepsRemaining <= 2;

  const tabs = [
    { id: 'timeline', label: 'Timeline & Progress', icon: Clock },
    { id: 'documents', label: 'Documents', icon: FolderOpen, count: documents.length },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'messages', label: 'Chat Support', icon: MessageCircle, count: unreadCount > 0 ? unreadCount : undefined },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'awaiting_govt': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'on_hold': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(job.id, {
      onSuccess: () => {
        toast.success('Project terminated successfully');
        navigate(isAdmin ? '/admin/jobs' : '/employee/my-jobs');
      }
    });
  };

  const handleRequestDeletion = (reason: string) => {
    requestMutation.mutate({ jobId: job.id, reason }, {
      onSuccess: () => {
        toast.success('Deletion request submitted to admin');
        setIsRequestModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* ── HEADER NAVIGATION ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-sm">
          <span className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate(-1)}>
             {isAdmin ? 'Job Pipeline' : 'My Jobs'}
          </span>
          <span className="text-muted-foreground/60 mx-2">/</span>
          <span className="text-foreground font-medium">{job.job_code}</span>
        </div>
      </div>

      {showFinanceWarning && (
        <FinanceWarning 
          remainingAmount={job.remaining_due_amount}
          totalFee={job.total_fee}
          isClient={!isAdmin && !isEmployee}
          hideActionButton={isAdmin}
          jobId={job.id}
          onAction={() => setActiveTab('financials')}
        />
      )}

      {/* ── TOP HEADER CARD ── */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        {job.status === 'in_progress' && (
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        )}
        
        <div className="flex flex-col lg:flex-row justify-between gap-6 relative z-10">
           
           {/* Primary Identifiers */}
           <div className="space-y-4">
             <div className="flex items-center gap-3">
                <h1 className="text-3xl font-mono font-bold text-primary">{job.job_code}</h1>
                <span className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", getStatusColor(job.status))}>
                   {job.status.replace('_', ' ')}
                </span>
             </div>
             
             <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Client: </span>
                <Link to={`/admin/clients/${job.client_id}`} className="text-foreground font-bold hover:text-primary transition-colors">{job.client_name}</Link>
                <span className="text-muted-foreground/60 mx-1">•</span>
                <span>Service: </span>
                <span className="text-foreground">{job.service_name}</span>
             </div>
           </div>

           {/* Metrics & Meta */}
           <div className="flex flex-wrap items-center gap-6 lg:justify-end">
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Started</p>
                <p className="text-sm text-foreground font-medium">{new Date(job.started_date).toLocaleDateString()}</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10 hidden sm:block" />
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Expected</p>
                <p className="text-sm text-foreground font-medium">{new Date(job.expected_completion).toLocaleDateString()}</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10 hidden sm:block" />
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Time Elapsed</p>
                <p className="text-sm font-bold flex items-center gap-1.5"><Clock size={14} className="text-[#D4AF37]" /> <span className="text-foreground">{job.days_active} Days</span></p>
              </div>
           </div>
        </div>

        {/* Quick Actions Row */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 relative z-10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 text-foreground flex items-center justify-center text-xs font-bold font-syne">{job.employee_name[0]}</div>
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest leading-tight">Assigned To</p>
                <p className="text-sm font-medium text-foreground leading-tight">{job.employee_name}</p>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-2">
              {!isAdmin && (
                <>
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      "px-4 py-2 border rounded-xl bg-muted/50 text-sm font-medium transition-all active:scale-95",
                      activeTab === 'timeline' ? "border-gold text-primary" : "border-border text-foreground hover:bg-white/10"
                    )}
                  >
                    Update Status
                  </button>
                  <button 
                    onClick={() => setActiveTab('documents')} 
                    className={cn(
                      "px-4 py-2 border rounded-xl bg-muted/50 text-sm font-medium transition-all active:scale-95",
                      activeTab === 'documents' ? "border-gold text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-white/10"
                    )}
                  >
                    Upload Doc
                  </button>
                </>
              )}
              
               {isAdmin ? (
                <div className="relative">
                  <div className="w-[1px] h-4 bg-white/10 mx-1 inline-block" />
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 border border-border rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95" 
                    title="Options"
                  >
                    <MoreVertical size={16} />
                  </button>

                  <AnimatePresence>
                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 bottom-full mb-2 w-48 bg-card border border-border rounded-xl shadow-2xl p-1 z-30"
                        >
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <Activity size={14} /> Force Advance Step
                          </button>
                          <div className="h-px bg-border my-1" />
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsDeleteModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} /> Terminate Job
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : isEmployee && (
                <>
                  <div className="w-[1px] h-4 bg-white/10 mx-1" />
                  <button 
                    onClick={() => setIsRequestModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-500/20 rounded-xl bg-red-500/5 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-all active:scale-95"
                  >
                    <Trash2 size={14} /> Request Deletion
                  </button>
                </>
              )}
           </div>
        </div>

        {/* Deletion Modals */}
        <DeleteJobModal 
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          jobCode={job.job_code}
          isDeleting={deleteMutation.isPending}
        />

        <JobDeletionRequestModal 
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onConfirm={handleRequestDeletion}
          jobCode={job.job_code}
          isSubmitting={requestMutation.isPending}
        />
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "border-gold text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-primary/20 text-primary" 
                  : (tab.id === 'messages' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse" : "bg-white/10 text-muted-foreground")
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT REGION ── */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
             {activeTab === 'timeline' && (
               <JobTimelinePanel 
                 jobId={job.id} 
                 job={job} 
                 steps={steps} 
                 isEmployee={isEmployee} 
                 isAdmin={isAdmin} 
                 onSwitchTab={setActiveTab} 
               />
             )}
             {activeTab === 'documents' && <DocumentsTab jobId={job.id} documents={documents} isEmployee={isEmployee} isAdmin={isAdmin} />}
             {activeTab === 'financials' && <FinancialsTab job={job} steps={steps} isAdmin={isAdmin} isEmployee={isEmployee} />}
             {activeTab === 'messages' && <MessagesTab jobId={job.id} messages={messages} isAdmin={isAdmin} currentUserType={currentUserType as any} scope="staff_client" />}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};

export default JobDetail;
