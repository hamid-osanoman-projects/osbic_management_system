import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useProQueue, useUpdateServiceStatus, type StatusUpdatePayload } from '../../hooks/employee/useTimeline';
import { Shield, X, CheckCircle2, XCircle, Clock, Phone, FileText, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// ─── PRO Action Sheet ─────────────────────────────────────────────────────────

const ProActionSheet = ({
  task,
  onClose,
}: {
  task: any;
  onClose: () => void;
}) => {
  const [action, setAction] = useState<'approved' | 'rejected' | 'delayed' | null>(null);
  const [govRef, setGovRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [newExpectedDate, setNewExpectedDate] = useState('');
  const { mutateAsync: updateStatus, isPending } = useUpdateServiceStatus();

  const canSave = action !== null && (
    (action === 'approved') ||
    (action === 'rejected' && rejectionReason.trim().length > 0) ||
    (action === 'delayed' && delayReason.trim().length > 0)
  );

  const handleSave = async () => {
    if (!action) return;
    try {
      const toStatus = action === 'approved' ? 'gov_approved' :
                       action === 'rejected' ? 'gov_rejected' : 'on_hold';

      const payload: StatusUpdatePayload = {
        jobServiceId: task.id,
        jobId: task.job_id,
        fromStatus: task.status,
        toStatus,
        governmentRef: govRef || undefined,
        rejectionReason: action === 'rejected' ? rejectionReason : undefined,
        holdReason: action === 'delayed' ? delayReason : undefined,
        reason: action === 'delayed' ? delayReason : action === 'rejected' ? rejectionReason : undefined,
        isDelayEvent: action === 'delayed',
      };
      await updateStatus(payload);
      toast.success(
        action === 'approved' ? '✅ Marked as Govt Approved' :
        action === 'rejected' ? '❌ Marked as Rejected' : '⏳ Delay recorded'
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Shield size={10} /> PRO Update
            </p>
            <h3 className="font-syne font-bold text-foreground mt-0.5">
              {task.service_name} · {task.applicant_name || `#${task.item_number}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* PRO Notes from ops */}
          {task.pro_notes && (
            <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Ops Instructions</p>
              <p className="text-xs text-foreground">{task.pro_notes}</p>
            </div>
          )}

          {/* 3 big action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setAction('approved')}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                action === 'approved'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                  : 'border-border bg-muted/10 text-muted-foreground hover:border-emerald-500/40'
              }`}
            >
              <CheckCircle2 size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Approved</span>
            </button>
            <button
              onClick={() => setAction('rejected')}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                action === 'rejected'
                  ? 'border-red-500 bg-red-500/10 text-red-500'
                  : 'border-border bg-muted/10 text-muted-foreground hover:border-red-500/40'
              }`}
            >
              <XCircle size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Rejected</span>
            </button>
            <button
              onClick={() => setAction('delayed')}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                action === 'delayed'
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                  : 'border-border bg-muted/10 text-muted-foreground hover:border-yellow-400/40'
              }`}
            >
              <Clock size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Delayed</span>
            </button>
          </div>

          {/* Approved: gov ref */}
          <AnimatePresence>
            {action === 'approved' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">Government Reference No.</label>
                <input
                  type="text"
                  value={govRef}
                  onChange={e => setGovRef(e.target.value)}
                  placeholder="e.g. MOL/2025/12345"
                  className="w-full bg-muted/30 border border-border focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rejected: reason */}
          <AnimatePresence>
            {action === 'rejected' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest block">Rejection Reason *</label>
                <input
                  type="text"
                  value={govRef}
                  onChange={e => setGovRef(e.target.value)}
                  placeholder="Gov reference (optional)"
                  className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-4 py-2 text-sm text-foreground outline-none transition-all mb-2"
                />
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={2}
                  placeholder="Why was it rejected? (required)"
                  className="w-full bg-muted/30 border border-red-400/30 focus:border-red-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delayed: reason + new expected date */}
          <AnimatePresence>
            {action === 'delayed' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest block">Delay Reason *</label>
                  <textarea
                    value={delayReason}
                    onChange={e => setDelayReason(e.target.value)}
                    rows={2}
                    placeholder="Why is this delayed? (required)"
                    className="w-full bg-muted/30 border border-yellow-400/30 focus:border-yellow-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">New Expected Date</label>
                  <input
                    type="date"
                    value={newExpectedDate}
                    onChange={e => setNewExpectedDate(e.target.value)}
                    className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isPending}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-sm disabled:opacity-40"
          >
            {isPending ? 'Saving...' : 'Confirm Update'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── PRO Task Card ─────────────────────────────────────────────────────────────

const ProCard = ({ task }: { task: any }) => {
  const [showSheet, setShowSheet] = useState(false);
  const clientName = task.job?.client?.full_name || 'Unknown';
  const clientPhone = task.job?.client?.phone;

  const handleWhatsApp = () => {
    if (!clientPhone) return;
    const cleaned = clientPhone.replace(/\D/g, '');
    const number = cleaned.startsWith('968') ? cleaned : `968${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-amber-400/20 rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Shield size={9} /> PRO Assignment
              </p>
              <p className="font-syne font-bold text-foreground mt-0.5">
                {task.service_name}
              </p>
              <p className="text-sm text-foreground/80">
                {task.applicant_name || `Applicant #${task.item_number}`}
              </p>
            </div>
            {task.status === 'assigned_to_pro' ? (
              <button
                onClick={() => setShowSheet(true)}
                className="shrink-0 px-3 py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-400/20 transition-all flex items-center gap-1"
              >
                Update <ChevronRight size={12} />
              </button>
            ) : (
              <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                task.status === 'gov_approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                task.status === 'gov_rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                task.status === 'on_hold' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-muted border-border text-muted-foreground'
              }`}>
                {task.status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* PRO instructions */}
          {task.pro_notes && (
            <div className="bg-amber-400/5 border border-amber-400/10 rounded-xl px-3 py-2 mb-3">
              <p className="text-[10px] text-amber-400/80 font-medium">{task.pro_notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{clientName} · {task.job?.job_code}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {task.pro_shared_at && (
                <span className="text-[9px] text-muted-foreground">
                  Shared {format(parseISO(task.pro_shared_at), 'MMM d')}
                </span>
              )}
              {clientPhone && (
                <button
                  onClick={handleWhatsApp}
                  className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center transition-colors"
                >
                  <Phone size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showSheet && <ProActionSheet task={task} onClose={() => setShowSheet(false)} />}
      </AnimatePresence>
    </>
  );
};

// ─── Main PRO Queue Page ───────────────────────────────────────────────────────

const ProQueue: React.FC = () => {
  const { profile } = useAuth();
  const { data: tasks = [], isLoading } = useProQueue(profile?.id || null);
  const [filter, setFilter] = useState<'active' | 'history'>('active');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const activeTasks = tasks.filter((t: any) => t.status === 'assigned_to_pro');
  const doneTasks = tasks.filter((t: any) => t.status !== 'assigned_to_pro');
  const displayedTasks = filter === 'active' ? activeTasks : doneTasks;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield size={22} className="text-amber-400" /> PRO Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl">
        <button
          onClick={() => setFilter('active')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            filter === 'active'
              ? 'bg-card border border-border text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Queue
          {activeTasks.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
              {activeTasks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('done')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
            filter === 'done'
              ? 'bg-card border border-border text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          History
          {doneTasks.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
              {doneTasks.length}
            </span>
          )}
        </button>
      </div>

      {displayedTasks.length === 0 ? (
        <div className="text-center border-2 border-dashed border-border rounded-3xl py-16">
          <Shield size={32} className="text-muted-foreground/35 mx-auto mb-3" />
          <p className="font-bold text-foreground mb-1">
            {filter === 'active' ? 'No active PRO assignments' : 'No history found'}
          </p>
          <p className="text-xs text-muted-foreground">
            {filter === 'active' 
              ? 'Items assigned to you by ops will appear here.' 
              : 'Completed tasks will be archived in this view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map(t => <ProCard key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
};

export default ProQueue;
