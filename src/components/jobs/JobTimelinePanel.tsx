import { Clock, Shield, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useJobTimeline } from '../../hooks/employee/useTimeline';
import WorkflowProgressTab from './WorkflowProgressTab';

interface Props {
  jobId: string;
  job: any;
  steps: any[];
  isEmployee: boolean;
  isAdmin?: boolean;
  onSwitchTab?: (tab: any) => void;
}

export const JobTimelinePanel = ({ jobId, job, steps, isEmployee, isAdmin, onSwitchTab }: Props) => {
  const { data: timeline = [], isLoading } = useJobTimeline(jobId);

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12 animate-pulse text-sm">Loading timeline...</div>;
  }

  // 1. Convert timeline entries to a unified format
  const unifiedEntries: any[] = timeline.map((entry: any) => ({
    id: entry.id,
    type: 'timeline',
    timestamp: new Date(entry.changed_at),
    data: entry
  }));

  // 2. Add advance payment event if paid
  if (job?.advance_paid && job?.advance_paid_at) {
    unifiedEntries.push({
      id: `advance-payment-${job.id}`,
      type: 'financial',
      timestamp: new Date(job.advance_paid_at),
      data: {
        title: 'Advance Payment Confirmed',
        description: `Advance deposit of ${Number(job.advance_due_amount || 0).toFixed(3)} OMR confirmed successfully.`,
        amount: job.advance_due_amount
      }
    });
  }

  // 3. Add remaining balance payment event if paid
  if (job?.remaining_paid && job?.remaining_paid_at) {
    unifiedEntries.push({
      id: `remaining-payment-${job.id}`,
      type: 'financial',
      timestamp: new Date(job.remaining_paid_at),
      data: {
        title: 'Final Payment Confirmed',
        description: `Final balance of ${Number(job.remaining_due_amount || 0).toFixed(3)} OMR confirmed successfully.`,
        amount: job.remaining_due_amount
      }
    });
  }

  // 4. Sort all entries chronologically (oldest first to tell the story of the project progress)
  const sortedEntries = unifiedEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Render Timeline Checklist & Log List
  const renderTimelineLogs = () => {
    if (sortedEntries.length === 0) {
      return (
        <div className="text-center border-2 border-dashed border-border rounded-3xl p-12 bg-card/20">
          <Clock size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-foreground mb-1">No timeline events yet</p>
          <p className="text-xs text-muted-foreground">Status updates and assignments will appear here.</p>
        </div>
      );
    }

    return (
      <div className="relative pl-6 border-l border-border/60 space-y-8">
        {sortedEntries.map((entry) => {
          if (entry.type === 'financial') {
            return (
              <div key={entry.id} className="relative group">
                {/* Green dot for financial deposit */}
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ring-4 ring-background transition-all bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {format(entry.timestamp, 'MMM d, yyyy · h:mm a')}
                    </span>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5">
                      <DollarSign size={8} /> Deposit
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-emerald-400">
                      {entry.data.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {entry.data.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          const tEntry = entry.data;
          const isDelay = tEntry.is_delay_event || tEntry.to_status === 'on_hold';
          const isApprove = tEntry.to_status === 'gov_approved' || tEntry.to_status === 'completed';
          const isReject = tEntry.to_status === 'gov_rejected' || tEntry.to_status === 'cancelled';

          return (
            <div key={entry.id} className="relative group">
              {/* Dot indicator */}
              <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ring-4 ring-background transition-all ${
                isDelay ? 'bg-yellow-400' :
                isApprove ? 'bg-emerald-500' :
                isReject ? 'bg-red-500' : 'bg-primary'
              }`} />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    {format(entry.timestamp, 'MMM d, yyyy · h:mm a')}
                  </span>
                  {tEntry.days_in_previous_stage !== null && tEntry.days_in_previous_stage > 0 && (
                    <span className="text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded">
                      Spent {tEntry.days_in_previous_stage} days in previous stage
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-foreground">
                    Status changed to <span className={
                      isDelay ? 'text-yellow-400' :
                      isApprove ? 'text-emerald-500' :
                      isReject ? 'text-red-500' : 'text-primary'
                    }>{tEntry.to_status.replace('_', ' ').toUpperCase()}</span>
                  </p>
                  {tEntry.changed_by_name && (
                    <p className="text-xs text-muted-foreground font-semibold">
                      by {tEntry.changed_by_name} ({tEntry.changed_by_role})
                    </p>
                  )}
                </div>

                {tEntry.reason && (
                  <div className={`text-xs p-3 rounded-xl border ${
                    isDelay ? 'bg-yellow-400/5 border-yellow-400/20 text-yellow-400/95' :
                    isReject ? 'bg-red-500/5 border-red-500/20 text-red-400/95' :
                    'bg-muted/10 border-border text-muted-foreground'
                  }`}>
                    {isDelay && <p className="font-bold text-[9px] uppercase tracking-widest mb-0.5">Delay Reason</p>}
                    {isReject && <p className="font-bold text-[9px] uppercase tracking-widest mb-0.5">Rejection/Cancellation Reason</p>}
                    {tEntry.reason}
                    {tEntry.is_client_caused && (
                      <span className="ml-2 bg-red-400/10 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Client Caused</span>
                    )}
                  </div>
                )}

                {tEntry.government_ref && (
                  <p className="text-xs text-cyan-400 font-mono">
                    Gov Ref: {tEntry.government_ref}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const hasSteps = steps && steps.length > 0;
  
  const overdueStep = steps?.find((s: any) => {
    if (s.status !== 'in_progress' && s.status !== 'pending') return false;
    if (!s.deadline) return false;
    return new Date(s.deadline).getTime() < Date.now();
  });

  if (hasSteps) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Milestones sequence checklist */}
        <div className="flex-1 min-w-0 w-full">
          <WorkflowProgressTab job={job} steps={steps} isEmployee={isEmployee} isAdmin={isAdmin} onSwitchTab={onSwitchTab} />
        </div>

        {/* Right Column: Execution Timeline history log */}
        <div className="w-full lg:w-[420px] shrink-0 bg-card border border-border rounded-[32px] p-6 md:p-8 shadow-2xl h-fit">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1 font-syne">Execution Timeline</h3>
            <p className="text-xs text-muted-foreground">Historical trail of status changes, reassignments, and payments</p>
          </div>
          {overdueStep && (
            <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs flex gap-2.5 items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="font-bold">Execution Delayed</p>
                <p className="opacity-80 mt-0.5">Milestone step "{overdueStep.name_en}" has exceeded its expected deadline.</p>
              </div>
            </div>
          )}
          {renderTimelineLogs()}
        </div>
      </div>
    );
  }

  // Full width fallback when there are no roadmap steps
  return (
    <div className="bg-card border border-border rounded-[32px] p-6 md:p-8 shadow-2xl max-w-3xl">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-1 font-syne">Execution Timeline</h3>
        <p className="text-xs text-muted-foreground">Historical trail of status changes, reassignments, and payments</p>
      </div>
      {renderTimelineLogs()}
    </div>
  );
};
export default JobTimelinePanel;
