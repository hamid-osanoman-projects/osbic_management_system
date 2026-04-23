import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, BookOpen, RefreshCw, Users, FileText, 
  ChevronLeft, GripVertical, Trash2, Plus, ArrowRight,
  Settings, CheckCircle2, AlertCircle, Eye, ListChecks,
  X as XIconLucide, Zap
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdminService, useSaveService, type WorkflowStep, type Service } from '../../hooks/admin/useAdminServices';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Sortable Step Component ──────────────────────────────────────────────
interface SortableStepProps {
  step: WorkflowStep;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (step: WorkflowStep) => void;
  onDelete: () => void;
}

const SortableStep = ({ step, index, expanded, onToggleExpand, onUpdate, onDelete }: SortableStepProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const [newDoc, setNewDoc] = useState('');

  const addDoc = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newDoc.trim()) {
      e.preventDefault();
      if (!step.required_docs.includes(newDoc.trim())) {
        onUpdate({ ...step, required_docs: [...step.required_docs, newDoc.trim()] });
      }
      setNewDoc('');
    }
  };

  const removeDoc = (doc: string) => {
    onUpdate({ ...step, required_docs: step.required_docs.filter(d => d !== doc) });
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("bg-background border rounded-xl overflow-hidden mb-3 transition-colors", isDragging ? "border-gold/50 shadow-2xl opacity-80" : "border-border hover:border-white/20")}>
      {/* Collapsed Header */}
      <div className="flex items-center p-3 gap-3">
        <div {...attributes} {...listeners} className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground transition-colors touch-none">
          <GripVertical size={16} />
        </div>
        
        <div className="w-6 h-6 rounded bg-muted/50 border border-border flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-foreground font-mono">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <p className="text-sm font-bold text-foreground truncate">{step.name_en || 'Untitled Step'}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded flex items-center gap-1">
              <FileText size={10} /> {step.required_docs.length} docs
            </span>
            <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded">
              ~{step.estimated_hours} hrs
            </span>
            {step.estimated_gov_fee && step.estimated_gov_fee > 0 && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                {step.estimated_gov_fee} OMR
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {step.is_client_visible && <span title="Client Visible"><Eye size={14} className="text-muted-foreground" /></span>}
          {step.is_blocking && <span title="Blocking Step"><AlertCircle size={14} className="text-amber-500" /></span>}
          
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-border mt-2 bg-primary/5 shadow-inner transition-all border border-primary/20">
          <div className="pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Step Name (EN) *</label>
              <input type="text" value={step.name_en} onChange={(e) => onUpdate({...step, name_en: e.target.value})} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 text-right">Step Name (AR) *</label>
              <input type="text" dir="rtl" value={step.name_ar} onChange={(e) => onUpdate({...step, name_ar: e.target.value})} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none text-right" />
            </div>
          </div>

          <div>
             <label className="block text-xs font-medium text-muted-foreground mb-1.5">Required Documents</label>
             <div className="bg-card border border-border rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2">
               {step.required_docs.map(doc => (
                 <span key={doc} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded px-2 py-1 text-xs text-[#E2E8F0]">
                   {doc}
                   <button onClick={() => removeDoc(doc)} className="text-muted-foreground hover:text-red-400"><XIconLucide size={12} /></button>
                 </span>
               ))}
               <input 
                 type="text" 
                 value={newDoc} 
                 onChange={(e) => setNewDoc(e.target.value)} 
                 onKeyDown={addDoc}
                 placeholder="Type and press Enter..." 
                 className="flex-1 bg-transparent border-none outline-none text-xs text-foreground min-w-[120px]" 
               />
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Est. Hours</label>
              <input type="number" value={step.estimated_hours} onChange={(e) => onUpdate({...step, estimated_hours: Number(e.target.value)})} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Est. Gov Fee (OMR)</label>
              <input type="number" value={step.estimated_gov_fee} onChange={(e) => onUpdate({...step, estimated_gov_fee: Number(e.target.value)})} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-gold outline-none text-emerald-400 font-mono" />
            </div>
            
            <div className="col-span-2 flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", step.is_client_visible ? "bg-primary border-gold text-[#0A0F1E]" : "border-white/20 group-hover:border-white/40")}>
                  {step.is_client_visible && <CheckCircle2 size={14} />}
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Client Visible</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", step.is_blocking ? "bg-amber-500 border-amber-500 text-[#0A0F1E]" : "border-white/20 group-hover:border-white/40")}>
                  {step.is_blocking && <CheckCircle2 size={14} />}
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Blocking Step</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Service Form Component ──────────────────────────────────────────
const AVAILABLE_ICONS = [
  { name: 'Building2', icon: Building2 },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'RefreshCw', icon: RefreshCw },
  { name: 'Users', icon: Users },
  { name: 'FileText', icon: FileText }
];

const ServiceForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: initialData, isLoading } = useAdminService(id === 'new' ? undefined : id);
  const { mutate: saveService, isPending: isSaving } = useSaveService();

  const [formData, setFormData] = useState<Service>({
    id: id === 'new' ? '' : (id || ''),
    name_en: '', name_ar: '', category: 'company_formation', icon: 'Building2',
    description_en: '', description_ar: '', estimated_days: 7, expiry_months: 60,
    work_fee: 30, ministry_fee: 20,
    is_active: true, steps: [], active_jobs: 0
  });

  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [initialData]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const steps = prev.steps;
        const oldIndex = steps.findIndex(s => s.id === active.id);
        const newIndex = steps.findIndex(s => s.id === over.id);
        const newSteps = arrayMove(steps, oldIndex, newIndex);
        return { 
          ...prev, 
          steps: newSteps.map((s, idx) => ({ ...s, order_index: idx })) 
        };
      });
    }
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: uuidv4(), name_en: '', name_ar: '', description_en: '', description_ar: '',
      required_docs: [], estimated_hours: 24, estimated_gov_fee: 0, is_client_visible: true, is_blocking: true,
      order_index: formData.steps.length
    };
    setFormData((prev: any) => ({ ...prev, steps: [...prev.steps, newStep] }));
    setExpandedStepId(newStep.id);
  };

  const handleSave = () => {
    if (!formData.name_en || !formData.name_ar) {
      toast.error('Service names are required');
      return;
    }
    saveService(formData, {
      onSuccess: () => {
        toast.success('Service saved successfully');
        navigate('/admin/services');
      }
    });
  };

  if (isLoading) return <div className="p-8 text-foreground">Loading service definition...</div>;

  const clientSteps = formData.steps.filter((s: WorkflowStep) => s.is_client_visible);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] pb-6 relative">
      
      {/* ── LEFT PANEL: SERVICE DETAILS (40%) ── */}
      <div className="w-full lg:w-[40%] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-6 border-b border-border flex items-center gap-4">
          <button onClick={() => navigate('/admin/services')} className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-foreground">
            <ChevronLeft size={18} />
          </button>
          <div>
             <h2 className="text-xl font-syne font-bold text-foreground">{id === 'new' ? 'Create New Service' : 'Edit Service'}</h2>
             <p className="text-sm text-muted-foreground/60">Define properties and categorization</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
           <div>
             <label className="block text-xs font-medium text-muted-foreground mb-1.5">Service Name (English) *</label>
             <input type="text" value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold outline-none transition-colors" />
           </div>
           
           <div>
             <label className="block text-xs font-medium text-muted-foreground mb-1.5 text-right">Service Name (Arabic) *</label>
             <input type="text" dir="rtl" value={formData.name_ar} onChange={(e) => setFormData({...formData, name_ar: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold outline-none transition-colors text-right" />
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category *</label>
               <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold outline-none transition-colors appearance-none">
                 <option value="company_formation">Company Formation</option>
                 <option value="visa">Visa Services</option>
                 <option value="cr_renewal">CR Renewal</option>
                 <option value="labor">Labor Services</option>
                 <option value="other">Other</option>
               </select>
             </div>
             <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Est. Total Days *</label>
               <input type="number" value={formData.estimated_days} onChange={(e) => setFormData({...formData, estimated_days: Number(e.target.value)})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold outline-none transition-colors" />
             </div>
           </div>

           <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap size={14} className="text-primary" /> Financial Strategy
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5">Base Work Fee (OMR)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.work_fee} 
                      onChange={(e) => setFormData({...formData, work_fee: Number(e.target.value)})} 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-12 py-2.5 text-foreground focus:border-gold outline-none transition-colors font-mono" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40">OMR</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1.5">Ministry Fee (OMR)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.ministry_fee} 
                      onChange={(e) => setFormData({...formData, ministry_fee: Number(e.target.value)})} 
                      className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-12 py-2.5 text-foreground focus:border-gold outline-none transition-colors font-mono" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40">OMR</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[9px] text-muted-foreground/60 leading-relaxed italic">These values will be the forced defaults during job creation, but can be overridden by admins per project.</p>
           </div>

           <div>
             <label className="block text-xs font-medium text-muted-foreground mb-1.5">Icon Selection</label>
             <div className="flex gap-2">
               {AVAILABLE_ICONS.map(i => (
                 <button 
                   key={i.name} 
                   onClick={() => setFormData({...formData, icon: i.name})}
                   className={cn("w-12 h-12 rounded-xl border flex items-center justify-center transition-colors", formData.icon === i.name ? "bg-primary/10 border-gold/50 text-primary shadow-[0_0_15px_rgba(212,175,55,0.2)]" : "bg-muted/50 border-border text-muted-foreground hover:text-foreground")}
                 >
                   <i.icon size={20} />
                 </button>
               ))}
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiry validity (Months)</label>
               <input type="number" placeholder="Null if never expires" value={formData.expiry_months || ''} onChange={(e) => setFormData({...formData, expiry_months: e.target.value ? Number(e.target.value) : null})} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-gold outline-none transition-colors" />
             </div>
             <div className="flex items-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <button onClick={() => setFormData({...formData, is_active: !formData.is_active})} className={cn(
                       "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                       formData.is_active ? "bg-emerald-500" : "bg-white/10"
                     )}>
                       <span className={cn(
                         "inline-block h-4 w-4 transform rounded-full bg-white transition-transform ml-1",
                         formData.is_active ? "translate-x-5" : "translate-x-0"
                       )} />
                     </button>
                  <span className="text-sm font-bold text-foreground">Service Is Active</span>
                </label>
             </div>
           </div>

           {id === 'new' && (
             <div className="pt-6 border-t border-border">
                <button onClick={() => navigate('/admin/services/template')} className="w-full py-3 rounded-xl border border-dashed border-gold/30 text-primary hover:bg-primary/10 transition-colors font-medium text-sm flex items-center justify-center gap-2">
                  <FileText size={16} /> Load "Company Registration" Template
                </button>
             </div>
           )}
        </div>
      </div>

      {/* ── RIGHT PANEL: WORKFLOW BUILDER (60%) ── */}
      <div className="w-full lg:w-[60%] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
               <Settings size={20} />
             </div>
             <div>
               <h2 className="text-xl font-syne font-bold text-foreground">Workflow Steps</h2>
               <p className="text-sm text-muted-foreground/60">{formData.steps?.length} steps defined</p>
             </div>
          </div>
          <button 
            onClick={addStep}
            className="flex items-center gap-2 bg-muted/50 text-foreground px-4 py-2 rounded-xl font-bold hover:bg-muted transition-colors border border-border"
          >
            <Plus size={16} /> Add Step
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Builder area */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-border">
            {formData.steps.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 border-2 border-dashed border-border rounded-2xl p-8 text-center">
                 <ListChecks size={48} className="mb-4 opacity-20" />
                 <p className="text-lg font-bold text-foreground mb-2">No steps defined</p>
                 <p className="text-sm mb-6 max-w-sm">Every service needs a sequential workflow. Steps determine the required docs, pricing, and client visibility.</p>
                 <button onClick={addStep} className="bg-white/10 text-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-white/20 transition-colors">Start Building</button>
               </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={formData.steps.map((s:any)=>s.id)} strategy={verticalListSortingStrategy}>
                  {formData.steps.map((step: WorkflowStep, index: number) => (
                    <SortableStep 
                      key={step.id}
                      step={step}
                      index={index}
                      expanded={expandedStepId === step.id}
                      onToggleExpand={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
                      onUpdate={(updated) => setFormData((p:any) => ({...p, steps: p.steps.map((s:any) => s.id === updated.id ? updated : s)}))}
                      onDelete={() => setFormData((p:any) => ({...p, steps: p.steps.filter((s:any) => s.id !== step.id)}))}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Client Preview Terminal */}
          <div className="w-full md:w-64 bg-black/40 p-4 overflow-y-auto hidden sm:block shrink-0 relative">
             <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 mb-6 flex items-center justify-center gap-1.5 mb-8">
               <Eye size={12} /> Client Preview
             </p>
             
             <div className="relative pl-3 space-y-6">
                <div className="absolute left-4 top-2 bottom-6 w-[2px] bg-muted/50 z-0" />
                {clientSteps.map((step: WorkflowStep, idx: number) => (
                  <div key={idx} className="relative z-10">
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-card border-[2px] border-white/20 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight mb-1">{step.name_en || 'Unnamed'}</p>
                        <p className="text-[9px] text-muted-foreground/60 truncate w-[140px]">{step.required_docs.length} docs required</p>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
             
             {clientSteps.length > 0 && (
               <div className="mt-8 flex justify-center">
                 <div className="w-12 h-12 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center text-emerald-500/30">
                   <CheckCircle2 size={16} />
                 </div>
               </div>
             )}
          </div>

        </div>

        {/* Unified Save Button Footer */}
        <div className="p-4 border-t border-border bg-card flex justify-end gap-3 z-50">
           <button onClick={() => navigate('/admin/services')} className="px-6 py-2.5 rounded-xl text-foreground font-medium hover:bg-muted/50 transition-colors">Cancel</button>
           <button onClick={handleSave} disabled={isSaving} className="bg-primary text-[#0A0F1E] px-8 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-gold/20 flex items-center gap-2 disabled:opacity-50">
             {isSaving ? 'Saving...' : 'Save Workflow'} { !isSaving && <ArrowRight size={18} /> }
           </button>
        </div>
      </div>
      
    </div>
  );
};

export default ServiceForm;
