import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useMyOpsTasks, useUpdateServiceStatus, type StatusUpdatePayload } from '../../hooks/employee/useTimeline';
import { useUploadMultipleServiceDocuments, useDeleteJobServiceDocument } from '../../hooks/employee/useJobServices';
import {
  Clock, CheckCircle2, AlertCircle, Shield, ExternalLink,
  ChevronRight, ChevronDown, X, FileText, Phone, Building2, Calendar,
  Layers, Users, Info, Upload, Download, Eye, Trash2, Paperclip, Loader2,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { differenceInDays, format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// ─── Status Config ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'text-white/50', bg: 'bg-white/5 border-white/10' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  { value: 'applied', label: 'Applied', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
  { value: 'assigned_to_pro', label: 'Assign to PRO', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  { value: 'gov_approved', label: 'Govt Approved', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  { value: 'gov_rejected', label: 'Govt Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { value: 'on_hold', label: 'On Hold', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
];

const getStatusConfig = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

// ─── Deadline Badge ────────────────────────────────────────────────────────────

const DeadlineBadge = ({ dateStr }: { dateStr: string | null }) => {
  if (!dateStr) return null;
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return (
    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
      <AlertCircle size={9} /> {Math.abs(days)}d overdue
    </span>
  );
  if (days <= 2) return (
    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
      <Clock size={9} /> {days}d left
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400/70 bg-emerald-400/5 px-2 py-0.5 rounded-full border border-emerald-400/10">
      <Calendar size={9} /> {format(parseISO(dateStr), 'MMM d')}
    </span>
  );
};

// ─── Status Update Bottom Sheet ───────────────────────────────────────────────

const StatusUpdateSheet = ({
  task,
  onClose,
  onSuccess,
}: {
  task: any;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { profile } = useAuth();
  const [newStatus, setNewStatus] = useState(task.status);
  const [reason, setReason] = useState('');
  const [govRef, setGovRef] = useState('');
  const [applicantName, setApplicantName] = useState(task.applicant_name || '');
  const [isClientCaused, setIsClientCaused] = useState(false);
  const [proId, setProId] = useState(task.pro_id || '');
  const [proNotes, setProNotes] = useState(task.pro_notes || '');
  const [pros, setPros] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { mutateAsync: updateStatus, isPending } = useUpdateServiceStatus();
  const uploadMutation = useUploadMultipleServiceDocuments();

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role, is_pro, can_do_ops')
      .eq('role', 'employee')
      .then(({ data }) => {
        if (data) {
          const filtered = data.filter(e => e.role === 'pro' || e.is_pro);
          setPros(filtered);
        }
      });
  }, []);

  const needsReason = newStatus === 'on_hold' || newStatus === 'cancelled';
  const needsGovRef = newStatus === 'gov_approved' || newStatus === 'gov_rejected';
  const needsPro = newStatus === 'assigned_to_pro';
  const isDelay = newStatus === 'on_hold';

  const canSave = newStatus !== task.status &&
    (!needsReason || reason.trim().length > 0) &&
    (!needsPro || proId !== '');

  const handleSave = async () => {
    try {
      // 1. Upload files first if selected
      if (selectedFiles.length > 0 && profile) {
        const filesArray = selectedFiles.map(file => ({
          file,
          category: 'output' as const
        }));
        await uploadMutation.mutateAsync({
          jobServiceId: task.id,
          jobId: task.job_id,
          uploadedBy: profile.id,
          files: filesArray
        });
      }

      // 2. Perform status update
      const payload: StatusUpdatePayload = {
        jobServiceId: task.id,
        jobId: task.job_id,
        fromStatus: task.status,
        toStatus: newStatus,
        reason: reason || undefined,
        governmentRef: govRef || undefined,
        isDelayEvent: isDelay,
        isClientCaused,
        applicantName: applicantName || undefined,
        holdReason: newStatus === 'on_hold' ? reason : undefined,
        rejectionReason: newStatus === 'gov_rejected' ? reason : undefined,
        proId: newStatus === 'assigned_to_pro' ? proId : undefined,
        proNotes: newStatus === 'assigned_to_pro' ? proNotes : undefined,
      };
      await updateStatus(payload);
      toast.success('Status updated');
      onSuccess();
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
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {task.service?.name_en || task.service_name}
              {task.quantity > 1 ? ` · #${task.item_number}` : ''}
            </p>
            <h3 className="font-syne font-bold text-foreground mt-0.5">
              {task.applicant_name || `Applicant ${task.item_number}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Applicant name */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
              Applicant Name
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={e => setApplicantName(e.target.value)}
              placeholder="Enter applicant name..."
              className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
            />
          </div>

          {/* Status grid */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
              Update Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewStatus(opt.value)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left ${newStatus === opt.value
                    ? `${opt.bg} ${opt.color} border-current`
                    : 'border-border bg-muted/10 text-muted-foreground hover:border-primary/30'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* On Hold: reason required */}
          <AnimatePresence>
            {newStatus === 'on_hold' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                <label className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1 block">
                  <AlertCircle size={10} /> Delay Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder="What is causing the delay? (required)"
                  className="w-full bg-muted/30 border border-yellow-400/30 focus:border-yellow-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isClientCaused}
                    onChange={e => setIsClientCaused(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Delay caused by client (not ops)</span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancelled: reason required */}
          <AnimatePresence>
            {newStatus === 'cancelled' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1 block">
                  <AlertCircle size={10} /> Cancellation Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this service being cancelled? (required)"
                  className="w-full bg-muted/30 border border-red-400/30 focus:border-red-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRO assignment */}
          <AnimatePresence>
            {newStatus === 'assigned_to_pro' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1 block">
                    <Shield size={10} className="text-amber-400" /> PRO Agent *
                  </label>
                  <select
                    value={proId}
                    onChange={(e) => setProId(e.target.value)}
                    className="w-full bg-muted/30 border border-amber-400/30 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
                  >
                    <option value="">Select PRO Agent...</option>
                    {pros.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">PRO Instructions</label>
                  <textarea
                    value={proNotes}
                    onChange={(e) => setProNotes(e.target.value)}
                    rows={2}
                    placeholder="Special instructions for PRO agent..."
                    className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gov Approved/Rejected: ref number */}
          <AnimatePresence>
            {needsGovRef && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Government Reference No.
                </label>
                <input
                  type="text"
                  value={govRef}
                  onChange={e => setGovRef(e.target.value)}
                  placeholder="e.g. MOL/2025/12345"
                  className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
                />
                {newStatus === 'gov_rejected' && (
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    placeholder="Rejection reason..."
                    className="w-full mt-2 bg-muted/30 border border-red-400/30 focus:border-red-400 rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Output Documents on Completion / Approval */}
          <AnimatePresence>
            {(newStatus === 'gov_approved' || newStatus === 'completed') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 pt-2 border-t border-border/40">
                <label className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center justify-between">
                  <span>📎 Attach Deliverable Documents (Optional)</span>
                  {selectedFiles.length > 0 && (
                    <span className="text-[8px] text-emerald-400 font-bold">{selectedFiles.length} file(s) selected</span>
                  )}
                </label>

                {/* List of selected files to upload */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 border border-border/30 rounded-xl text-[10px] text-foreground font-mono">
                        <span className="truncate flex-1 pr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-500 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dashed file selector */}
                <div className="relative border border-dashed border-border hover:border-primary/40 rounded-xl p-3.5 text-center transition-all bg-card/25 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        setSelectedFiles(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground">
                    <Upload size={12} />
                    <span className="text-[9px] font-bold uppercase">Select Deliverable files...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl transition-all text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isPending}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-sm disabled:opacity-40"
          >
            {isPending ? 'Saving...' : 'Save Status'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TaskRow = ({ task, onUpdate }: { task: any; onUpdate: () => void }) => {
  const [showSheet, setShowSheet] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { profile } = useAuth();

  const uploadMutation = useUploadMultipleServiceDocuments();
  const deleteMutation = useDeleteJobServiceDocument();

  const cfg = getStatusConfig(task.status);
  const assignedByName = task.assigner?.full_name || task.job?.assigned_by_profile?.full_name;

  const docs = task.documents || [];
  const inputs = docs.filter((d: any) => d.document_category !== 'output');
  const outputs = docs.filter((d: any) => d.document_category === 'output');

  const handleDownloadDoc = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handleViewDoc = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      toast.error('Could not generate view link');
    }
  };

  const handleDeleteDoc = async (docId: string, filePath: string | null) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteMutation.mutateAsync({ id: docId, filePath });
      toast.success('Document deleted');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleUploadSingleDoc = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.job_id}/${task.id}/${Date.now()}_${docId}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('job_service_documents')
        .update({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: profile.id,
          upload_source: 'ops',
          status: 'approved',
          created_at: new Date().toISOString()
        } as any)
        .eq('id', docId);

      if (dbError) throw dbError;
      toast.success('Document uploaded successfully!');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadMultipleDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !profile) return;

    setIsUploading(true);
    try {
      const filesArray = Array.from(files).map(file => ({
        file,
        category: 'output' as const
      }));

      await uploadMutation.mutateAsync({
        jobServiceId: task.id,
        jobId: task.job_id,
        uploadedBy: profile.id,
        files: filesArray
      });

      toast.success(`Successfully uploaded ${files.length} document(s)`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#111726]/40 border border-border/40 rounded-xl overflow-hidden hover:border-primary/20 transition-all">
      {/* Top compact row */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#111726]/80 transition-all"
        onClick={() => setShowDocs(!showDocs)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            {task.service?.requires_pro && (
              <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-400/20 animate-pulse">
                <Shield size={8} /> PRO
              </span>
            )}
            <DeadlineBadge dateStr={task.target_completion_date} />
          </div>

          <h4 className="text-xs font-bold text-foreground truncate">
            {task.service_name || task.service?.name_en}
            {task.quantity > 1 && (
              <span className="text-muted-foreground font-normal text-[10px] ml-1">· #{task.item_number}</span>
            )}
          </h4>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            Applicant: <span className="text-foreground/80 font-medium">{task.applicant_name || <span className="italic opacity-55">No name set</span>}</span>
          </p>
          {outputs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {outputs.map((doc: any) => (
                <button
                  key={doc.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDoc(doc);
                  }}
                  className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg hover:bg-emerald-500/20 transition-all"
                  title="View Deliverable (Proof of Work)"
                >
                  <Check size={8} /> {doc.document_name || doc.file_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSheet(true);
              }}
              className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-all border border-primary/25"
            >
              Update
            </button>
          )}
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground">
            {showDocs ? 'Close' : 'Files'}
          </span>
        </div>
      </div>

      {/* Detail notes */}
      {task.notes && (
        <div className="px-4 pb-2 text-[10px] text-muted-foreground border-t border-border/10 pt-2 bg-[#0F1422]/20">
          <span className="font-bold text-foreground">Notes:</span> {task.notes}
        </div>
      )}

      {/* Handoff banner inside row if forwarded */}
      {task.acceptance_status === 'pending_acceptance' && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20 flex items-center justify-between text-[10px] text-yellow-400">
          <span>⚠️ Pending Acceptance Confirm</span>
          <span className="font-bold">Wait for accept</span>
        </div>
      )}

      {/* Collapsible Documents Section */}
      <AnimatePresence>
        {showDocs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/20 bg-muted/5 px-4 py-3 space-y-4 overflow-hidden"
          >
            {/* Inputs Checklist */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                📥 Input Documents (Customer Copy)
              </p>
              <div className="space-y-1">
                {inputs.map((doc: any) => {
                  const hasFile = !!doc.file_path;
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-[#0F1422]/40 border border-border/20 rounded-lg text-[10px]">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-foreground truncate">{doc.document_name}</p>
                        {hasFile ? (
                          <p className="text-[8px] text-emerald-400 font-bold truncate">✓ {doc.file_name}</p>
                        ) : (
                          <p className="text-[8px] text-muted-foreground/60 italic">Not Uploaded</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {hasFile ? (
                          <>
                            <button onClick={() => handleViewDoc(doc)} className="p-1 bg-muted hover:bg-muted/70 text-muted-foreground rounded transition-colors" title="View"><Eye size={10} /></button>
                            <button onClick={() => handleDownloadDoc(doc)} className="p-1 bg-muted hover:bg-muted/70 text-muted-foreground rounded transition-colors" title="Download"><Download size={10} /></button>
                          </>
                        ) : (
                          <div className="relative">
                            <input type="file" onChange={(e) => handleUploadSingleDoc(e, doc.id)} className="hidden" id={`card-upload-${doc.id}`} />
                            <label htmlFor={`card-upload-${doc.id}`} className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[8px] font-bold uppercase rounded cursor-pointer transition-colors block">
                              Upload
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {inputs.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/60 italic">No input document requirements set.</p>
                )}
              </div>
            </div>

            {/* Outputs List (Deliverables) */}
            <div className="space-y-1.5 pt-2 border-t border-border/20">
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center justify-between">
                <span>📤 Deliverables (Work Outputs)</span>
                <span className="text-[8px] font-normal text-muted-foreground italic">Add files</span>
              </p>

              <div className="space-y-1">
                {outputs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 bg-[#0F1422]/40 border border-border/20 rounded-lg text-[10px]">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-foreground truncate">{doc.document_name}</p>
                      <p className="text-[8px] text-emerald-400 font-bold truncate">✓ {doc.file_name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleViewDoc(doc)} className="p-1 bg-muted hover:bg-muted/70 text-muted-foreground rounded transition-colors" title="View"><Eye size={10} /></button>
                      <button onClick={() => handleDownloadDoc(doc)} className="p-1 bg-muted hover:bg-muted/70 text-muted-foreground rounded transition-colors" title="Download"><Download size={10} /></button>
                      <button onClick={() => handleDeleteDoc(doc.id, doc.file_path)} className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition-colors" title="Delete"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}

                {/* Multi-file uploader input */}
                <div className="relative border border-dashed border-border hover:border-primary/40 rounded-xl p-2.5 text-center transition-all bg-card/25 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleUploadMultipleDocs}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <div className="flex items-center justify-center gap-1.5">
                    {isUploading ? (
                      <>
                        <Loader2 size={11} className="animate-spin text-primary" />
                        <span className="text-[8px] font-bold text-primary uppercase">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={11} className="text-muted-foreground" />
                        <span className="text-[8px] font-bold text-foreground uppercase">Upload Files</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSheet && (
          <StatusUpdateSheet
            task={task}
            onClose={() => setShowSheet(false)}
            onSuccess={() => {
              setShowSheet(false);
              onUpdate();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const GroupedJobCard = ({ group, onUpdate }: { group: any; onUpdate: () => void }) => {
  const navigate = useNavigate();

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!group.clientPhone) return;
    const cleaned = group.clientPhone.replace(/\D/g, '');
    const number = cleaned.startsWith('968') ? cleaned : `968${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-all p-4 space-y-4 shadow-sm"
    >
      {/* Group Header: Client Context */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {group.clientName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground leading-tight">{group.clientName}</h3>
              <span className="text-[8px] font-bold font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/30">
                {group.jobCode}
              </span>
            </div>
            {group.assignedByName && (
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Assigned by: <span className="text-foreground/70">{group.assignedByName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {group.clientPhone && (
            <button
              onClick={handleWhatsApp}
              title="WhatsApp Client"
              className="w-7.5 h-7.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-500 transition-colors border border-emerald-500/10"
            >
              <Phone size={13} />
            </button>
          )}
          <button
            onClick={() => navigate(`/employee/tasks?jobId=${group.jobId}`)}
            title="View Full Job Folder"
            className="w-7.5 h-7.5 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors border border-border/50"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* Services List inside the Job */}
      <div className="space-y-2">
        {group.services.map((task: any) => (
          <TaskRow key={task.id} task={task} onUpdate={onUpdate} />
        ))}
      </div>
    </motion.div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'urgent' | 'on_hold' | 'completed';

const MyTasks: React.FC = () => {
  const { profile } = useAuth();
  const { data: tasks = [], isLoading, refetch } = useMyOpsTasks(profile?.id || null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const now = new Date();

  const acceptedTasks = tasks;

  const urgent = acceptedTasks.filter(t => {
    if (!t.target_completion_date) return false;
    const days = differenceInDays(parseISO(t.target_completion_date), now);
    return days <= 2 && t.status !== 'completed' && t.status !== 'cancelled';
  });

  const onHold = acceptedTasks.filter(t => t.status === 'on_hold');
  const done = acceptedTasks.filter(t => t.status === 'completed' || t.status === 'cancelled');
  const active = acceptedTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

  const getDisplayTasks = () => {
    switch (filter) {
      case 'urgent': return urgent;
      case 'on_hold': return onHold;
      case 'completed': return done;
      default: return active;
    }
  };

  const displayTasks = getDisplayTasks();

  // Group active tasks by deadline urgency
  const overdue = active.filter(t => {
    if (!t.target_completion_date) return false;
    return differenceInDays(parseISO(t.target_completion_date), now) < 0;
  });
  const soonDue = active.filter(t => {
    if (!t.target_completion_date) return false;
    const days = differenceInDays(parseISO(t.target_completion_date), now);
    return days >= 0 && days <= 2;
  });
  const onTrack = active.filter(t => {
    if (!t.target_completion_date) return true;
    return differenceInDays(parseISO(t.target_completion_date), now) > 2;
  });

  const groupTasksByJob = (taskList: any[]) => {
    const groups: Record<string, {
      jobId: string;
      jobCode: string;
      clientName: string;
      clientPhone?: string;
      assignedByName?: string;
      services: any[];
    }> = {};

    taskList.forEach(task => {
      const jobId = task.job_id;
      if (!groups[jobId]) {
        groups[jobId] = {
          jobId,
          jobCode: task.job?.job_code || '',
          clientName: task.job?.client?.full_name || 'Unknown Client',
          clientPhone: task.job?.client?.phone,
          assignedByName: task.assigner?.full_name || task.job?.assigned_by_profile?.full_name,
          services: []
        };
      }
      groups[jobId].services.push(task);
    });

    return Object.values(groups);
  };

  const FILTER_TABS: { key: FilterTab; label: string; count: number; color?: string }[] = [
    { key: 'all', label: 'My Work', count: active.length },
    { key: 'urgent', label: 'Urgent', count: urgent.length, color: 'text-yellow-400' },
    { key: 'on_hold', label: 'On Hold', count: onHold.length, color: 'text-red-400' },
    { key: 'completed', label: 'Done', count: done.length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-foreground">My Work</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active.length} active task{active.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
        {urgent.length > 0 && (
          <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 px-3 py-1.5 rounded-xl text-xs font-bold">
            <AlertCircle size={12} /> {urgent.length} Urgent
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${filter === tab.key
              ? 'bg-card border border-border text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted/50'
                } ${tab.color || ''}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>


      {/* Task Lists */}
      {filter === 'all' ? (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={11} /> Overdue — {overdue.length}
              </p>
              {groupTasksByJob(overdue).map(group => <GroupedJobCard key={group.jobId} group={group} onUpdate={refetch} />)}
            </div>
          )}

          {/* Due soon */}
          {soonDue.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={11} /> Due Soon — {soonDue.length}
              </p>
              {groupTasksByJob(soonDue).map(group => <GroupedJobCard key={group.jobId} group={group} onUpdate={refetch} />)}
            </div>
          )}

          {/* On track */}
          {onTrack.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={11} /> In Progress — {onTrack.length}
              </p>
              {groupTasksByJob(onTrack).map(group => <GroupedJobCard key={group.jobId} group={group} onUpdate={refetch} />)}
            </div>
          )}

          {active.length === 0 && (
            <div className="text-center border-2 border-dashed border-border rounded-3xl py-16">
              <Layers size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-foreground mb-1">No active tasks</p>
              <p className="text-xs text-muted-foreground">Tasks assigned to you will appear here.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayTasks.length === 0 ? (
            <div className="text-center border-2 border-dashed border-border rounded-3xl py-12">
              <p className="text-sm text-muted-foreground">No tasks in this category</p>
            </div>
          ) : (
            groupTasksByJob(displayTasks).map(group => <GroupedJobCard key={group.jobId} group={group} onUpdate={refetch} />)
          )}
        </div>
      )}
    </div>
  );
};

export default MyTasks;
