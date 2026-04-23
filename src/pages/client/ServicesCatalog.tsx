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

  const [activeTab, setActiveTab] = useState<'packages' | 'services'>('packages');
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
      notes: `Interested via ${item.type === 'package' ? 'Strategic Bundle' : 'Individual Service'}`
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

    const waUrl = `https://wa.me/${cleanPhone.startsWith('968') ? cleanPhone : '968' + cleanPhone}?text=${encodeURIComponent(message)}`;
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
    <div className="space-y-10 pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-card border border-border rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
               <div className="flex items-center gap-2 mb-4">
                  <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-primary/20">
                     Osbic Intelligent Catalog
                  </span>
               </div>
               <h1 className="text-4xl sm:text-5xl font-syne font-bold text-foreground mb-4 leading-tight">
                  Design Your <span className="text-primary">Operational</span> Future
               </h1>
               <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                  Select premium bundles or individual services. Click "I'm Interested" to connect directly with your dedicated account manager.
               </p>
            </div>
            
            <div className="flex bg-muted/50 p-1.5 rounded-[1.5rem] border border-border self-start md:self-center shrink-0 shadow-inner">
               <button 
                onClick={() => setActiveTab('packages')}
                className={cn(
                  "px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'packages' ? "bg-background text-primary shadow-xl" : "text-muted-foreground hover:text-foreground"
                )}
               >
                  <Boxes size={18} /> High-Value Bundles
               </button>
               <button 
                onClick={() => setActiveTab('services')}
                className={cn(
                  "px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                  activeTab === 'services' ? "bg-background text-primary shadow-xl" : "text-muted-foreground hover:text-foreground"
                )}
               >
                  <Briefcase size={18} /> Services
               </button>
            </div>
         </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
         <div className="w-full sm:max-w-md relative group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
               type="text" 
               placeholder={`Search for ${activeTab}...`} 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-card border border-border focus:border-primary/50 text-foreground pl-14 pr-6 py-4 rounded-2xl outline-none transition-all shadow-sm placeholder:text-muted-foreground/40"
            />
         </div>
         <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl">
               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles size={16} />
               </div>
               <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Powered by AI Orchestration</p>
            </div>
         </div>
      </div>

      {/* Grid Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'packages' ? (
          <motion.div 
            key="packages-grid"
            variants={containerAnimations} initial="hidden" animate="show" exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
             {packagesLoading ? (
               [1,2,3].map(i => <Skeleton key={i} height={400} rounded="3xl" />)
             ) : filteredPackages?.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                   <p className="text-muted-foreground">No matches found.</p>
                </div>
             ) : (
               filteredPackages?.map((pkg) => (
                 <motion.div 
                   key={pkg.id} 
                   variants={cardAnimations}
                   onClick={() => setSelectedItem({ ...pkg, type: 'package' })}
                   className="bg-card border border-border rounded-[2rem] p-8 shadow-xl hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
                 >
                    <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0">
                       <ArrowUpRight size={24} className="text-primary" />
                    </div>

                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                       <Boxes size={32} />
                    </div>

                    <div className="space-y-4 mb-10">
                       <div className="flex items-start justify-between gap-4">
                          <h3 className="text-2xl font-syne font-bold text-foreground leading-tight">{pkg.name_en}</h3>
                          {pkg.discount_percentage > 0 && (
                            <span className="shrink-0 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                                -{pkg.discount_percentage}% Bundle
                            </span>
                          )}
                       </div>
                       <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed opacity-70">
                          {pkg.description_en}
                       </p>
                    </div>

                    <div className="space-y-3 mb-10">
                       <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]">Included Expertise</p>
                       <div className="flex flex-wrap gap-2">
                          {pkg.services.map((s, idx) => (
                             <div key={idx} className="bg-muted px-3 py-1.5 rounded-lg text-[10px] font-bold text-foreground flex items-center gap-2">
                                <CheckCircle2 size={12} className="text-primary" />
                                {s.name_en}
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="pt-6 border-t border-border flex items-center justify-between">
                       <div className="flex items-center gap-2 text-primary font-bold text-sm">
                          View Details <ArrowRight size={16} />
                       </div>
                       <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <MessageSquare size={18} />
                       </div>
                    </div>
                 </motion.div>
               ))
             )}
          </motion.div>
        ) : (
          <motion.div 
            key="services-grid"
            variants={containerAnimations} initial="hidden" animate="show" exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
             {servicesLoading ? (
               [1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} height={300} rounded="2xl" />)
             ) : (
               filteredServices?.map((service) => {
                 const Icon = IconMap[service.icon] || Briefcase;
                 return (
                   <motion.div 
                     key={service.id} 
                     variants={cardAnimations}
                     onClick={() => setSelectedItem({ ...service, type: 'service' })}
                     className="bg-card border border-border rounded-3xl p-6 shadow-lg hover:border-primary/40 transition-all cursor-pointer group flex flex-col"
                   >
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all mb-6">
                         <Icon size={24} />
                      </div>
                      
                      <div className="flex-1 mb-8">
                         <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-tight">
                            {service.name_en}
                         </h3>
                         <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted/50 px-2 py-1 rounded border border-border">
                            {CATEGORY_LABELS[service.category] || 'General'}
                         </span>
                      </div>

                      <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                         <div className="flex items-center gap-1.5">
                            <RefreshCw size={12} className="text-primary" /> {service.estimated_days}d SLA
                         </div>
                         <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                   </motion.div>
                 );
               })
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
         {selectedItem && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedItem(null)}
                className="absolute inset-0 bg-background/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card border border-border w-full max-w-2xl rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
              >
                 <div className="p-8 pb-4 flex justify-between items-start">
                    <div className="flex gap-6">
                       <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                          {selectedItem.type === 'package' ? <Boxes size={32} /> : <Briefcase size={32} />}
                       </div>
                       <div>
                          <h2 className="text-3xl font-syne font-bold text-foreground leading-tight mb-2">{selectedItem.name_en}</h2>
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 py-1 bg-muted rounded-full border border-border">
                                {selectedItem.type === 'package' ? 'Strategic Bundle' : CATEGORY_LABELS[selectedItem.category]}
                             </span>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    >
                       <X size={24} />
                    </button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 no-scrollbar">
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">About this Service</h4>
                       <p className="text-base text-muted-foreground leading-relaxed">
                          {selectedItem.description_en || 'Strategic operational fulfillment with end-to-end management for total compliance in the Sultanate of Oman.'}
                       </p>
                    </div>

                    {selectedItem.type === 'package' && (
                       <div className="space-y-4">
                          <h4 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Bundle Inclusions</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {selectedItem.services.map((s, idx) => (
                               <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-muted border border-border">
                                  <div className="w-6 h-6 rounded bg-background flex items-center justify-center text-primary text-[10px] font-bold border border-border">
                                     {idx + 1}
                                  </div>
                                  <span className="text-xs font-bold text-foreground">{s.name_en}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    )}

                    <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex items-start gap-4">
                       <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          <AlertCircle size={20} />
                       </div>
                       <div className="space-y-1">
                          <p className="text-sm font-bold text-primary uppercase tracking-widest">Efficiency Standard (SLA)</p>
                          <p className="text-xs text-primary/70">Estimated completion in {selectedItem.estimated_days || 14} working days. Performance is tracked and audited in real-time.</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-8 border-t border-border bg-muted/30 flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 py-5 bg-background border border-border hover:bg-muted rounded-2xl text-xs font-bold uppercase tracking-widest transition-all text-foreground"
                    >
                       Go Back
                    </button>
                    <button 
                      onClick={() => handleInterestMessage(selectedItem)}
                      className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3"
                    >
                       <MessageSquare size={18} /> I'm Interested — WhatsApp
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
