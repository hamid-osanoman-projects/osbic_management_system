import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, BookOpen, RefreshCw, Users, FileText, 
  ChevronLeft, ArrowRight, Zap
} from 'lucide-react';
import { useAdminService, useSaveService, type Service } from '../../hooks/admin/useAdminServices';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVAILABLE_ICONS = [
  { name: 'Building2', icon: Building2 },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'RefreshCw', icon: RefreshCw },
  { name: 'Users', icon: Users },
  { name: 'FileText', icon: FileText }
];

const ServiceForm = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { data: initialData, isLoading } = useAdminService(isNew ? undefined : id);
  const { mutate: saveService, isPending: isSaving } = useSaveService();

  const [formData, setFormData] = useState<Service>({
    id: isNew ? '' : (id || ''),
    name_en: '', name_ar: '', category: 'company_formation', icon: 'Building2',
    description_en: '', description_ar: '', estimated_days: 7, expiry_months: 60,
    work_fee: 30, ministry_fee: 20,
    is_active: true, steps: [], active_jobs: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [initialData]);

  const handleSave = () => {
    if (!formData.name_en || !formData.name_ar) {
      toast.error('Service names are required');
      return;
    }
    
    // Ensure steps is empty or preserved correctly. We'll just pass whatever is there (usually []).
    saveService(formData, {
      onSuccess: () => {
        toast.success('Service saved successfully');
        navigate('/admin/services');
      }
    });
  };

  if (isLoading) return <div className="p-8 text-foreground text-center">Loading service details...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/admin/services')} 
          className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
           <h2 className="text-2xl font-syne font-bold text-foreground tracking-tight">
             {isNew ? 'Create New Service' : 'Edit Service'}
           </h2>
           <p className="text-sm text-muted-foreground/80 mt-1">Define properties and categorization</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
           
           {/* Basic Details */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Service Name (EN) *</label>
               <input 
                 type="text" 
                 value={formData.name_en} 
                 onChange={(e) => setFormData({...formData, name_en: e.target.value})} 
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all" 
                 placeholder="e.g. Business Formation"
               />
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-1 block text-right">Service Name (AR) *</label>
               <input 
                 type="text" 
                 dir="rtl" 
                 value={formData.name_ar} 
                 onChange={(e) => setFormData({...formData, name_ar: e.target.value})} 
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all text-right" 
                 placeholder="تأسيس شركة"
               />
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Category *</label>
               <select 
                 value={formData.category} 
                 onChange={(e) => setFormData({...formData, category: e.target.value})} 
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all appearance-none"
               >
                 <option value="company_formation">Company Formation</option>
                 <option value="visa">Visa Services</option>
                 <option value="cr_renewal">CR Renewal</option>
                 <option value="labor">Labor Services</option>
                 <option value="other">Other</option>
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Est. Total Days *</label>
               <input 
                 type="number" 
                 value={formData.estimated_days} 
                 onChange={(e) => setFormData({...formData, estimated_days: Number(e.target.value)})} 
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all" 
               />
             </div>
           </div>

           {/* Financial Strategy */}
           <div className="pt-6 border-t border-border/50">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap size={16} className="text-primary" /> Financial Strategy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Base Work Fee (OMR)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.work_fee} 
                      onChange={(e) => setFormData({...formData, work_fee: Number(e.target.value)})} 
                      className="w-full bg-muted/30 border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-foreground focus:border-primary outline-none transition-all font-mono" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50">OMR</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Ministry Fee (OMR)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.ministry_fee} 
                      onChange={(e) => setFormData({...formData, ministry_fee: Number(e.target.value)})} 
                      className="w-full bg-muted/30 border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-foreground focus:border-primary outline-none transition-all font-mono" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50">OMR</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80 italic">
                These values are defaults. Admins can override these fees per individual project.
              </p>
           </div>

           {/* Appearance & Configuration */}
           <div className="pt-6 border-t border-border/50">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Service Icon</label>
                 <div className="flex flex-wrap gap-3">
                   {AVAILABLE_ICONS.map(i => (
                     <button 
                       key={i.name} 
                       onClick={() => setFormData({...formData, icon: i.name})}
                       className={cn(
                         "w-12 h-12 rounded-xl border flex items-center justify-center transition-all", 
                         formData.icon === i.name 
                          ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(212,175,55,0.15)] scale-105" 
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                       )}
                     >
                       <i.icon size={20} />
                     </button>
                   ))}
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Expiry Validity (Months)</label>
                   <input 
                     type="number" 
                     placeholder="Empty if never expires" 
                     value={formData.expiry_months || ''} 
                     onChange={(e) => setFormData({...formData, expiry_months: e.target.value ? Number(e.target.value) : null})} 
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all" 
                   />
                 </div>
                 
                 <label className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10 cursor-pointer group hover:bg-muted/20 transition-colors">
                   <span className="text-sm font-bold text-foreground">Active Status</span>
                   <button 
                     onClick={() => setFormData({...formData, is_active: !formData.is_active})} 
                     className={cn(
                       "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                       formData.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
                     )}
                   >
                     <span className={cn(
                       "inline-block h-4 w-4 transform rounded-full bg-white transition-transform ml-1",
                       formData.is_active ? "translate-x-5" : "translate-x-0"
                     )} />
                   </button>
                 </label>
               </div>
             </div>
           </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-between">
           <button 
             onClick={() => navigate('/admin/services')} 
             className="px-6 py-2.5 rounded-xl text-muted-foreground text-sm font-bold hover:text-foreground hover:bg-muted transition-colors"
           >
             Cancel
           </button>
           <button 
             onClick={handleSave} 
             disabled={isSaving} 
             className="bg-primary text-[#0A0F1E] px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:scale-100 active:scale-95"
           >
             {isSaving ? (
               <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
             ) : (
               <>
                 Save Service <ArrowRight size={16} />
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;
