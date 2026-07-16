import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Plus, Calendar, MessageSquare, 
  CheckCircle2, AlertCircle, Clock, User, X, Coins,
  Upload, FileText, Eye, Download, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JobLedger } from './JobLedger';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CustomSelect = ({ value, options, onChange, className = '' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find((o: any) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 outline-none ${className}`}
      >
        <span>{currentOption?.label || value}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 min-w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col py-1"
            >
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`text-left px-4 py-2.5 text-[10px] uppercase font-bold tracking-widest transition-colors ${
                    value === opt.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const SubTaskCard = ({ subTask, step, jobDocuments, onUpdate, onDelete, onDataRefresh }: any) => {
  const [showNotes, setShowNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  const attachedDoc = jobDocuments?.find((d: any) => d.job_sub_task_id === subTask.id);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${step.job_id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('documents').insert({
        job_id: step.job_id,
        job_step_id: step.id,
        job_sub_task_id: subTask.id,
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        document_type: 'sub_task_attachment',
        status: 'approved',
        is_client_visible: false,
        version: 1
      });

      if (dbError) throw dbError;
      toast.success('Document attached to sub-task successfully!');
      if (onDataRefresh) onDataRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!attachedDoc) return;
    try {
      const { data, error } = await supabase.storage.from('documents').download(attachedDoc.file_path);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachedDoc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handleView = async () => {
    if (!attachedDoc) return;
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(attachedDoc.file_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      import('react-hot-toast').then(toast => {
        toast.default.error('Could not open document. Make sure it exists.');
      });
    }
  };

  return (
    <div className={`border rounded-xl p-4 space-y-3 group transition-colors ${
      subTask.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50' :
      subTask.status === 'rejected' ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50' :
      subTask.status === 'applied' ? 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50' :
      'bg-muted/20 border-border hover:border-primary/30'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={subTask.name}
            onChange={(e) => onUpdate(subTask.id, { name: e.target.value })}
            className="bg-transparent border-none outline-none font-bold text-sm text-foreground w-full placeholder:text-muted-foreground/50"
            placeholder="Applicant Name or Item"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={subTask.status}
            onChange={(e) => onUpdate(subTask.id, { status: e.target.value })}
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-md border border-border bg-card outline-none focus:border-primary"
          >
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="approved">Approved (Completed)</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>

          <div className="relative flex items-center bg-card border border-border rounded-md px-2 py-1 w-24">
             <Coins size={12} className="text-muted-foreground mr-1 shrink-0" />
             <input
               type="number"
               step="0.001"
               value={subTask.ministry_fee || ''}
               onChange={(e) => onUpdate(subTask.id, { ministry_fee: e.target.value ? Number(e.target.value) : null })}
               className="bg-transparent border-none outline-none text-[10px] text-foreground w-full placeholder:text-muted-foreground/30 font-bold"
               placeholder="Fee"
             />
          </div>

          <button 
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1.5 rounded-md transition-colors ${showNotes || subTask.notes ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <MessageSquare size={14} />
          </button>
          
          <button 
            onClick={() => onDelete(subTask.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-border/30 mt-3">
        {subTask.status === 'approved' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issued:</span>
              <div className="relative flex items-center bg-card border border-border rounded-md px-2 py-1">
                <Calendar size={12} className="text-muted-foreground mr-1" />
                <input
                  type="date"
                  value={subTask.issued_date || ''}
                  onChange={(e) => onUpdate(subTask.id, { issued_date: e.target.value })}
                  className="bg-transparent border-none outline-none text-[10px] text-muted-foreground"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry:</span>
              <div className="relative flex items-center bg-card border border-border rounded-md px-2 py-1">
                <Calendar size={12} className="text-muted-foreground mr-1" />
                <input
                  type="date"
                  value={subTask.expiry_date || ''}
                  onChange={(e) => onUpdate(subTask.id, { expiry_date: e.target.value })}
                  className="bg-transparent border-none outline-none text-[10px] text-muted-foreground"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <FileText size={10} /> Document:
          </span>
          {attachedDoc ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md max-w-[150px] shrink-0" title={attachedDoc.file_name}>
                <span className="text-[9px] font-bold text-emerald-600 truncate uppercase tracking-widest">{attachedDoc.file_name}</span>
              </div>
              <button 
                onClick={handleView}
                className="p-1.5 text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors shrink-0"
                title="View Document in New Tab"
              >
                <Eye size={12} />
              </button>
              <button 
                onClick={handleDownload}
                className="p-1.5 text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors shrink-0"
                title="Download Document"
              >
                <Download size={12} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary bg-muted/30 hover:bg-primary/10 rounded-md transition-colors border border-border"
              title="Attach Document"
            >
              {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Attach File
            </button>
          )}
        </div>
      </div>

      {showNotes && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <textarea
            value={subTask.notes || ''}
            onChange={(e) => onUpdate(subTask.id, { notes: e.target.value })}
            placeholder="Enter passport number, specific notes, or issue details..."
            className="w-full bg-card border border-border rounded-lg p-3 text-xs outline-none focus:border-primary min-h-[60px]"
          />
        </motion.div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
    </div>
  );
};

const StepAccordion = ({ step, job, employees, jobDocuments, onDataRefresh }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subTasks, setSubTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (isExpanded && subTasks.length === 0) {
      loadSubTasks();
    }
  }, [isExpanded]);

  const loadSubTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('job_sub_tasks')
      .select('*')
      .eq('job_step_id', step.id)
      .order('created_at', { ascending: true });
    
    if (data) setSubTasks(data);
    setLoading(false);
  };

  const handleAddSubTask = async () => {
    const { data, error } = await supabase.from('job_sub_tasks').insert({
      job_step_id: step.id,
      name: 'New Item/Applicant',
      status: 'pending'
    }).select().single();

    if (data) setSubTasks([...subTasks, data]);
  };

  const handleUpdateSubTask = async (id: string, updates: any) => {
    // Optimistic update
    setSubTasks(subTasks.map(st => st.id === id ? { ...st, ...updates } : st));
    
    await supabase.from('job_sub_tasks').update(updates).eq('id', id);

    if (updates.ministry_fee !== undefined) {
      // Re-calculate job totals
      const { data: feesData } = await supabase
        .from('job_sub_tasks')
        .select('ministry_fee, job_steps!inner(job_id)')
        .eq('job_steps.job_id', job.id);
        
      const newTotalSubTaskFee = (feesData || []).reduce((sum, item) => sum + (Number(item.ministry_fee) || 0), 0);
      
      const { data: addCharges } = await supabase.from('job_additional_charges').select('amount').eq('job_id', job.id);
      const newTotalAdditional = (addCharges || []).reduce((sum, c) => sum + Number(c.amount), 0);
      
      const { data: payments } = await supabase.from('job_payments').select('amount').eq('job_id', job.id);
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      
      const newTotalBilled = job.work_fee + job.ministry_fee + newTotalAdditional + newTotalSubTaskFee;
      const newRemaining = Math.max(0, newTotalBilled - totalPaid);
      
      await supabase.from('jobs').update({
        total_fee: newTotalBilled,
        remaining_amount: newRemaining,
        remaining_paid: newRemaining <= 0
      }).eq('id', job.id);
      
      if (onDataRefresh) onDataRefresh();
    }
  };

  const handleDeleteSubTask = async (id: string) => {
    setSubTasks(subTasks.filter(st => st.id !== id));
    await supabase.from('job_sub_tasks').delete().eq('id', id);
  };

  const handleUpdateStepStatus = async (status: string) => {
    if (status === 'completed') {
      // 1. Payment Verification Check
      const stepName = (step.custom_name || step.workflow_step?.name_en || '').toLowerCase();
      const isKYC = stepName.includes('kyc');

      if (!isKYC && job && !job.advance_paid && (job.total_fee > 0)) {
        import('react-hot-toast').then(toast => {
          toast.default.error('Advance Payment not verified! Please verify the initial payment in the Financial Ledger before completing steps.');
        });
        return; // Prevent completion until advance payment is verified
      }

    }

    await supabase.from('job_steps').update({ status }).eq('id', step.id);
    import('react-hot-toast').then(toast => {
      toast.default.success('Step status updated');
    });
    
    if (onDataRefresh) onDataRefresh();
  };

  const handleAssignStep = async (employeeId: string) => {
     await supabase.from('job_steps').update({ 
       assigned_to: employeeId || null,
       assigned_by: profile?.id
     }).eq('id', step.id);
     
     if (onDataRefresh) onDataRefresh();
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card mb-4 shadow-sm">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
            step.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
            step.status === 'in_progress' ? 'bg-primary/10 border-primary/30 text-primary' :
            'bg-muted border-border text-muted-foreground'
          }`}>
            {step.status === 'completed' ? <CheckCircle2 size={16} /> :
             step.status === 'in_progress' ? <Clock size={16} /> :
             <AlertCircle size={16} />}
          </div>
          <div>
            <h3 className="font-syne font-bold text-foreground flex items-center gap-2">
               {step.workflow_step?.name_en || step.custom_name || 'Custom Step'}
               {!step.workflow_step_id && (
                 <span className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded">Custom</span>
               )}
            </h3>
            {step.notes && <p className="text-xs text-muted-foreground mb-1">{step.notes}</p>}
            
            {(() => {
              const totalFees = subTasks.reduce((sum, task) => sum + (Number(task.ministry_fee) || 0), 0);
              if (totalFees > 0) {
                return (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md w-fit">
                    <Coins size={10} />
                    TOTAL FEES: {totalFees.toFixed(3)} OMR
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
           <select
             value={step.assigned_to || ''}
             onChange={(e) => handleAssignStep(e.target.value)}
             className={`hidden sm:block border rounded-lg px-2 py-1 text-[10px] uppercase font-bold tracking-widest outline-none focus:border-primary ${
               step.assigned_to === profile?.id 
                 ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                 : 'bg-muted/30 border-border text-muted-foreground'
             }`}
           >
             <option value="">Unassigned</option>
             {employees.map((emp: any) => (
               <option key={emp.id} value={emp.id}>
                 {emp.availability_status === 'available' ? '🟢 ' : '🟠 '}
                 {emp.full_name} {emp.id === profile?.id ? '(Me)' : ''}
               </option>
             ))}
           </select>

           <select
             value={step.status}
             onChange={(e) => handleUpdateStepStatus(e.target.value)}
             className="bg-muted/30 border border-border rounded-lg px-2 py-1 text-[10px] uppercase font-bold tracking-widest text-foreground outline-none focus:border-primary"
           >
             <option value="pending">Pending</option>
             <option value="in_progress">In Progress</option>
             <option value="completed">Completed</option>
             <option value="rejected">Blocked</option>
             <option value="skipped">Skipped</option>
           </select>
           
           <div className="text-muted-foreground">
             {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-background/30"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                   Sub-Tasks / Applicants
                 </h4>
                 <button 
                   onClick={handleAddSubTask}
                   className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                 >
                   <Plus size={12} /> Add Item
                 </button>
              </div>

              {loading ? (
                <div className="text-center text-xs text-muted-foreground py-4">Loading...</div>
              ) : subTasks.length === 0 ? (
                <div className="text-center border border-dashed border-border rounded-xl p-6 text-muted-foreground text-xs">
                  No sub-tasks. Click "Add Item" to track individual applicants or requirements.
                </div>
              ) : (
                <div className="space-y-3">
                  {subTasks.map(st => (
                    <SubTaskCard 
                      key={st.id} 
                      subTask={st}
                      step={step}
                      jobDocuments={jobDocuments}
                      onUpdate={handleUpdateSubTask}
                      onDelete={handleDeleteSubTask}
                      onDataRefresh={onDataRefresh}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const JobDetailsView = ({ job }: { job: any }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'workflow' | 'ledger'>('workflow');
  const [steps, setSteps] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMinistryFee, setTotalMinistryFee] = useState<number>(0);
  const [jobDocuments, setJobDocuments] = useState<any[]>([]);
  const [isCustomStepModalOpen, setIsCustomStepModalOpen] = useState(false);
  const [customStepName, setCustomStepName] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);

  useEffect(() => {
    if (job?.id) {
      loadData();
    }
  }, [job]);

  const loadData = async () => {
    setLoading(true);
    
    // Fetch steps with workflow template info
    const { data: stepData } = await supabase
      .from('job_steps')
      .select(`
        *,
        workflow_step:workflow_steps(name_en, step_order)
      `)
      .eq('job_id', job.id)
      .order('created_at', { ascending: true }); 

    // Fetch total ministry fees for the job
    const { data: feesData } = await supabase
      .from('job_sub_tasks')
      .select('ministry_fee, job_steps!inner(job_id)')
      .eq('job_steps.job_id', job.id);
      
    if (feesData) {
      const total = feesData.reduce((sum, item) => sum + (Number(item.ministry_fee) || 0), 0);
      setTotalMinistryFee(total);
    }

    // Fetch documents
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('job_id', job.id);
    if (docsData) setJobDocuments(docsData);

    // Fetch employees for assignment
    const { data: empData } = await supabase.from('profiles').select('id, full_name, availability_status').eq('role', 'employee');

    if (stepData) {
      // Sort by workflow_step order if available
      const sortedSteps = stepData.sort((a, b) => {
        const orderA = a.workflow_step?.step_order ?? 999;
        const orderB = b.workflow_step?.step_order ?? 999;
        return orderA - orderB;
      });
      setSteps(sortedSteps);
    }
    
    if (empData) setEmployees(empData);
    
    setLoading(false);
  };

  const submitCustomStep = async () => {
    if (!customStepName.trim()) return;
    setIsAddingStep(true);

    const { error } = await supabase.from('job_steps').insert({
      job_id: job.id,
      custom_name: customStepName.trim(),
      status: 'pending'
    });

    if (error) {
      import('react-hot-toast').then(toast => {
        toast.default.error(`Error: ${error.message || 'Failed to add step'}`);
      });
      console.error("Supabase Error Details:", error);
    } else {
      import('react-hot-toast').then(toast => {
        toast.default.success('Custom step added successfully');
      });
      setCustomStepName('');
      setIsCustomStepModalOpen(false);
      loadData();
    }
    setIsAddingStep(false);
  };

  const handleUpdateJobStatus = async (status: string) => {
    if (status === 'completed') {
      // Check for incomplete steps in the UI state
      const hasIncompleteSteps = steps.some(s => s.status !== 'completed' && s.status !== 'skipped');
      
      // Query the database for any incomplete sub-tasks linked to this job
      const { data: incompleteSubTasks, error: checkError } = await supabase
        .from('job_sub_tasks')
        .select('id, status, job_steps!inner(job_id)')
        .eq('job_steps.job_id', job.id)
        .neq('status', 'approved');

      if (hasIncompleteSteps || (incompleteSubTasks && incompleteSubTasks.length > 0)) {
        import('react-hot-toast').then(toast => {
          toast.default.error('Cannot complete job: Please mark all steps and sub-tasks as completed first.');
        });
        // Re-render to reset the select dropdown visually since we blocked it
        loadData();
        return;
      }
      
      // Check if full payment has been made before closing the job
      if (!job.remaining_paid && (job.total_fee > 0 || job.remaining_amount > 0)) {
        import('react-hot-toast').then(toast => {
          toast.default.error('Payment Incomplete: Please verify full payment in the Financial Ledger before closing this job.');
        });
        loadData();
        return;
      }
    }

    // Optimistic UI update
    job.status = status;
    
    const { error } = await supabase.from('jobs').update({ status }).eq('id', job.id);
    
    if (error) {
      import('react-hot-toast').then(toast => {
        toast.default.error(`Failed to update status: ${error.message}`);
      });
    } else {
      import('react-hot-toast').then(toast => {
        toast.default.success('Job status updated');
      });
      loadData(); // Ensure UI is synced
    }
  };

  if (!job) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Tabs */}
      <div className="px-8 pt-6 border-b border-border bg-card">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'workflow' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Workflow Canvas
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Financial Ledger
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
        {activeTab === 'workflow' ? (
          <div className="max-w-3xl mx-auto pb-12">
             <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-syne font-bold text-foreground mb-1">Execution Workflow</h2>
                  <p className="text-xs text-muted-foreground mb-3">Manage steps, sub-tasks, and delegations.</p>
                  
                  {totalMinistryFee > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg w-fit">
                      <Coins size={14} />
                      TOTAL SERVICE FEES: {totalMinistryFee.toFixed(3)} OMR
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {job.status === 'draft' && (
                    <div className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} /> Pending Payment / Pre-requisites
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    <CustomSelect
                      value={job.status}
                      onChange={(v: string) => handleUpdateJobStatus(v)}
                      options={[
                        { value: 'draft', label: 'Draft (Pending)' },
                        { value: 'active', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' }
                      ]}
                      className="bg-card border border-border rounded-lg px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-foreground hover:border-primary/50 transition-colors w-full sm:min-w-[180px]"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => {
                          const url = new URLSearchParams({
                            job_id: job.id,
                            client_id: job.client_id,
                            base_fee: job.base_fee?.toString() || '0',
                            min_fee: totalMinistryFee.toString() || '0'
                          });
                          navigate(`/employee/invoices/new?${url.toString()}`);
                        }}
                        className="flex-1 sm:flex-none text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <FileText size={14} /> Generate Invoice
                      </button>

                      <button 
                        onClick={() => setIsCustomStepModalOpen(true)}
                        className="flex-1 sm:flex-none text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Plus size={14} /> Add Custom Step
                      </button>
                    </div>
                  </div>
                </div>
             </div>

             {loading ? (
               <div className="text-center text-muted-foreground py-12 animate-pulse">Loading workflow...</div>
             ) : (
               <div className="space-y-4">
                 {steps.map(step => (
                   <StepAccordion 
                     key={step.id} 
                     step={step} 
                     job={job}
                     employees={employees} 
                     jobDocuments={jobDocuments}
                     onDataRefresh={loadData}
                   />
                 ))}
               </div>
             )}
          </div>
        ) : (
          <JobLedger job={job} onPaymentReceived={loadData} />
        )}
      </div>

      {/* Add Custom Step Modal */}
      <AnimatePresence>
        {isCustomStepModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCustomStepModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Plus size={18} className="text-primary" /> Add Custom Step
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Insert an ad-hoc step to this specific workflow.</p>
                </div>
                <button onClick={() => setIsCustomStepModalOpen(false)} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Step Name</label>
                  <input
                    type="text"
                    value={customStepName}
                    onChange={(e) => setCustomStepName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitCustomStep();
                    }}
                    placeholder="e.g., Emergency Ministry Review"
                    autoFocus
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                  <button onClick={() => setIsCustomStepModalOpen(false)} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Cancel</button>
                  <button 
                    onClick={submitCustomStep}
                    disabled={!customStepName.trim() || isAddingStep}
                    className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAddingStep ? 'Adding...' : 'Add Step'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
