import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, ArrowRight, Building2,
  Zap, Sparkles, Loader2,
  History as LucideHistory, Check, UserPlus,
  Boxes, LayoutGrid, Info
} from 'lucide-react';
import { useClientSearch } from '../../hooks/shared/useClientSearch';
import type { ClientSearchResult } from '../../hooks/shared/useClientSearch';
import { useDigitalVault } from '../../hooks/shared/useDigitalVault';
import { useCreateJob, useCreatePackageJobs, useLastAssignedEmployee } from '../../hooks/shared/useJobs';
import { useAdminServices } from '../../hooks/admin/useAdminServices';
import { useAdminPackages } from '../../hooks/admin/useAdminPackages';
import { useAdminEmployees } from '../../hooks/admin/useAdminEmployees';
import { useAuth } from '../../contexts/AuthContext';
import ClientPreviewCard from './ClientPreviewCard';
import QuickRegisterForm from './QuickRegisterForm';
import toast from 'react-hot-toast';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preSelectedClientId?: string;
}

const CreateJobModal = ({ isOpen, onClose, preSelectedClientId }: Props) => {
  const { role, profile } = useAuth();
  const isAdmin = role === 'admin';

  // ─── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'search' | 'service' | 'config' | 'launching'>('search');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectionTab, setSelectionTab] = useState<'services' | 'packages'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<{id: string, full_name: string} | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [workFee, setWorkFee] = useState<number>(0);
  const [ministryFee, setMinistryFee] = useState<number>(0);
  const [overrideEmployeeId, setOverrideEmployeeId] = useState<string>('');

  // ─── Data Hooks ────────────────────────────────────────────────────────────
  const { data: searchResults, isLoading: isSearching } = useClientSearch(searchQuery);
  const { data: services } = useAdminServices();
  const { data: packages } = useAdminPackages();
  const { data: employees } = useAdminEmployees();
  const { data: vaultDocs } = useDigitalVault(selectedClient?.id || preSelectedClientId);
  const { data: lastEmployee } = useLastAssignedEmployee(selectedClient?.id || preSelectedClientId);
  
  const createJobMutation = useCreateJob();
  const createPackageJobsMutation = useCreatePackageJobs();

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (preSelectedClientId && isOpen) {
      setSelectedClient({ id: preSelectedClientId, full_name: 'Selected Client' });
      setStep('service');
    }
  }, [preSelectedClientId, isOpen]);

  useEffect(() => {
    if (lastEmployee?.id && !overrideEmployeeId) {
      setOverrideEmployeeId(lastEmployee.id);
    }
  }, [lastEmployee, overrideEmployeeId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleClientSelect = (client: {id: string, full_name: string}) => {
    setSelectedClient(client);
    setStep('service');
    setOverrideEmployeeId('');
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setSelectedPackage(null);
    setWorkFee(service.work_fee || 30);
    setMinistryFee(service.ministry_fee || 20);
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setSelectedService(null);
    
    // Calculate total fees for the package components
    const totalWorkFee = pkg.services.reduce((acc: number, s: any) => acc + (s.work_fee || 30), 0);
    const totalMinistryFee = pkg.services.reduce((acc: number, s: any) => acc + (s.ministry_fee || 20), 0);
    
    // Apply discount only to work fee
    const discountedWorkFee = Math.round(totalWorkFee * (1 - (pkg.discount_percentage / 100)));
    
    setWorkFee(discountedWorkFee);
    setMinistryFee(totalMinistryFee);
  };

  const handleLaunch = async () => {
    const targetClientId = selectedClient?.id || preSelectedClientId;
    if (!targetClientId || (!selectedService && !selectedPackage)) return;
    
    setStep('launching');

    try {
      const employeeId = isAdmin 
        ? (overrideEmployeeId || lastEmployee?.id || profile?.id) 
        : profile?.id;
      
      const commonData = {
        client_id: targetClientId,
        employee_id: employeeId!,
        notes: `Job launched by ${profile?.full_name}`,
        auto_complete_docs: vaultDocs?.map(d => d.document_type) || []
      };

      if (selectedPackage) {
        await createPackageJobsMutation.mutateAsync({
          ...commonData,
          package_id: selectedPackage.id,
          services: selectedPackage.services,
          discount_percentage: selectedPackage.discount_percentage,
          custom_work_fee: workFee,
          custom_ministry_fee: ministryFee
        });
        toast.success(`Bundle of ${selectedPackage.services.length} jobs launched!`);
      } else {
        await createJobMutation.mutateAsync({
          ...commonData,
          service_id: selectedService.id,
          total_fee: workFee + ministryFee,
          work_fee: workFee,
          ministry_fee: ministryFee
        });
        toast.success('Job workflow built successfully!');
      }

      setTimeout(() => {
        onClose();
        reset();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message);
      setStep('config');
    }
  };

  const reset = () => {
    setStep('search');
    setMode('existing');
    setSelectionTab('services');
    setSearchQuery('');
    setSelectedClient(null);
    setSelectedService(null);
    setSelectedPackage(null);
    setWorkFee(0);
    setMinistryFee(0);
    setOverrideEmployeeId('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-card border border-border rounded-[32px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] border-t-gold/30"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Zap size={20} className="text-primary" /> Launch New Project
              </h2>
              <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-[0.2em] mt-1">Smart Orchestration System</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8">
            {/* Step 1: Search */}
            {step === 'search' && (
              <div className="space-y-6">
                <div className="flex bg-background p-1 rounded-2xl border border-border">
                  <button onClick={() => setMode('existing')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", mode === 'existing' ? 'bg-primary text-[#0A0F1E] shadow-lg shadow-gold/20' : 'text-muted-foreground/60 hover:text-foreground')}>Existing Client</button>
                  <button onClick={() => setMode('new')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", mode === 'new' ? 'bg-primary text-[#0A0F1E] shadow-lg shadow-gold/20' : 'text-muted-foreground/60 hover:text-foreground')}>New Client</button>
                </div>
                {mode === 'existing' ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                      <input type="text" placeholder="Search by Phone, CR, or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-5 text-lg text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-gold/50 shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {isSearching && <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-primary" size={32} /></div>}
                      {searchResults?.map((client: ClientSearchResult) => <ClientPreviewCard key={client.id} client={client} onSelect={() => handleClientSelect(client)} />)}
                    </div>
                  </div>
                ) : <QuickRegisterForm onSuccess={(client) => handleClientSelect(client)} />}
              </div>
            )}

            {/* Step 2: Service/Package Selection */}
            {step === 'service' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">{selectedClient?.full_name[0] || 'C'}</div>
                    <p className="text-sm font-bold text-foreground">{selectedClient?.full_name || 'Client'}</p>
                  </div>
                  <div className="flex bg-background/50 p-1 rounded-xl border border-border">
                    <button onClick={() => setSelectionTab('services')} className={cn("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", selectionTab === 'services' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground")}>
                      <LayoutGrid size={14} /> Services
                    </button>
                    <button onClick={() => setSelectionTab('packages')} className={cn("px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", selectionTab === 'packages' ? "bg-primary text-[#0A0F1E]" : "text-muted-foreground")}>
                      <Boxes size={14} /> Packages
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                   {selectionTab === 'services' ? (
                     services?.map((service: any) => (
                       <motion.button
                         key={service.id}
                         whileHover={{ scale: 1.02, y: -2 }}
                         onClick={() => handleServiceSelect(service)}
                         className={cn("p-6 rounded-3xl border flex flex-col items-center text-center gap-4 transition-all", selectedService?.id === service.id ? 'bg-primary border-gold text-[#0A0F1E]' : 'bg-white/5 border-border hover:border-gold/30 hover:bg-primary/5 text-foreground')}
                       >
                         <div className={cn("p-3 rounded-2xl", selectedService?.id === service.id ? 'bg-background/20' : 'bg-white/10')}><Building2 size={24} /></div>
                         <p className="text-xs font-bold uppercase tracking-widest">{service.name_en}</p>
                       </motion.button>
                     ))
                   ) : (
                     packages?.map((pkg: any) => (
                       <motion.button
                         key={pkg.id}
                         whileHover={{ scale: 1.02, y: -2 }}
                         onClick={() => handlePackageSelect(pkg)}
                         className={cn("p-6 rounded-3xl border flex flex-col items-center text-center gap-4 transition-all relative overflow-hidden", selectedPackage?.id === pkg.id ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50 text-foreground')}
                       >
                         {pkg.discount_percentage > 0 && (
                            <div className="absolute top-2 right-2 bg-white text-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">-{pkg.discount_percentage}%</div>
                         )}
                         <div className={cn("p-3 rounded-2xl", selectedPackage?.id === pkg.id ? 'bg-white/20' : 'bg-emerald-500/10')}><Boxes size={24} className={selectedPackage?.id === pkg.id ? "text-white" : "text-emerald-500"} /></div>
                         <div>
                            <p className="text-xs font-bold uppercase tracking-widest leading-tight">{pkg.name_en}</p>
                            <p className={cn("text-[9px] mt-1 font-bold", selectedPackage?.id === pkg.id ? "text-white/60" : "text-muted-foreground/60")}>{pkg.services?.length} Services Included</p>
                         </div>
                       </motion.button>
                     ))
                   )}
                </div>

                <div className="pt-4 flex justify-end">
                   <button disabled={!selectedService && !selectedPackage} onClick={() => setStep('config')} className="px-8 py-4 bg-primary text-[#0A0F1E] font-bold rounded-2xl flex items-center gap-3 disabled:opacity-30 transition-all hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] group">
                     Configure Entry <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>
            )}

            {/* Step 3: Config */}
            {step === 'config' && (
              <div className="space-y-8">
                <div className="bg-background p-6 rounded-[24px] border border-border">
                   <div className="grid grid-cols-2 gap-8">
                     <div>
                       <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{selectedPackage ? 'Target Package' : 'Target Service'}</p>
                       <p className="text-lg font-bold text-foreground mb-1">{selectedPackage ? selectedPackage.name_en : selectedService?.name_en}</p>
                       {selectedPackage && (
                         <div className="flex gap-1 mb-4 flex-wrap">
                            {selectedPackage.services.map((s: any) => (
                              <span key={s.id} className="text-[8px] py-0.5 px-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-bold">{s.name_en}</span>
                            ))}
                         </div>
                       )}
                       
                       <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-border">
                          <div className={cn("flex justify-between items-center text-xs", selectedPackage && "opacity-60")}>
                             <span className="text-muted-foreground/60 font-bold uppercase tracking-wider">Service Fee</span>
                             <div className="flex items-center gap-2">
                                <span className="text-foreground font-mono">OMR</span>
                                <input type="number" value={workFee} onChange={(e) => setWorkFee(Number(e.target.value))} className="w-16 bg-white/5 border border-border rounded px-2 py-1 text-foreground text-right font-bold outline-none focus:border-gold/50" />
                             </div>
                          </div>
                          <div className={cn("flex justify-between items-center text-xs", selectedPackage && "opacity-60")}>
                             <span className="text-muted-foreground/60 font-bold uppercase tracking-wider">Ministry Fee</span>
                             <div className="flex items-center gap-2">
                                <span className="text-foreground font-mono">OMR</span>
                                <input type="number" value={ministryFee} onChange={(e) => setMinistryFee(Number(e.target.value))} className="w-16 bg-white/5 border border-border rounded px-2 py-1 text-foreground text-right font-bold outline-none focus:border-gold/50" />
                             </div>
                          </div>
                          {selectedPackage && (
                            <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-emerald-400">
                               <div className="flex items-center gap-1.5">
                                  <Sparkles size={12} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Bundle Discount ({selectedPackage.discount_percentage}%)</span>
                               </div>
                            </div>
                          )}
                          <div className="h-[1px] bg-white/5 my-1" />
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Launch Total</span>
                             <span className="text-lg font-bold text-foreground font-syne">{workFee + ministryFee} <span className="text-[10px] text-muted-foreground/60">OMR</span></span>
                          </div>
                       </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-4">
                           <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-4">Ownership Assignment</p>
                           {isAdmin ? (
                             <div className="p-4 bg-white/5 border border-border rounded-2xl space-y-3">
                               <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] flex items-center gap-2"><UserPlus size={12} className="text-primary" /> Staff Selection</p>
                               <select value={overrideEmployeeId} onChange={(e) => setOverrideEmployeeId(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-gold/50 appearance-none">
                                  <option value="" disabled>Select Employee...</option>
                                  <option value={profile?.id}>Assign to Self</option>
                                  {employees?.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                               </select>
                             </div>
                           ) : <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl"><div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">{profile?.full_name?.[0]}</div><div><p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Self-Assigned</p><p className="text-sm font-bold text-foreground">{profile?.full_name}</p></div></div>}
                        </div>

                        {selectedPackage && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                             <Info size={14} className="text-emerald-500 mt-0.5" />
                             <p className="text-[9px] text-emerald-500 font-medium leading-relaxed">This bundle will spawn {selectedPackage.services.length} independent jobs in your pipeline, each tracking its own roadmap but sharing these financial overrides.</p>
                          </div>
                        )}
                     </div>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <button onClick={() => setStep('service')} className="px-6 py-4 rounded-2xl text-xs font-bold text-muted-foreground/60 hover:text-foreground uppercase tracking-widest transition-colors">Back</button>
                   <button onClick={handleLaunch} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-center shadow-lg shadow-blue-600/20 transition-all active:scale-95">Launch {selectedPackage ? 'Bundle Workflow' : 'Job Workflow'}</button>
                </div>
              </div>
            )}

            {/* Step 4: Launching */}
            {step === 'launching' && (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-8">
                 <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-32 h-32 rounded-full border-4 border-border border-t-gold border-r-gold/30" />
                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={32} className="text-primary" /></div>
                 </div>
                 <h3 className="text-xl font-bold text-foreground font-syne uppercase tracking-wider">{selectedPackage ? 'Orchestrating Multi-Service Bundle...' : 'Building Service Blueprint...'}</h3>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateJobModal;
