import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, Save, Loader2, Package, Globe, 
  Trash2, Plus, GripVertical, CheckCircle2, 
  Search, X, AlertCircle, Sparkles, Clock, Layers
} from 'lucide-react';
import { useAdminPackage, useSavePackage } from '../../hooks/admin/useAdminPackages';
import { useAdminServices } from '../../hooks/admin/useAdminServices';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_LABELS: Record<string, string> = {
  company_formation: 'Company Formation',
  visa: 'Visa Services',
  cr_renewal: 'CR Renewal',
  labor: 'Labor Services',
  other: 'Other Services',
};

const PackageForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const { data: pkg, isLoading: isPkgLoading } = useAdminPackage(id);
  const { data: allServices, isLoading: isServicesLoading } = useAdminServices();
  const { mutate: savePkg, isPending: isSaving } = useSavePackage();

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    icon: 'Package',
    discount_percentage: 0,
    is_active: true
  });

  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom Service Form State
  const [customS, setCustomS] = useState({
    name_en: '',
    name_ar: '',
    category: 'other',
    estimated_days: 7,
    isNew: true
  });

  useEffect(() => {
    if (pkg && !isNew) {
      setFormData({
        name_en: pkg.name_en,
        name_ar: pkg.name_ar,
        description_en: pkg.description_en,
        description_ar: pkg.description_ar,
        icon: pkg.icon || 'Package',
        discount_percentage: pkg.discount_percentage,
        is_active: pkg.is_active
      });
      setSelectedServices(pkg.services || []);
    }
  }, [pkg, isNew]);

  const handleToggleService = (service: any) => {
    const isSelected = selectedServices.find(s => s.id === service.id || (s.isNew && s.name_en === service.name_en));
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id && (!s.isNew || s.name_en !== service.name_en)));
    } else {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  const handleAddCustom = () => {
    if (!customS.name_en || !customS.name_ar) return toast.error('Custom service names are required');
    setSelectedServices(prev => [...prev, { ...customS, id: `temp-${Date.now()}` }]);
    setCustomS({ name_en: '', name_ar: '', category: 'other', estimated_days: 7, isNew: true });
    setShowCustomForm(false);
    toast.success('Custom service added to bundle draft');
  };

  const handleSave = () => {
    if (!formData.name_en || !formData.name_ar) {
      return toast.error('Package name is required in both languages');
    }
    if (selectedServices.length === 0) {
      return toast.error('Please select at least one service for this package');
    }

    savePkg({
      ...formData,
      id: isNew ? undefined : id,
      services: selectedServices
    }, {
      onSuccess: () => {
        toast.success(isNew ? 'Package created successfully' : 'Package updated successfully');
        navigate('/admin/packages');
      },
      onError: (err: any) => toast.error(err.message || 'Failed to save package')
    });
  };

  if (isPkgLoading || isServicesLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground animate-pulse">Loading architect tools...</p>
      </div>
    );
  }

  const filteredServicesList = allServices?.filter(s => 
    !selectedServices.find(ss => ss?.id === s?.id) &&
    ((s?.name_en || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (s?.name_ar || '').includes(searchTerm || ''))
  );

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/packages')}
            className="p-3 rounded-2xl bg-card border border-border hover:bg-muted transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-syne font-bold text-foreground">
              {isNew ? 'Architect New Package' : 'Edit Service Bundle'}
            </h1>
            <p className="text-sm text-muted-foreground">Define bundles of services for your clients</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{isNew ? 'Create Bundle' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Basic Info */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} /> Localized Metadata
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Package Name (EN)</label>
                 <input 
                   type="text" 
                   value={formData.name_en}
                   onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                   placeholder="e.g. Sultanate Entry Bundle"
                   className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-2xl outline-none transition-all text-sm font-medium"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1 text-right block">اسم الحزمة (AR)</label>
                 <input 
                   type="text" 
                   value={formData.name_ar}
                   onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                   placeholder="مثال: باقة تأسيس الشركات"
                   dir="rtl"
                   className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-2xl outline-none transition-all text-sm font-medium"
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Detailed Description (EN)</label>
              <textarea 
                rows={3}
                value={formData.description_en}
                onChange={(e) => setFormData({...formData, description_en: e.target.value})}
                placeholder="Describe the value of this bundle to the client..."
                className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-2xl outline-none transition-all text-sm font-medium resize-none"
              />
            </div>
          </section>

          <section className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} /> Bundled Services
                </h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowCustomForm(true)}
                    className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1.5"
                  >
                    <Sparkles size={12} /> Add Custom
                  </button>
                  <button 
                    onClick={() => setShowServiceSelector(true)}
                    className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5"
                  >
                    <Plus size={12} /> Select Existing
                  </button>
                </div>
             </div>

             <div className="space-y-3">
                {selectedServices.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
                     <Package size={32} className="mx-auto mb-4 text-muted-foreground/20" />
                     <p className="text-sm text-muted-foreground">Select individual services to include in this bundle</p>
                  </div>
                ) : (
                  selectedServices.map((service, index) => (
                    <motion.div 
                      layout
                      key={service.id || service.name_en} 
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all group",
                        service.isNew ? "bg-emerald-500/5 border-emerald-500/20" : "bg-background border-border"
                      )}
                    >
                       <div className="p-2 text-muted-foreground/20">
                          <GripVertical size={16} />
                       </div>
                       <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                        service.isNew ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-primary"
                       )}>
                          {index + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="text-sm font-bold text-foreground truncate">{service.name_en}</p>
                             {service.isNew && (
                               <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Custom New</span>
                             )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/60">{CATEGORY_LABELS[service.category] || 'General'}</p>
                       </div>
                       <button 
                        onClick={() => handleToggleService(service)}
                        className="p-2 text-muted-foreground/20 hover:text-red-500 transition-colors"
                       >
                          <Trash2 size={16} />
                       </button>
                    </motion.div>
                  ))
                )}
             </div>
          </section>
        </div>

        {/* Right: Configuration & Status */}
        <div className="space-y-8">
           <section className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Configuration</h3>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Bundle Discount (%)</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         value={formData.discount_percentage}
                         onChange={(e) => setFormData({...formData, discount_percentage: parseInt(e.target.value) || 0})}
                         className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-2xl outline-none transition-all text-sm font-bold pr-12"
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">%</span>
                    </div>
                    <p className="text-[9px] text-emerald-500 font-medium px-1 italic">Clients save because of this bundle</p>
                 </div>

                 <div className="pt-4 flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-foreground">Active Availability</span>
                    <button 
                      onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        formData.is_active ? "bg-primary" : "bg-muted"
                      )}
                    >
                       <span className={cn(
                         "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                         formData.is_active ? "translate-x-6" : "translate-x-1"
                       )} />
                    </button>
                 </div>
              </div>
           </section>

           <section className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                 <CheckCircle2 size={18} />
                 <h4 className="text-xs font-bold uppercase tracking-widest">Package Strength</h4>
              </div>
              <p className="text-xs text-primary/70 leading-relaxed">
                 By bundling these services, you simplify the client's decision path and increase operational volume.
              </p>
           </section>
        </div>
      </div>

      {/* Service Selection Slide-over/Modal */}
      {showServiceSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             onClick={() => setShowServiceSelector(false)}
             className="absolute inset-0 bg-background/80 backdrop-blur-sm"
           />
           <motion.div 
             initial={{ opacity: 0, scale: 0.95, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="bg-card border border-border w-full max-w-xl rounded-3xl overflow-hidden relative z-10 shadow-2xl flex flex-col"
           >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                 <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Select Existing Services</h3>
                 <button onClick={() => setShowServiceSelector(false)} className="p-1 hover:bg-muted rounded-full">
                    <X size={18} />
                 </button>
              </div>

              <div className="p-6 border-b border-border">
                 <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Filter individual services..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-background border border-border p-4 rounded-2xl outline-none focus:border-primary/50 text-sm pl-12"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] space-y-2 no-scrollbar">
                 {filteredServicesList?.length === 0 ? (
                   <div className="p-10 text-center text-muted-foreground">
                      <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No available services found matching your search</p>
                   </div>
                 ) : (
                   filteredServicesList?.map((service) => (
                     <button 
                       key={service.id}
                       onClick={() => handleToggleService(service)}
                       className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-muted transition-all border border-transparent hover:border-border text-left group"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                              <Package size={18} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-foreground">{service.name_en}</p>
                              <p className="text-[10px] text-muted-foreground/60">{CATEGORY_LABELS[service.category] || 'General'}</p>
                           </div>
                        </div>
                        <Plus size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                   ))
                 )}
              </div>

              <div className="p-6 border-t border-border flex gap-3">
                 <button 
                   onClick={() => setShowServiceSelector(false)}
                   className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-bold shadow-lg shadow-primary/20"
                 >
                    Done selecting
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {/* Custom Service Architect Modal */}
      {showCustomForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             onClick={() => setShowCustomForm(false)}
             className="absolute inset-0 bg-background/80 backdrop-blur-sm"
           />
           <motion.div 
             initial={{ opacity: 0, scale: 0.95, y: 20 }}
             animate={{ opacity: 1, scale: 1, y: 0 }}
             className="bg-card border border-border w-full max-w-lg rounded-[2rem] overflow-hidden relative z-10 shadow-3xl flex flex-col"
           >
              <div className="p-8 pb-4 border-b border-border flex justify-between items-center">
                 <div>
                    <h3 className="text-lg font-syne font-bold text-foreground">Custom Service Architect</h3>
                    <p className="text-xs text-muted-foreground">Inject a new service into the operational catalog</p>
                 </div>
                 <button onClick={() => setShowCustomForm(false)} className="p-2 hover:bg-muted rounded-full">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] no-scrollbar">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Service Name (EN)</label>
                       <input 
                         type="text" 
                         value={customS.name_en}
                         onChange={(e) => setCustomS({...customS, name_en: e.target.value})}
                         placeholder="New operational service name..."
                         className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-xl outline-none transition-all text-sm font-medium"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1 text-right block">اسم الخدمة (AR)</label>
                       <input 
                         type="text" 
                         value={customS.name_ar}
                         onChange={(e) => setCustomS({...customS, name_ar: e.target.value})}
                         dir="rtl"
                         className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-xl outline-none transition-all text-sm font-medium"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Category</label>
                       <select 
                         value={customS.category}
                         onChange={(e) => setCustomS({...customS, category: e.target.value})}
                         className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-xl outline-none transition-all text-sm font-medium appearance-none"
                       >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Est. Duration</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            value={customS.estimated_days}
                            onChange={(e) => setCustomS({...customS, estimated_days: parseInt(e.target.value) || 0})}
                            className="w-full bg-background border border-border focus:border-primary/50 p-4 rounded-xl outline-none transition-all text-sm font-bold pr-14"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground tracking-widest">DAYS</span>
                       </div>
                    </div>
                 </div>

                 <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-4">
                    <AlertCircle className="text-emerald-500 mt-0.5" size={16} />
                    <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">
                       This service will be saved permanently as 'Inactive'. You can later define its workflow steps in the Service Management section.
                    </p>
                 </div>
              </div>

              <div className="p-8 border-t border-border flex gap-4">
                 <button 
                   onClick={handleAddCustom}
                   className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                 >
                    Inject into Bundle
                 </button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default PackageForm;
