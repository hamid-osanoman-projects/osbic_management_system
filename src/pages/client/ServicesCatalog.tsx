import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Boxes, Search, Filter, ArrowRight, 
  CheckCircle2, Sparkles, Building2, BookOpen, 
  RefreshCw, Users, FileText, AlertCircle, 
  X, Loader2, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { useAdminServices } from '../../hooks/admin/useAdminServices';
import { useClientPackages, useRequestPackage } from '../../hooks/client/useClientPackages';
import { useLastAssignedEmployee } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import { useSupport } from '../../hooks/shared/useSupport';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IconMap: Record<string, any> = {
  Building2, BookOpen, RefreshCw, Users, FileText, Briefcase, Boxes
};

const CATEGORY_LABELS: Record<string, string> = {
  company_formation: 'Company Formation',
  visa: 'Visa Services',
  cr_renewal: 'CR Renewal',
  labor: 'Labor Services',
  other: 'Other Services',
};

const ServicesCatalog = () => {
  const { profile } = useAuth();
  const { data: services, isLoading: servicesLoading } = useAdminServices();
  const { data: packages, isLoading: packagesLoading } = useClientPackages();
  const { mutate: requestPkg, isPending: isRequestingPkg } = useRequestPackage();
  const { data: assignedEmployee } = useLastAssignedEmployee(profile?.id);
  const { createInterest } = useSupport();

  const [activeTab, setActiveTab] = useState<'packages' | 'services'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const filteredServices = services?.filter(s => 
    s.is_active && (
      s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.name_ar.includes(searchQuery)
    )
  );

  const filteredPackages = packages?.filter(p => 
    p.is_active && (
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.name_ar.includes(searchQuery)
    )
  );

  // ─── Direct WhatsApp Interest Logic ─────────────────────────────────────────
  const handleInterestMessage = (item: any) => {
    if (!profile) return toast.error('Please sign in to proceed');

    // 1. Notarize interest in the system
    createInterest.mutate({
      client_id: profile.id,
      service_id: item.id,
      notes: `Interested via ${item.type === 'package' ? 'Bundle' : 'Service'}`
    });

    // Priority 1: Assigned Employee
    // Priority 2: Primary Office WhatsApp (72229827)
    const targetPhone = assignedEmployee?.phone || '96872229827'; 
    const cleanPhone = targetPhone.replace(/\D/g, '');
    
    const message = `Hello! 🌿

I am interested in the following service:
🔹 *${item.name_en}* ${item.type === 'package' ? '[Bundle]' : ''}

*Client Details:*
• Name: ${profile.full_name}
• ID: ${profile.id.slice(0, 8)}

Please guide me on the documents and fees required to initiate this project. Thank you!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('968') ? cleanPhone : '968' + cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    
    toast.success('Interest logged. Redirecting to your manager...');
    setSelectedItem(null);
  };

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const cardAnimations = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

   return (
    <div className="h-full flex flex-col overflow-hidden relative">
      
      {/* ── Fixed Header & Search Section ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-6 bg-background/80 backdrop-blur-2xl z-20 sticky top-0 border-b border-white/[0.02]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-primary/20 shadow-sm">
                 Browse Catalog
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-syne font-bold text-foreground mb-3 leading-none tracking-tight">
               Our <span className="text-primary">Services</span>
            </h1>
            <p className="hidden sm:block text-muted-foreground/40 text-[10px] uppercase font-black tracking-widest leading-relaxed max-w-lg">
               Choose from our premium service packages or individual options. Connect with our team to get started.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 self-start shrink-0 shadow-inner">
            <button 
              onClick={() => setActiveTab('services')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'services' ? "bg-primary text-primary-foreground shadow-lg scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase size={14} strokeWidth={2.5} /> Services
            </button>
            <button 
              onClick={() => setActiveTab('packages')}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'packages' ? "bg-primary text-primary-foreground shadow-lg scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Boxes size={14} strokeWidth={2.5} /> Packages
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
           <div className="w-full sm:max-w-2xl relative group">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <input 
                 type="text" 
                 placeholder={`Search ${activeTab === 'packages' ? 'Bundles' : 'Modules'}...`} 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-card/50 backdrop-blur-md border border-white/5 focus:border-primary/30 text-foreground pl-14 pr-6 py-4 rounded-[20px] outline-none transition-all shadow-sm placeholder:text-muted-foreground/20 text-xs font-bold"
              />
           </div>
           <div className="hidden sm:flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/5 rounded-[20px] backdrop-blur-md">
              <Sparkles size={14} className="text-primary" />
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Smart Selection</p>
           </div>
        </div>
      </div>

      {/* ── Scrollable Catalog Grid ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-12 pt-8 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'packages' ? (
            <motion.div 
              key="packages-grid"
              variants={containerAnimations} initial="hidden" animate="show" exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto"
            >
               {packagesLoading ? (
                 [1,2,3].map(i => <Skeleton key={i} height={450} rounded="3xl" />)
               ) : filteredPackages?.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                     <p className="text-muted-foreground/40 uppercase font-black tracking-widest text-[10px]">No matches in the repository.</p>
                  </div>
               ) : (
                 filteredPackages?.map((pkg) => (
                   <motion.div 
                     key={pkg.id} 
                     variants={cardAnimations}
                     onClick={() => setSelectedItem({ ...pkg, type: 'package' })}
                     className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                   >
                      {/* Blueprint Grid Background */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '15px 15px' }} />
                      
                      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                         <ArrowUpRight size={18} className="text-primary" />
                      </div>

                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all shadow-inner relative z-10">
                         <Boxes size={20} />
                      </div>

                      <div className="space-y-3 mb-6 relative z-10 flex-1">
                         <div className="flex items-start justify-between gap-4">
                            <h3 className="text-lg font-syne font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors">{pkg.name_en}</h3>
                            {pkg.discount_percentage > 0 && (
                              <span className="shrink-0 bg-emerald-500/10 text-emerald-400 text-[7px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-[0.1em]">
                                 Bundle
                              </span>
                            )}
                         </div>
                         <p className="text-[10px] text-muted-foreground/50 line-clamp-2 leading-relaxed font-medium">
                            {pkg.description_en}
                         </p>
                      </div>

                      <div className="space-y-3 mb-8 relative z-10">
                         <p className="text-[8px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">Core Modules</p>
                         <div className="grid grid-cols-1 gap-1.5">
                            {pkg.services.slice(0, 3).map((s, idx) => (
                               <div key={idx} className="bg-white/5 px-3 py-1.5 rounded-lg text-[8px] font-bold text-foreground flex items-center gap-2 border border-white/[0.02]">
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                  {s.name_en}
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="relative z-10">
                         <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/5 group-hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                           View Bundle <ArrowUpRight size={12} strokeWidth={3} />
                         </button>
                      </div>
                   </motion.div>
                 ))
               )}
            </motion.div>
          ) : (
            <motion.div 
              key="services-grid"
              variants={containerAnimations} initial="hidden" animate="show" exit="hidden"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto"
            >
               {servicesLoading ? (
                 [1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} height={320} rounded="3xl" />)
               ) : (
                 filteredServices?.map((service) => {
                   const Icon = IconMap[service.icon] || Briefcase;
                   return (
                     <motion.div 
                       key={service.id} 
                       variants={cardAnimations}
                       onClick={() => setSelectedItem({ ...service, type: 'service' })}
                       className="bg-card/40 backdrop-blur-xl border border-border rounded-[32px] p-6 shadow-xl hover:border-primary/30 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                     >
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '15px 15px' }} />
                        
                        <div className="w-12 h-12 bg-white/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-6 border border-border">
                           <Icon size={20} />
                        </div>
                        
                        <div className="flex-1 mb-8 relative z-10">
                           <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-tight tracking-tight">
                              {service.name_en}
                           </h3>
                           <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] bg-muted px-2 py-1 rounded border border-border">
                              {CATEGORY_LABELS[service.category] || 'Module'}
                           </span>
                        </div>

                        <div className="pt-6 border-t border-border flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 relative z-10">
                           <div className="flex items-center gap-2">
                              <RefreshCw size={10} className="text-primary" /> {service.estimated_days}d cycle
                           </div>
                           <ArrowRight size={14} className="-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </div>
                     </motion.div>
                   );
                 })
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
         {selectedItem && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
                className="absolute inset-0 bg-[#0A0F1E]/95 backdrop-blur-xl"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card border border-border w-full max-w-2xl rounded-[40px] overflow-hidden relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]"
              >
                 <div className="p-10 pb-4 flex justify-between items-start">
                    <div className="flex gap-6">
                       <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0 border border-primary/20">
                          {selectedItem.type === 'package' ? <Boxes size={36} /> : <Briefcase size={36} />}
                       </div>
                       <div>
                          <h2 className="text-3xl font-syne font-bold text-foreground leading-none mb-3 tracking-tight">{selectedItem.name_en}</h2>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                                {selectedItem.type === 'package' ? 'Service Package' : 'Individual Service'}
                             </span>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-muted-foreground/40 transition-all border border-white/5"
                    >
                       <X size={20} />
                    </button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-10 no-scrollbar">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.4em]">Service Details</h4>
                       <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">
                          {selectedItem.description_en || 'Professional service management to handle all your requirements.'}
                       </p>
                    </div>

                    {selectedItem.type === 'package' && (
                       <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.4em]">Module Components</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {selectedItem.services.map((s, idx) => (
                               <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] group hover:border-primary/30 transition-all">
                                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs font-black border border-primary/20">
                                     {(idx + 1).toString().padStart(2, '0')}
                                  </div>
                                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{s.name_en}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    )}

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[32px] p-8 flex items-start gap-6 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16" />
                       <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
                          <CheckCircle2 size={24} />
                       </div>
                       <div className="space-y-2 relative z-10">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Operational Cycle</p>
                          <p className="text-xs text-muted-foreground/60 leading-relaxed font-medium">Estimated architecture completion in <span className="text-foreground font-black">{selectedItem.estimated_days || 14} working days</span>. Real-time status reporting enabled.</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-10 border-t border-border bg-muted/20 flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 py-5 bg-card border border-border hover:bg-muted rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all text-muted-foreground/60"
                    >
                       Dismiss
                    </button>
                    <button 
                      onClick={() => handleInterestMessage(selectedItem)}
                      className="flex-[2] py-5 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95"
                    >
                       <MessageSquare size={18} strokeWidth={2.5} /> Request Service
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default ServicesCatalog;
