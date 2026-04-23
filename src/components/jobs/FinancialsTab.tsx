import { type Job, useUpdateJobPayment } from '../../hooks/shared/useJobs';
import { DollarSign, ArrowUpRight, CheckCircle2, Clock, FileText, Check, ExternalLink, Activity } from 'lucide-react';
import InvoiceButton from './InvoiceButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { useState } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  job: Job;
  steps: any[];
  isAdmin: boolean;
  isEmployee: boolean;
}

const FinancialsTab = ({ job, steps, isAdmin, isEmployee }: Props) => {
  const { mutate: updatePayment, isPending } = useUpdateJobPayment();
  const [uploadingFor, setUploadingFor] = useState<'advance' | 'remaining' | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(0);

  const isStaff = isAdmin || isEmployee;

  // ─── Financial Calculations ───────────────────────────────────────────────
  const clientPaidAmount = (job.advance_paid ? (job.advance_due_amount || 0) : 0) + 
                           (job.remaining_paid ? (job.remaining_due_amount || 0) : 0);

  const actualMinistrySpent = steps.reduce((sum, s) => sum + (Number(s.actual_gov_fee) || 0), 0);
  const remainingMinistryEst = steps
    .filter(s => s.status !== 'completed')
    .reduce((sum, s) => sum + (Number(s.estimated_gov_fee) || 0), 0);

  const operationalBalance = clientPaidAmount - actualMinistrySpent;
  const projectProfitability = job.total_fee - (actualMinistrySpent + remainingMinistryEst);

  const handleTogglePaid = (type: 'advance' | 'remaining', currentStatus: boolean, receiptUrl?: string, amount?: number) => {
    updatePayment({
      jobId: job.id,
      type,
      paid: !currentStatus,
      receiptUrl,
      amount
    }, {
      onSuccess: () => {
        setUploadingFor(null);
        setCustomAmount(0);
      }
    });
  };

  const openVerification = (type: 'advance' | 'remaining') => {
    const defaultAmt = type === 'advance' ? (Number(job.advance_due_amount) || 0) : (Number(job.remaining_due_amount) || 0);
    setCustomAmount(defaultAmt);
    setUploadingFor(type);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* ── INTERNAL PROJECT WALLET (Staff Only) ── */}
      {isStaff && (
        <div className="bg-card dark:bg-[#0A0F1E] border border-border dark:border-primary/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden transition-colors duration-300">
           {/* Glassmorphic Glow */}
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

           <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                 <div>
                    <h3 className="text-xl font-syne font-bold text-foreground flex items-center gap-2">
                       <DollarSign className="text-primary" /> Internal Execution Ledger
                    </h3>
                    <p className="text-sm text-muted-foreground/80 dark:text-muted-foreground/60">Live reconciliation of client deposits vs. ministry spending</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-muted/50 dark:bg-white/5 border border-border rounded-xl">
                       <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-0.5">Project ID</p>
                       <p className="text-sm font-mono font-bold text-foreground">{job.job_code}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Deposit Hold */}
                 <div className="bg-muted/30 dark:bg-white/[0.03] border border-border dark:border-white/5 rounded-2xl p-6">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Total Client Deposit</p>
                    <p className="text-3xl font-mono font-bold text-foreground">
                       {clientPaidAmount.toLocaleString()} <span className="text-xs text-muted-foreground/60 font-sans">OMR</span>
                    </p>
                    <div className="mt-4 w-full bg-muted dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                       <div 
                        className="bg-primary h-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (clientPaidAmount / job.total_fee) * 100)}%` }} 
                       />
                    </div>
                 </div>

                 {/* Gov Spending */}
                 <div className="bg-muted/30 dark:bg-white/[0.03] border border-border dark:border-white/5 rounded-2xl p-6">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Ministry Disbursement</p>
                    <p className="text-3xl font-mono font-bold text-foreground">
                       {actualMinistrySpent.toLocaleString()} <span className="text-xs text-muted-foreground/60 font-sans">OMR</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1.5 font-bold">
                       <Clock size={10} /> +{remainingMinistryEst} OMR PLANNED FOR REMAINING STEPS
                    </p>
                 </div>

                 {/* Net Balance */}
                 <div className={cn(
                    "rounded-2xl p-6 border transition-all",
                    operationalBalance >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20 shadow-lg shadow-red-500/5"
                 )}>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Available Running Balance</p>
                    <p className={cn("text-3xl font-mono font-bold", operationalBalance >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
                       {operationalBalance.toLocaleString()} <span className="text-xs opacity-60 font-sans">OMR</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest">
                       Holding {Math.round((operationalBalance / clientPaidAmount) * 100 || 0)}% of Client's Funds
                    </p>
                 </div>
              </div>

              {/* Forecast Card */}
              <div className="mt-6 p-4 bg-muted/20 dark:bg-white/5 rounded-2xl border border-border dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                       <Activity size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest">Project Yield Forecast</p>
                       <p className="text-sm font-bold text-foreground">Estimated Net Profit: <span className="text-primary">{projectProfitability.toLocaleString()} OMR</span></p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <InvoiceButton job={job} type="full" className="bg-primary/10 hover:bg-primary/20" />
                    <div className="text-[10px] font-bold text-muted-foreground uppercase bg-card dark:bg-white/5 px-3 py-1.5 rounded-lg border border-border dark:border-white/5">
                       Internal Analytics
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Header and Summary Grid (Public/Standard) */}
      <div>
        <div className="flex items-center justify-between mb-6">
           <div>
             <h3 className="text-lg font-syne font-bold text-foreground">Financial Overview</h3>
             <p className="text-xs text-muted-foreground">Standardized payment status and service quotas</p>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {/* Total */}
           <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><DollarSign size={12}/> Total Client Fee</p>
              <p className="text-2xl font-mono font-bold text-foreground mb-1">{job.total_fee.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">OMR</p>
           </div>

           {/* Work Fee */}
           <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] text-amber-500/80 uppercase font-bold tracking-widest mb-2 flex items-center gap-1"><ArrowUpRight size={12}/> OSBIC Net Revenue</p>
              <p className="text-2xl font-mono font-bold text-amber-500 mb-1">{job.work_fee.toLocaleString()}</p>
              <p className="text-[10px] text-amber-500/80">OMR</p>
           </div>
           
           {/* Ministry */}
           <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-2">Ministry Fee</p>
              <p className="text-2xl font-mono font-bold text-foreground mb-1">{job.ministry_fee.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">OMR</p>
           </div>

           {/* Balance Status */}
           <div className={cn("border rounded-2xl p-5 shadow-xl flex flex-col justify-between", (!job.remaining_paid && job.remaining_due_amount > 0) ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
              <div>
                <p className={cn("text-[10px] uppercase font-bold tracking-widest mb-2", (!job.remaining_paid && job.remaining_due_amount > 0) ? "text-red-400" : "text-emerald-500")}>Outstanding Balance</p>
                <p className={cn("text-2xl font-mono font-bold mb-1", (!job.remaining_paid && job.remaining_due_amount > 0) ? "text-red-400" : "text-emerald-400")}>
                  {job.remaining_paid 
                    ? '0' 
                    : (job.total_fee - (job.advance_paid ? job.advance_due_amount : 0)).toLocaleString()
                  }
                </p>
              </div>
              <div>
                {!job.advance_paid ? (
                   <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-500 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-amber-400/30">
                     <Clock size={10} /> Awaiting Advance
                   </span>
                ) : !job.remaining_paid ? (
                   <span className="inline-flex items-center gap-1 bg-red-400/20 text-red-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-red-400/30">
                     <Clock size={10} /> Pending Final
                   </span>
                ) : (
                   <span className="inline-flex items-center gap-1 bg-emerald-400/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-emerald-400/30">
                     <CheckCircle2 size={10} /> Fully Paid
                   </span>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Payment Milestones (Actionable for Employees) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Milestone 1: Advance */}
          <div className={cn(
            "p-6 rounded-2xl border transition-all",
            job.advance_paid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-border"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Advance Payment (50%)</h4>
                <p className="text-2xl font-mono font-bold text-foreground mt-1">{job.advance_due_amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">OMR</span></p>
              </div>
              {job.advance_paid ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Check size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 animate-pulse">
                  <Clock size={16} />
                </div>
              )}
            </div>

            {job.advance_receipt_url && (
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-border group w-full">
                  <FileText size={14} className="text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">Receipt Attached</span>
                  <a href={job.advance_receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:text-foreground transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
                <InvoiceButton job={job} type="advance" className="w-full sm:w-auto" />
              </div>
            )}

            {isStaff && (
              <div className="space-y-3">
                {uploadingFor === 'advance' ? (
                  <div className="p-4 bg-black/20 rounded-xl border border-dashed border-border space-y-4">
                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold mb-2">Verify Received Amount</p>
                    <div className="space-y-2">
                       <label className="text-[10px] text-muted-foreground">Actual OMR Received:</label>
                       <input 
                         type="number" 
                         value={customAmount}
                         onChange={(e) => setCustomAmount(Number(e.target.value))}
                         className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:border-gold outline-none"
                       />
                    </div>
                     <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-4">
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1">
                          <span>Resulting Final Balance:</span>
                          <span className="font-mono text-emerald-400 font-bold">{(job.total_fee - customAmount).toLocaleString()} OMR</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (customAmount / job.total_fee) * 100)}%` }} 
                          />
                        </div>
                     </div>
                      <button 
                        onClick={() => handleTogglePaid('advance', false, undefined, customAmount)}
                       className="w-full py-2.5 bg-emerald-500 text-[#0A0F1E] text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                     >
                       Confirm {customAmount.toLocaleString()} OMR & Unlock Workflow
                     </button>
                    <button onClick={() => setUploadingFor(null)} className="w-full mt-2 text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors">Cancel Payment Verification</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => job.advance_paid ? handleTogglePaid('advance', true) : openVerification('advance')}
                    disabled={isPending}
                    className={cn(
                      "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                      job.advance_paid 
                        ? "bg-white/5 text-muted-foreground/60 border border-border hover:bg-white/10 hover:text-foreground" 
                        : "bg-emerald-500 text-[#0A0F1E] shadow-xl shadow-emerald-500/10 hover:bg-emerald-400"
                    )}
                  >
                    {job.advance_paid ? 'Revert to Unpaid' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Milestone 2: Remaining */}
          <div className={cn(
            "p-6 rounded-2xl border transition-all",
            job.remaining_paid ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/5 border-border"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Final Balance</h4>
                <p className="text-2xl font-mono font-bold text-foreground mt-1">
                  {(job.total_fee - (job.advance_paid ? job.advance_due_amount : 0)).toLocaleString()} 
                  <span className="text-xs font-normal text-muted-foreground"> OMR</span>
                </p>
              </div>
              {job.remaining_paid ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Check size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30 animate-pulse">
                  <Clock size={16} />
                </div>
              )}
            </div>

            {job.remaining_receipt_url && (
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-border group w-full">
                  <FileText size={14} className="text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">Receipt Attached</span>
                  <a href={job.remaining_receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:text-foreground transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
                <InvoiceButton job={job} type="remaining" className="w-full sm:w-auto" />
              </div>
            )}

            {isStaff && (
              <div className="space-y-3">
                {uploadingFor === 'remaining' ? (
                  <div className="p-4 bg-black/20 rounded-xl border border-dashed border-border space-y-4">
                    <p className="text-[10px] text-muted-foreground/60 uppercase font-bold mb-2">Verify Final Amount</p>
                    <div className="space-y-2">
                       <label className="text-[10px] text-muted-foreground">Actual OMR Received:</label>
                       <input 
                         type="number" 
                         value={customAmount}
                         onChange={(e) => setCustomAmount(Number(e.target.value))}
                         className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-sm focus:border-gold outline-none"
                       />
                    </div>
                    <button 
                      onClick={() => handleTogglePaid('remaining', false, undefined, customAmount)}
                      className="w-full py-2.5 bg-emerald-500 text-[#0A0F1E] text-xs font-bold rounded-lg hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                    >
                      Confirm Final Settlement
                    </button>
                    <button onClick={() => setUploadingFor(null)} className="w-full mt-2 text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors">Cancel Verification</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => job.remaining_paid ? handleTogglePaid('remaining', true) : openVerification('remaining')}
                    disabled={isPending}
                    className={cn(
                      "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                      job.remaining_paid 
                        ? "bg-white/5 text-muted-foreground/60 border border-border hover:bg-white/10 hover:text-foreground" 
                        : "bg-emerald-500 text-[#0A0F1E] shadow-xl shadow-emerald-500/10 hover:bg-emerald-400"
                    )}
                  >
                    {job.remaining_paid ? 'Revert to Unpaid' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            )}
          </div>
      </div>

    </div>
  );
};

export default FinancialsTab;
