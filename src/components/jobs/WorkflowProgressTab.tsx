import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { type Job, type JobStep, useUpdateJobStepStatus } from '../../hooks/shared/useJobs';
import StepTimer from './StepTimer';
import { 
  Clock, AlertTriangle, Lock, Activity, FileUp, Send, Check, MessageSquare, Info, ExternalLink, Calendar, FileText, Coins
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  job: Job;
  steps: JobStep[];
  isEmployee: boolean;
  isAdmin?: boolean;
  onSwitchTab?: (tab: any) => void;
}

const WorkflowProgressTab = ({ job, steps, isEmployee, isAdmin, onSwitchTab }: Props) => {
  const { mutate: updateStep, isPending: isUpdating } = useUpdateJobStepStatus();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [actualGovFee, setActualGovFee] = useState<number>(0);

  const isStaff = isAdmin || isEmployee;

  // Robustly find the currently active step (the first one that's in_progress)
  // or the next pending one if none are in_progress.
  const activeStep = steps.find(s => s.status === 'in_progress');
  const nextPendingStep = steps.find(s => s.status === 'pending');
  
  const currentStepIndex = activeStep 
    ? steps.indexOf(activeStep) 
    : nextPendingStep 
      ? steps.indexOf(nextPendingStep) 
      : steps.length;
  const isSecondToLastStep = currentStepIndex === steps.length - 2;
  const showPaymentReminderFlag = (!job.remaining_paid && job.remaining_due_amount > 0) && (isSecondToLastStep || currentStepIndex === steps.length - 1);

  const handleUpdateStatus = (stepId: string, status: 'in_progress' | 'completed') => {
    updateStep({ 
      stepId, 
      status, 
      notes: status === 'completed' ? completionNotes : undefined,
      actualGovFee: status === 'completed' ? actualGovFee : undefined
    }, {
      onSuccess: () => {
        toast.success(status === 'completed' ? 'Step finalized & expenses recorded' : 'Step initiated');
        setShowConfirm(null);
        setCompletionNotes('');
        setActualGovFee(0);
      }
    });
  };

  const progressPercentage = steps.length > 0 
    ? Math.round((job.completed_steps / steps.length) * 100) 
    : 0;

  const formatSLA = (hours?: number) => {
    if (!hours) return null;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours > 0 ? `${remainingHours}h` : ''}`;
    }
    return `${hours}h`;
  };

  const clientPaidAmount = (job.advance_paid ? (job.advance_due_amount || 0) : 0) + 
                           (job.remaining_paid ? (job.remaining_due_amount || 0) : 0);

  const actualMinistrySpent = steps.reduce((sum, s) => sum + (Number(s.actual_gov_fee) || 0), 0);
  const operationalBalance = clientPaidAmount - actualMinistrySpent;

  return (
    <div className="space-y-8 pb-12">
      
      {!job.advance_paid && isEmployee && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-amber-500/5">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                 <Lock size={24} className="text-amber-500" />
              </div>
              <div>
                 <h4 className="text-foreground font-bold text-lg">Workflow Paused</h4>
                 <p className="text-sm text-amber-500/70">Advance payment of <span className="text-foreground font-bold">{job.advance_due_amount.toLocaleString()} OMR</span> is required to start processing.</p>
              </div>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => onSwitchTab?.('financials')}
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-primary text-[#0A0F1E] font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-gold/10"
              >
                Verify Payment
              </button>
           </div>
        </div>
      )}

      {/* ── PROJECT FINANCIAL PULSE (Staff Only) ── */}
      {isEmployee && (
        <div className="bg-card border border-border rounded-3xl p-4 flex flex-wrap items-center justify-between gap-6 shadow-xl border-l-4 border-l-primary/50">
           <div className="flex items-center gap-8">
              {/* Client Deposit */}
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Check size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest leading-none mb-1">Total Deposit</p>
                    <p className="text-sm font-mono font-bold text-foreground leading-none">{clientPaidAmount.toLocaleString()} <span className="text-[9px] font-sans opacity-40">OMR</span></p>
                 </div>
              </div>

              <div className="w-px h-8 bg-border" />

              {/* Ministry Spend (Negative) */}
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <Activity size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest leading-none mb-1">Ministry Spent</p>
                    <p className="text-sm font-mono font-bold text-red-400 leading-none">-{actualMinistrySpent.toLocaleString()} <span className="text-[9px] font-sans opacity-40">OMR</span></p>
                 </div>
              </div>

              <div className="w-px h-8 bg-border" />

              {/* Wallet Balance */}
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Info size={16} />
                 </div>
                 <div>
                    <p className="text-[10px] text-primary uppercase font-bold tracking-widest leading-none mb-1">Wallet Balance</p>
                    <p className={cn("text-lg font-mono font-bold leading-none", operationalBalance >= 0 ? "text-foreground" : "text-red-400")}>
                       {operationalBalance.toLocaleString()} <span className="text-[9px] font-sans opacity-40">OMR</span>
                    </p>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-4 pr-2">
              <button 
                onClick={() => onSwitchTab?.('financials')}
                className="px-4 py-2 rounded-xl bg-white/5 border border-border text-[10px] uppercase font-bold tracking-widest text-primary hover:text-foreground transition-all flex items-center gap-2"
              >
                 Internal Ledger <ExternalLink size={12} />
              </button>
           </div>
        </div>
      )}

      {/* Modern Progress Bar */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h4 className="text-foreground font-bold text-lg mb-1">Project Milestone</h4>
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-bold">
              {job.completed_steps} of {steps.length} Tasks Finalized
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-primary font-syne">{progressPercentage}%</span>
          </div>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-border">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-gold via-amber-500 to-gold shadow-[0_0_15px_rgba(234,179,8,0.3)]"
          />
        </div>
      </div>
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <h3 className="text-xl font-syne font-bold text-foreground">Execution Sequence</h3>
             <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border text-[10px] font-bold text-muted-foreground/60">
               SLA TRACKED
             </span>
           </div>
           <p className="text-sm text-muted-foreground">Step {job.completed_steps + 1} of {job.total_steps} • {job.service_name}</p>
        </div>
        
        {activeStep && isEmployee && (
          <div className="bg-card border border-border rounded-2xl px-6 py-4 shadow-xl flex items-center gap-6">
             <div>
               <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Active Step SLA</p>
               <p className="text-sm font-bold text-foreground truncate max-w-[150px]">{activeStep.name_en}</p>
             </div>
             <div className="w-px h-8 bg-white/5" />
             <StepTimer deadline={activeStep.deadline || new Date().toISOString()} />
          </div>
        )}
      </div>

      {showPaymentReminderFlag && isEmployee && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
           <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
           </div>
           <div className="flex-1">
              <p className="text-sm font-bold text-amber-500">Service Completion Warning</p>
              <p className="text-xs text-amber-500/70">A balance of {job.remaining_due_amount} OMR is pending. High-priority documents may be withheld until settlement.</p>
           </div>
           <button 
            onClick={() => onSwitchTab?.('financials')}
            className="px-4 py-2 bg-amber-500 text-[#0A0F1E] text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors"
           >
             Resolve Balance
           </button>
        </div>
      )}

      {/* Steps Vertical List */}
      <div className="relative space-y-4">
        {steps.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
               <Activity size={32} className="text-muted-foreground/60" />
            </div>
            <h4 className="text-foreground font-bold">No steps defined</h4>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">This service doesn't have a pre-defined roadmap. Please contact an admin to set up the workflow template.</p>
          </div>
        ) : (
          <>
            {/* Connecting Line */}
            <div className={cn("absolute top-8 bottom-8 w-0.5", isAdmin ? "left-[5px] bg-border" : "left-[27px] bg-gradient-to-b from-emerald-500/50 via-white/5 to-white/5")} />

            {steps.map((step, idx) => {
              const isActive = step.status === 'in_progress';
              const isCompleted = step.status === 'completed';
              const isPending = step.status === 'pending';
              
              if (isAdmin) {
                return (
                  <div key={step.id} className="relative pl-12 pr-4 py-4 group">
                    <div className={cn(
                      "absolute left-[2.5px] top-6 w-2 h-2 rounded-full border-2 z-10 transition-all flex items-center justify-center",
                      isCompleted ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                      isActive ? "bg-secondary border-emerald-500 animate-pulse border-t-transparent" : 
                      "bg-secondary border-muted-foreground/30"
                    )} />
                    
                    <div className="flex flex-col gap-2">
                       <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">0{idx + 1}</span>
                             <h4 className={cn("text-base font-syne font-bold transition-colors", isCompleted ? "text-emerald-400" : isActive ? "text-foreground" : "text-muted-foreground")}>{step.name_en}</h4>
                             {isActive && (
                               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-widest uppercase">
                                 <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> Live
                               </span>
                             )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                             {step.estimated_hours && (
                                <span className="text-muted-foreground/60 text-[9px] font-bold tracking-widest uppercase flex items-center gap-1">
                                  <Clock size={10} /> {formatSLA(step.estimated_hours)}
                                </span>
                             )}
                             {step.actual_gov_fee !== undefined && step.actual_gov_fee > 0 && (
                                <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                   <Activity size={10} /> {step.actual_gov_fee} OMR
                                </span>
                             )}
                          </div>
                       </div>
                       
                       <AdminSubTasksViewer stepId={step.id} jobId={job.id} />
                       
                       {step.notes && isCompleted && (
                         <div className="mt-2 text-xs text-muted-foreground/80 italic border-l-2 border-border pl-3">
                            "{step.notes}"
                         </div>
                       )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={step.id} className={cn(
                  "relative pl-16 pr-6 pt-6 pb-6 rounded-3xl border transition-all duration-300 group",
                  isActive ? "bg-card border-emerald-500/30 shadow-2xl shadow-emerald-500/5" : "bg-secondary/50 border-border opacity-80"
                )}>
                  {/* Vertical Indicator Icon */}
                  <div className={cn(
                    "absolute left-5 top-7 w-4 h-4 rounded-full border-2 z-10 transition-all flex items-center justify-center",
                    isCompleted ? "bg-emerald-500 border-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : 
                    isActive ? "bg-secondary border-emerald-500 animate-pulse border-t-transparent" : 
                    "bg-secondary border-muted-foreground/30"
                  )}>
                    {isCompleted && <Check size={10} className="text-foreground stroke-[4]" />}
                  </div>

                  {/* Content Grid */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">Step {idx + 1}</span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-widest uppercase">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                              Live Processing
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase tracking-widest opacity-60">
                              <Check size={10} className="stroke-[3]" /> Finalized
                            </span>
                          )}
                           {step.estimated_hours && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card border border-border text-muted-foreground/60 text-[9px] font-bold tracking-widest uppercase">
                                  <Clock size={10} /> {formatSLA(step.estimated_hours)}
                                </span>
                             )}
                             {isEmployee && step.actual_gov_fee !== undefined && step.actual_gov_fee > 0 && (
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 border",
                                  isCompleted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground border-border"
                                )}>
                                   <Activity size={10} /> {step.actual_gov_fee} OMR
                                </span>
                             )}
                          </div>
                       <h4 className="text-lg font-syne font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{step.name_en}</h4>
                       <p className="text-sm font-syne text-muted-foreground/60 font-medium mb-3">{step.name_ar}</p>
                       
                        {/* Documents Sub-section */}
                       {step.required_docs.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-4">
                            {step.required_docs.map((doc, dIdx) => {
                               const isUploaded = job.documents?.some(d => d.job_step_id === step.id && d.document_type === doc);
                               return (
                                 <div key={dIdx} className="flex items-center">
                                    <button 
                                     onClick={() => onSwitchTab?.('documents')}
                                     className={cn(
                                       "inline-flex items-center gap-2 px-3 py-1.5 rounded-l-lg border-y border-l text-[10px] font-bold transition-all",
                                       isUploaded ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-border text-muted-foreground/60 hover:bg-white/10 hover:text-foreground"
                                     )}
                                    >
                                       <div className={cn("w-1.5 h-1.5 rounded-full", isUploaded ? "bg-emerald-400" : "bg-current opacity-40")} />
                                       {doc}
                                    </button>
                                    <button 
                                     onClick={() => onSwitchTab?.('documents')}
                                     className={cn(
                                       "p-1.5 rounded-r-lg border-y border-r transition-all",
                                       isUploaded ? "bg-emerald-500/20 border-emerald-500/20 text-emerald-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-[#0A0F1E]"
                                     )}
                                     title={`Upload ${doc}`}
                                    >
                                       {isUploaded ? <Check size={12} /> : <FileUp size={12} />}
                                    </button>
                                 </div>
                               );
                            })}
                         </div>
                       )}

                       {/* Completion Note (if exists) */}
                       {step.notes && isCompleted && (
                         <div className="mt-4 bg-white/5 border border-border p-3 rounded-2xl flex gap-3">
                            <MessageSquare size={14} className="text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground italic">"{step.notes}"</p>
                         </div>
                       )}
                    </div>

                    {/* Status Specific Actions */}
                    <div className="shrink-0 flex items-center gap-4">
                        {isActive && isEmployee && (
                          <div className="flex items-center gap-2">
                             {showConfirm === step.id ? (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                  <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                                    onClick={() => !isUpdating && setShowConfirm(null)}
                                  />
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden relative z-10 shadow-2xl flex flex-col"
                                  >
                                    <div className="p-6 border-b border-border flex gap-4 bg-emerald-500/10">
                                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <Send size={24} />
                                      </div>
                                      <div>
                                        <h4 className="text-foreground font-bold text-lg">Finalize Milestone</h4>
                                        <p className="text-xs text-muted-foreground">Review requirements and add work notes below.</p>
                                      </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Fee Area */}
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <label className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest pl-1">Estimated Fee</label>
                                            <div className="bg-white/5 border border-border rounded-2xl p-4 text-sm text-foreground/40 font-mono">
                                              {step.estimated_gov_fee || 0} OMR
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-[10px] text-primary font-bold uppercase tracking-widest pl-1">Actual Ministry Expense *</label>
                                            <input 
                                              type="number"
                                              value={actualGovFee}
                                              onChange={(e) => setActualGovFee(Number(e.target.value))}
                                              className="w-full bg-background border border-primary/30 rounded-2xl p-4 text-sm text-foreground focus:border-gold outline-none font-mono"
                                              autoFocus
                                            />
                                          </div>
                                        </div>

                                        {/* Note Area */}
                                        <div className="space-y-2">
                                          <label className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest pl-1">Execution Notes</label>
                                          <textarea 
                                            value={completionNotes}
                                            onChange={(e) => setCompletionNotes(e.target.value)}
                                            placeholder="Describe what was accomplished..."
                                            className="w-full bg-background border border-border rounded-2xl p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-gold/50 transition-all outline-none h-24 resize-none"
                                          />
                                        </div>

                                        {/* Requirement Check */}
                                        <div className="bg-white/5 rounded-2xl p-4 border border-border flex gap-3">
                                          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                            Recorded ministry expenses will be automatically reconciled in the project wallet and client ledger.
                                          </p>
                                        </div>
                                      </div>

                                    <div className="p-6 border-t border-border flex gap-3">
                                      <button 
                                        disabled={isUpdating}
                                        onClick={() => setShowConfirm(null)}
                                        className="flex-1 py-3 bg-white/5 text-foreground rounded-xl text-xs font-bold hover:bg-muted transition-colors"
                                      >
                                        Back to Roadmap
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateStatus(step.id, 'completed')}
                                        disabled={isUpdating}
                                        className="flex-[2] py-3 bg-emerald-500 text-[#0A0F1E] rounded-xl text-xs font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
                                      >
                                        {isUpdating ? <span className="w-4 h-4 border-2 border-[#0A0F1E]/30 border-t-[#0A0F1E] rounded-full animate-spin" /> : <Check size={16} />}
                                        Submit Execution
                                      </button>
                                    </div>
                                  </motion.div>
                                </div>
                             ) : (
                               <button 
                                 onClick={() => {
                                   setActualGovFee(step.estimated_gov_fee || 0);
                                   setShowConfirm(step.id);
                                 }}
                                 className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#0A0F1E] px-5 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/20 transition-all flex items-center gap-2 group"
                               >
                                 Finalize Process <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                               </button>
                             )}
                          </div>
                        )}

                       {isPending && !activeStep && nextPendingStep?.id === step.id && isEmployee && (
                          <button 
                            onClick={() => handleUpdateStatus(step.id, 'in_progress')}
                            disabled={isUpdating || !job.advance_paid}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all",
                              !job.advance_paid 
                                ? "bg-white/5 border border-border text-muted-foreground/60 cursor-not-allowed"
                                : "bg-primary text-[#0A0F1E] shadow-xl shadow-gold/10 hover:scale-105"
                            )}
                          >
                            {!job.advance_paid ? 'Payment Required to Start' : 'Start Processing'}
                          </button>
                       )}
                       
                       {isCompleted && (
                         <div className="text-right">
                           <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Time to Completion</p>
                           <div className="text-emerald-500/50 flex items-center gap-1 justify-end">
                             <Clock size={12} />
                             <span className="text-xs font-mono">ON SCHEDULE</span>
                           </div>
                         </div>
                       )}

                       {isPending && !isActive && (
                         <div className="flex items-center gap-2 text-muted-foreground/60 opacity-30">
                            <Clock size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Awaiting Sequence</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

const AdminSubTasksViewer = ({ stepId, jobId }: { stepId: string, jobId: string }) => {
  const [subTasks, setSubTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: st } = await supabase.from('job_sub_tasks').select('*').eq('job_step_id', stepId).order('created_at', { ascending: true });
      if (st) setSubTasks(st);
      
      const { data: d } = await supabase.from('documents').select('*').eq('job_step_id', stepId).eq('document_type', 'sub_task_attachment');
      if (d) setDocs(d);
    };
    load();
  }, [stepId]);

  if (subTasks.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      {subTasks.map(st => {
        const doc = docs.find(d => d.job_sub_task_id === st.id);
        return (
          <div key={st.id} className="bg-card/50 rounded-lg p-2.5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">{st.name}</span>
              <span className={cn("text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded", st.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground')}>{st.status}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {st.ministry_fee > 0 && <span className="flex items-center gap-1 text-primary bg-primary/5 px-1.5 py-0.5 rounded"><Coins size={10} /> {st.ministry_fee} OMR</span>}
              {st.issued_date && <span className="flex items-center gap-1"><Calendar size={10} /> Iss: {st.issued_date}</span>}
              {st.expiry_date && <span className="flex items-center gap-1"><Calendar size={10} /> Exp: {st.expiry_date}</span>}
              {doc && <span className="flex items-center gap-1 text-emerald-400"><FileText size={10} /> {doc.file_name}</span>}
            </div>
          </div>
        )
      })}
    </div>
  );
};

export default WorkflowProgressTab;
