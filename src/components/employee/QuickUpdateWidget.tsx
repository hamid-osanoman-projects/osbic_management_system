import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useMyOpsTasks, useUpdateServiceStatus } from '../../hooks/employee/useTimeline';
import { useUploadMultipleServiceDocuments } from '../../hooks/employee/useJobServices';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, X, Check, Loader2, Upload, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'applied', label: 'Applied' },
  { value: 'assigned_to_pro', label: 'Assign to PRO' },
  { value: 'gov_approved', label: 'Govt Approved' },
  { value: 'gov_rejected', label: 'Govt Rejected' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const QuickUpdateWidget = () => {
  const { profile } = useAuth();
  const { data: tasks = [], refetch } = useMyOpsTasks(profile?.id || null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  
  const [newStatus, setNewStatus] = useState('');
  const [govRef, setGovRef] = useState('');
  const [reason, setReason] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [pros, setPros] = useState<any[]>([]);
  const [proId, setProId] = useState('');
  const [proNotes, setProNotes] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  
  const updateStatusMutation = useUpdateServiceStatus();
  const uploadDocumentsMutation = useUploadMultipleServiceDocuments();

  // Close widget if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Fetch PROs list
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role, is_pro')
      .eq('role', 'employee')
      .then(({ data }) => {
        if (data) {
          setPros(data.filter((e: any) => e.role === 'pro' || e.is_pro));
        }
      });
  }, []);

  // Set default values when task is selected
  useEffect(() => {
    if (selectedTask) {
      setNewStatus(selectedTask.status);
      setGovRef(selectedTask.government_ref || '');
      setReason('');
      setSelectedFiles([]);
      setProId(selectedTask.pro_id || '');
      setProNotes(selectedTask.pro_notes || '');
    }
  }, [selectedTask]);

  // Filter accepted tasks matching search query
  const activeTasks = tasks.filter((t: any) => 
    t.acceptance_status === 'accepted' && 
    t.status !== 'completed' && 
    t.status !== 'cancelled'
  );

  const filteredTasks = activeTasks.filter((t: any) => {
    const query = searchQuery.toLowerCase();
    const serviceName = (t.service_name || t.service?.name_en || '').toLowerCase();
    const applicant = (t.applicant_name || '').toLowerCase();
    const jobCode = (t.job?.job_code || '').toLowerCase();
    return serviceName.includes(query) || applicant.includes(query) || jobCode.includes(query);
  });

  const handleSave = async () => {
    if (!selectedTask || !profile) return;
    setIsUpdating(true);

    try {
      // 1. Upload files first if selected
      if (selectedFiles.length > 0) {
        const filesArray = selectedFiles.map(file => ({
          file,
          category: 'output' as const
        }));
        await uploadDocumentsMutation.mutateAsync({
          jobServiceId: selectedTask.id,
          jobId: selectedTask.job_id,
          uploadedBy: profile.id,
          files: filesArray
        });
      }

      // 2. Perform status update
      const isDelay = newStatus === 'on_hold';
      await updateStatusMutation.mutateAsync({
        jobServiceId: selectedTask.id,
        jobId: selectedTask.job_id,
        fromStatus: selectedTask.status,
        toStatus: newStatus,
        governmentRef: govRef || undefined,
        reason: (newStatus === 'cancelled' || newStatus === 'gov_rejected' || newStatus === 'on_hold') ? reason : undefined,
        isDelayEvent: isDelay,
        holdReason: newStatus === 'on_hold' ? reason : undefined,
        rejectionReason: newStatus === 'gov_rejected' ? reason : undefined,
        proId: newStatus === 'assigned_to_pro' ? proId : undefined,
        proNotes: newStatus === 'assigned_to_pro' ? proNotes : undefined,
      });

      toast.success('Update saved successfully!');
      setSelectedTask(null);
      setIsOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const needsGovRef = newStatus === 'gov_approved' || newStatus === 'gov_rejected';
  const needsReason = newStatus === 'on_hold' || newStatus === 'gov_rejected' || newStatus === 'cancelled';

  // Only operations employee sees this floating widget
  if (!profile?.can_do_ops) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999]" ref={containerRef}>
      {/* Floating Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-gold to-[#B8860B] text-[#0A0F1E] flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all relative border border-gold/40 group"
      >
        <Zap size={24} className="group-hover:rotate-12 transition-transform" />
        
        {activeTasks.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-lg border border-[#0A0F1E]">
            {activeTasks.length}
          </span>
        )}
      </button>

      {/* Expanded Quick Update Popover Dashboard */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="absolute bottom-16 right-0 w-80 md:w-96 bg-[#0B0F19] border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[480px]"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-widest">
                <Zap size={14} /> Quick Update
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Content Pane */}
            <div className="p-4 flex-1 overflow-y-auto min-h-0 space-y-4">
              {!selectedTask ? (
                <>
                  {/* Search bar */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border border-border/50 rounded-xl focus-within:border-primary/50 transition-colors">
                    <Search size={16} className="text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search applicant or service name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 w-full"
                    />
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {filteredTasks.map((t: any) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3 bg-muted/10 border border-border/30 rounded-xl hover:bg-primary/5 hover:border-gold/30 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-bold text-foreground truncate">{t.service_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {t.applicant_name || 'No name'} · <span className="font-mono text-muted-foreground/50">{t.job?.job_code}</span>
                          </p>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-border/50 text-muted-foreground">
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}

                    {filteredTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 italic text-center py-8">No matching tasks found.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Selected Task Details Header */}
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="p-1.5 bg-muted/40 hover:bg-muted text-muted-foreground rounded-lg transition-colors mt-0.5"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{selectedTask.service_name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {selectedTask.applicant_name || 'No Name'} · <span className="font-mono text-muted-foreground/50">{selectedTask.job?.job_code}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Update Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none transition-all"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0B0F19]">{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Conditional Gov Reference Code */}
                  {needsGovRef && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-primary uppercase tracking-widest block">Gov Reference No.</label>
                      <input
                        type="text"
                        value={govRef}
                        onChange={(e) => setGovRef(e.target.value)}
                        placeholder="e.g. MOL/2026/12345"
                        className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none transition-all"
                      />
                    </div>
                  )}

                  {/* Conditional Hold/Rejection/Cancellation Reason */}
                  {needsReason && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-red-400 uppercase tracking-widest block">
                        {newStatus === 'gov_rejected' ? 'Rejection Reason' : newStatus === 'cancelled' ? 'Cancellation Reason' : 'Hold Reason'}
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        placeholder={newStatus === 'gov_rejected' ? 'Why was it rejected?' : newStatus === 'cancelled' ? 'Why is it cancelled?' : 'Why is it on hold?'}
                        className="w-full bg-muted/30 border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none transition-all resize-none"
                      />
                    </div>
                  )}

                  {/* PRO assignment */}
                  {newStatus === 'assigned_to_pro' && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">PRO Agent *</label>
                        <select
                          value={proId}
                          onChange={(e) => setProId(e.target.value)}
                          className="w-full bg-[#0d121f] border border-amber-400/30 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-foreground outline-none transition-all"
                        >
                          <option value="">Select PRO Agent...</option>
                          {pros.map((e: any) => (
                            <option key={e.id} value={e.id} className="bg-[#0B0F19]">{e.full_name}</option>
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
                          className="w-full bg-[#0d121f] border border-border focus:border-primary rounded-xl px-3 py-2 text-xs text-foreground outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Attachment Dropzone */}
                  {(newStatus === 'gov_approved' || newStatus === 'completed') && (
                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <label className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest flex items-center justify-between">
                        <span>📎 Deliverable Attachments</span>
                        {selectedFiles.length > 0 && (
                          <span className="text-[8px] text-emerald-400 font-bold">{selectedFiles.length} selected</span>
                        )}
                      </label>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1.5 bg-muted/20 border border-border/30 rounded-lg text-[9px] text-foreground font-mono">
                              <span className="truncate flex-1 pr-1">{file.name}</span>
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

                      <div className="relative border border-dashed border-border hover:border-primary/40 rounded-xl p-2.5 text-center transition-all bg-card/25 cursor-pointer">
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
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Upload size={10} />
                          <span className="text-[8px] font-bold uppercase">Add files...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setSelectedTask(null)}
                      className="flex-1 py-2 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl transition-all text-xs"
                      disabled={isUpdating}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isUpdating}
                      className="flex-1 py-2 bg-primary hover:bg-primary/90 text-[#0A0F1E] font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-1"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check size={12} />
                          Save Update
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default QuickUpdateWidget;
