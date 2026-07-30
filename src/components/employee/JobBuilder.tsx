import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminServices, type Service } from '../../hooks/admin/useAdminServices';
import { useAdminPackages } from '../../hooks/admin/useAdminPackages';
import { useAuth } from '../../contexts/AuthContext';
import { 
  X, Zap, Search, ChevronRight, User, 
  Building2, Briefcase, Plus, CheckCircle2, ArrowLeft, ArrowRight,
  Hash, Users, Shield, GitBranch, Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CreateClientSlideOver from '../shared/clients/CreateClientSlideOver';
import toast from 'react-hot-toast';

// SortableStep from previous implementation, styled for dark theme
const SortableStep = ({ step, onRemove, onAssign, onUpdate, employees, currentUserId }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 group hover:border-gold/30 transition-colors">
      <div {...attributes} {...listeners} className="cursor-grab p-1 text-white/40 hover:text-white">
        <GripVertical size={18} />
      </div>
      <div className="flex-1">
        {step.is_custom ? (
          <div className="space-y-1">
            <input 
              type="text" 
              value={step.name_en} 
              onChange={(e) => onUpdate(step.id, { name_en: e.target.value })} 
              className="font-syne font-bold text-white text-sm bg-transparent border-b border-white/10 outline-none focus:border-gold w-full pb-1"
              placeholder="Step Name"
            />
            <input 
              type="text" 
              value={step.description_en} 
              onChange={(e) => onUpdate(step.id, { description_en: e.target.value })} 
              className="text-xs text-white/60 bg-transparent border-b border-white/10 outline-none focus:border-gold w-full pb-1"
              placeholder="Description..."
            />
          </div>
        ) : (
          <>
            <p className="font-syne font-bold text-white text-sm flex items-center gap-2">
              {step.name_en}
              {step.service_name && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                  {step.service_name}
                </span>
              )}
            </p>
            <p className="text-xs text-white/60">{step.description_en || 'Standard Step'}</p>
          </>
        )}
      </div>

      {step.is_custom && (
        <div className="flex items-center gap-1 w-24">
          <input 
            type="number"
            min="0"
            step="0.1"
            value={step.fee || ''}
            onChange={(e) => onUpdate(step.id, { fee: e.target.value })}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-gold transition-colors text-white"
            placeholder="Fee OMR"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2">
         <User size={14} className="text-white/40" />
         <select 
           value={step.assigned_to || ''} 
           onChange={(e) => onAssign(step.id, e.target.value)}
           className="bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-gold transition-colors text-white"
         >
           <option value="">Unassigned</option>
           {employees.map((emp: any) => (
             <option key={emp.id} value={emp.id}>
               {emp.full_name} {emp.id === currentUserId ? '(Me)' : ''}
             </option>
           ))}
         </select>
      </div>

      <button onClick={() => onRemove(step.id)} className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

// Per-service quantity + fee line item for the wizard
interface ServiceLineItem {
  service_id: string;
  service_name: string;
  service_name_ar: string;
  quantity: number;
  work_fee: number;
  ministry_fee: number;
  is_optional: boolean;
  is_parallel: boolean;
  notes: string;
  estimated_days_min: number;
  estimated_days_max: number;
  requires_pro: boolean;
  isCustom?: boolean;
}

export const JobBuilder = ({ onClose, onJobCreated }: { onClose?: () => void, onJobCreated: () => void }) => {
  const { profile } = useAuth();
  const { data: services, isLoading: loadingServices } = useAdminServices();
  const { data: packages, isLoading: loadingPackages } = useAdminPackages();
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  // Step 1: Client Selection
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Step 2: Service Selection
  const [serviceTab, setServiceTab] = useState<'services' | 'packages'>('services');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Step 3: Configuration — service line items with quantities & fees
  const [serviceLines, setServiceLines] = useState<ServiceLineItem[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [entryType, setEntryType] = useState<'lead' | 'walkin' | 'direct' | 'renewal'>('direct');

  // Init Data
  useEffect(() => {
    const fetchDropdownData = async () => {
      const { data: emps } = await supabase.from('profiles').select('id, full_name').eq('role', 'employee');
      const { data: clis } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'client');
      if (emps) setEmployees(emps);
      if (clis) setClients(clis);
    };
    fetchDropdownData();
    if (profile) setAssignedTo(profile.id);
  }, [profile]);

  // Handle Client Search
  const filteredClients = clients.filter(c => 
    c.full_name !== 'Walk-in Customer' && 
    (c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.phone?.includes(searchQuery))
  );

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedPackage(null);
    setServiceLines([{
      service_id: service.id,
      service_name: service.name_en,
      service_name_ar: service.name_ar,
      quantity: 1,
      work_fee: service.work_fee || 0,
      ministry_fee: service.ministry_fee || 0,
      is_optional: false,
      is_parallel: false,
      notes: '',
      estimated_days_min: service.estimated_days || 0,
      estimated_days_max: service.estimated_days || 0,
      requires_pro: service.requires_pro || false,
    }]);
  };

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setSelectedService(null);
    // Map PackageServiceRelation → ServiceLineItem
    const lines: ServiceLineItem[] = (pkg.services || []).map((ps: any) => {
      const svc = ps.service || ps;
      return {
        service_id: ps.service_id || svc.id,
        service_name: svc.name_en || '',
        service_name_ar: svc.name_ar || '',
        quantity: ps.default_quantity || 1,
        work_fee: svc.work_fee || 0,
        ministry_fee: svc.ministry_fee || 0,
        is_optional: ps.is_optional || false,
        is_parallel: ps.is_parallel || false,
        notes: ps.notes || '',
        estimated_days_min: ps.estimated_days_min || 0,
        estimated_days_max: ps.estimated_days_max || 0,
        requires_pro: svc.requires_pro || false,
      };
    });
    setServiceLines(lines);
  };

  const handleInitiateJob = async () => {
    if (serviceLines.length === 0 || !selectedClient) return;
    setIsCreating(true);

    try {
      // Calculate totals from service lines
      const totalWork = serviceLines.reduce((s, l) => s + (l.work_fee * l.quantity), 0);
      const totalMin = serviceLines.reduce((s, l) => s + (l.ministry_fee * l.quantity), 0);
      const primaryService = serviceLines[0];

      // 1. Create the master Job record
      const { data: jobData, error: jobError } = await (supabase.from('jobs').insert({
        job_code: `JOB-${Math.floor(Math.random() * 100000)}`,
        client_id: selectedClient.id,
        employee_id: profile?.id,
        assigned_by: profile?.id,
        service_id: primaryService.service_id,
        status: 'draft',
        total_fee: totalWork + totalMin,
        work_fee: totalWork,
        ministry_fee: totalMin,
        ministry_fee_type: 'fixed',
        advance_percentage: 0,
        advance_amount: 0,
        remaining_amount: totalWork + totalMin,
        advance_paid: false,
        remaining_paid: false,
        entry_type: entryType,
        sales_employee_id: profile?.id,
        ops_employee_id: assignedTo || profile?.id,
      } as any).select().single() as any);

      if (jobError) throw jobError;
      const job = jobData;

      // 2. Create job_services rows — one per applicant per service
      let displayOrder = 1;
      for (const line of serviceLines) {
        // Create quantity copies for this service
        const rows = Array.from({ length: line.quantity }, (_, i) => ({
          job_id: job.id,
          service_id: line.service_id,
          service_name: line.service_name,
          display_order: displayOrder + i,
          quantity: line.quantity,
          item_number: i + 1,
          applicant_name: null,
          status: 'pending',
          work_fee: line.work_fee,
          ministry_fee: line.ministry_fee,
          total_fee: line.work_fee + line.ministry_fee,
          ops_employee_id: assignedTo || profile?.id,
          assigned_by: profile?.id,
          assigned_at: new Date().toISOString(),
          notes: line.notes || null,
        }));

        const { error: svcErr } = await (supabase.from('job_services').insert(rows as any) as any);
        if (svcErr) throw svcErr;
        displayOrder += line.quantity;
      }

      toast.success('Job created successfully!');
      onJobCreated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initiate job');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full h-full bg-[#1a2130] text-white overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-white/10 flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-gold">
            <Zap size={24} className="fill-gold/20" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-syne text-white tracking-tight">Launch New Project</h2>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Smart Orchestration System</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/5 text-white/60 hover:text-white rounded-full transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <AnimatePresence mode="wait">
          {/* STEP 1: CLIENT */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="flex p-1 bg-black/20 rounded-[20px] border border-white/5 relative">
                 <button 
                   onClick={() => setClientMode('existing')}
                   className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-[16px] transition-all z-10 ${
                     clientMode === 'existing' ? 'text-black shadow-lg' : 'text-white/50 hover:text-white'
                   }`}
                 >
                   Existing Client
                 </button>
                 <button 
                   onClick={() => setClientMode('new')}
                   className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-[16px] transition-all z-10 ${
                     clientMode === 'new' ? 'text-black shadow-lg' : 'text-white/50 hover:text-white'
                   }`}
                 >
                   New Client
                 </button>
                 {/* Sliding background */}
                 <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gold rounded-[16px] transition-all duration-300 ease-out ${
                   clientMode === 'existing' ? 'left-1' : 'left-[50%]'
                 }`} />
              </div>

              {clientMode === 'existing' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search by Phone, CR, or Name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#131824] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-gold outline-none transition-all focus:ring-4 focus:ring-gold/5"
                    />
                  </div>
                  
                  {searchQuery && (
                    <div className="bg-[#131824] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="p-6 text-center text-white/40 text-xs">No clients found matching "{searchQuery}"</div>
                      ) : (
                        filteredClients.map(c => (
                          <button 
                            key={c.id}
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="font-bold text-sm text-white">{c.full_name}</p>
                              <p className="text-xs text-white/50">{c.phone || 'No phone'}</p>
                            </div>
                            <ChevronRight size={16} className="text-white/20 group-hover:text-gold transition-colors" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#131824] border border-white/10 rounded-2xl p-8 text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto text-gold mb-4">
                      <User size={24} />
                   </div>
                   <h3 className="text-lg font-bold">Register New Client</h3>
                   <p className="text-sm text-white/60 mb-6">Open the slide-over panel to register a completely new client profile.</p>
                   <button 
                     onClick={() => setIsCreateClientOpen(true)}
                     className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10"
                   >
                     Open Registration Form
                   </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: SERVICE SELECTION */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-black/20 p-2 rounded-[20px] border border-white/5">
                 <div className="flex items-center gap-4 px-4">
                    <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black font-bold font-syne text-sm">
                      {selectedClient?.full_name?.charAt(0) || 'C'}
                    </div>
                    <span className="font-bold text-sm">{selectedClient?.full_name}</span>
                 </div>
                 
                 <div className="flex p-1 bg-[#131824] rounded-xl border border-white/5 relative">
                   <button 
                     onClick={() => setServiceTab('services')}
                     className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all z-10 flex items-center gap-2 ${
                       serviceTab === 'services' ? 'text-black' : 'text-white/50 hover:text-white'
                     }`}
                   >
                     <Building2 size={12} /> Services
                   </button>
                   <button 
                     onClick={() => setServiceTab('packages')}
                     className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all z-10 flex items-center gap-2 ${
                       serviceTab === 'packages' ? 'text-black' : 'text-white/50 hover:text-white'
                     }`}
                   >
                     <Briefcase size={12} /> Packages
                   </button>
                   <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gold rounded-lg transition-all duration-300 ease-out ${
                     serviceTab === 'services' ? 'left-1' : 'left-[50%]'
                   }`} />
                 </div>
              </div>

              {serviceTab === 'packages' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages?.filter(p => p.is_active).map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      className={`relative overflow-hidden p-6 rounded-[24px] border transition-all text-left group ${
                        selectedPackage?.id === pkg.id 
                          ? 'border-gold bg-gold/5 shadow-[0_0_30px_rgba(212,175,55,0.1)]' 
                          : 'border-white/10 bg-[#131824] hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedPackage?.id === pkg.id ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/60 group-hover:text-white'}`}>
                          <Briefcase size={24} />
                        </div>
                        <div>
                          <h4 className={`font-bold uppercase tracking-wider text-sm leading-tight mb-1 ${selectedPackage?.id === pkg.id ? 'text-gold' : 'text-white'}`}>
                            {pkg.name_en}
                          </h4>
                          <p className="text-xs text-white/50 line-clamp-2 mb-2">{pkg.description_en}</p>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">{pkg.services.length} Services</span>
                            {pkg.discount_percentage > 0 && (
                               <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">-{pkg.discount_percentage}% OFF</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedPackage?.id === pkg.id && (
                        <div className="absolute top-4 right-4 text-gold">
                          <CheckCircle2 size={20} />
                        </div>
                      )}
                    </button>
                  ))}
                  {(!packages || packages.filter(p => p.is_active).length === 0) && (
                     <div className="col-span-full h-[200px] flex items-center justify-center border-2 border-dashed border-white/10 rounded-3xl">
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No active packages found</p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {services?.filter(s => s.is_active).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectService(s)}
                      className={`relative overflow-hidden p-6 rounded-[24px] border transition-all text-left group ${
                        selectedService?.id === s.id 
                          ? 'border-gold bg-gold/5 shadow-[0_0_30px_rgba(212,175,55,0.1)]' 
                          : 'border-white/10 bg-[#131824] hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center text-center h-24 gap-4 relative z-10">
                        <Building2 size={24} className={selectedService?.id === s.id ? 'text-gold' : 'text-white/60 group-hover:text-white'} />
                        <span className={`font-bold uppercase tracking-wider text-[11px] leading-tight ${selectedService?.id === s.id ? 'text-gold' : 'text-white/80 group-hover:text-white'}`}>
                          {s.name_en}
                        </span>
                      </div>
                      {selectedService?.id === s.id && (
                        <div className="absolute top-3 right-3 text-gold">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

            </motion.div>
          )}

          {/* STEP 3: CONFIGURE QUANTITIES & FEES */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-syne font-bold text-lg">
                    {selectedPackage ? selectedPackage.name_en : selectedService?.name_en}
                  </h3>
                  <p className="text-xs text-white/40 mt-1">
                    {selectedPackage ? `Package · ${serviceLines.length} service(s)` : 'Single Service'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total</p>
                  <p className="text-2xl font-bold font-syne text-gold">
                    {(serviceLines.reduce((s, l) => s + (l.work_fee + l.ministry_fee) * l.quantity, 0)).toFixed(2)}
                    <span className="text-sm text-white/40 ml-1">OMR</span>
                  </p>
                </div>
              </div>

              {/* Service Lines Table */}
              <div className="space-y-3">
                {serviceLines.map((line, idx) => (
                  <div key={line.service_id + idx} className="bg-[#131824] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-xs font-bold">{idx + 1}</div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{line.service_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {line.requires_pro && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                              <Shield size={8} /> PRO Required
                            </span>
                          )}
                          {line.is_optional && (
                            <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest">Optional</span>
                          )}
                          {line.is_parallel && (
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                              <GitBranch size={8} /> Parallel
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mt-4">
                      {/* Quantity */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                          <Users size={10} /> Applicants
                        </label>
                        <div className="flex items-center bg-black/30 border border-white/10 rounded-xl p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const newLines = [...serviceLines];
                              newLines[idx].quantity = Math.max(1, newLines[idx].quantity - 1);
                              setServiceLines(newLines);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold transition-colors"
                          >−</button>
                          <span className="flex-1 text-center text-white font-bold text-sm">{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newLines = [...serviceLines];
                              newLines[idx].quantity = newLines[idx].quantity + 1;
                              setServiceLines(newLines);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold transition-colors"
                          >+</button>
                        </div>
                      </div>

                      {/* Work Fee */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Work Fee / item</label>
                        <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 focus-within:border-gold rounded-xl px-3 py-2 transition-colors min-w-0">
                          <span className="text-white/30 text-[9px] font-bold shrink-0">OMR</span>
                          <input
                            type="number"
                            step="0.001"
                            value={line.work_fee}
                            onChange={(e) => {
                              const newLines = [...serviceLines];
                              newLines[idx].work_fee = Number(e.target.value);
                              setServiceLines(newLines);
                            }}
                            className="w-full min-w-0 bg-transparent outline-none text-sm text-white font-bold text-right"
                          />
                        </div>
                      </div>

                      {/* Ministry Fee */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ministry Fee / item</label>
                        <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 focus-within:border-gold rounded-xl px-3 py-2 transition-colors min-w-0">
                          <span className="text-white/30 text-[9px] font-bold shrink-0">OMR</span>
                          <input
                            type="number"
                            step="0.001"
                            value={line.ministry_fee}
                            onChange={(e) => {
                              const newLines = [...serviceLines];
                              newLines[idx].ministry_fee = Number(e.target.value);
                              setServiceLines(newLines);
                            }}
                            className="w-full min-w-0 bg-transparent outline-none text-sm text-white font-bold text-right"
                          />
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Line Total</label>
                        <div className="bg-gold/10 border border-gold/20 rounded-xl px-3 py-2 text-right h-[38px] flex items-center justify-end">
                          <span className="text-gold font-bold text-xs">
                            {((line.work_fee + line.ministry_fee) * line.quantity).toFixed(3)} OMR
                          </span>
                        </div>
                      </div>
                    </div>

                    {line.notes && (
                      <p className="mt-3 text-[10px] text-white/30 italic border-t border-white/5 pt-3">{line.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Assignment */}
              <div className="bg-[#131824] border border-white/10 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Operations Handler</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none cursor-pointer transition-colors"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#131824] text-white">
                        {emp.full_name}{emp.id === profile?.id ? ' (Me)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Entry Type</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none cursor-pointer transition-colors"
                  >
                    <option value="direct" className="bg-[#131824]">Direct</option>
                    <option value="lead" className="bg-[#131824]">From Lead</option>
                    <option value="walkin" className="bg-[#131824]">Walk-in</option>
                    <option value="renewal" className="bg-[#131824]">Renewal</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-8 py-6 bg-black/40 border-t border-white/10 shrink-0 flex items-center justify-between">
        <div>
           {step > 1 && (
             <button 
               onClick={() => setStep(step - 1)}
               className="px-6 py-3 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
             >
               <ArrowLeft size={16} /> Back
             </button>
           )}
        </div>
        <div className="flex items-center gap-3">
           {/* Step indicator */}
           <div className="flex items-center gap-1.5">
             {[1,2,3].map(s => (
               <div key={s} className={`h-1 rounded-full transition-all ${s === step ? 'w-6 bg-gold' : s < step ? 'w-3 bg-gold/40' : 'w-3 bg-white/10'}`} />
             ))}
           </div>
           {step === 2 && (
             <button 
               onClick={() => setStep(3)}
               disabled={serviceLines.length === 0}
               className="px-8 py-3 bg-[#64748b] hover:bg-[#475569] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-30 flex items-center gap-2"
             >
               Configure <ArrowRight size={16} />
             </button>
           )}
           {step === 3 && (
             <button 
               onClick={handleInitiateJob}
               disabled={isCreating || serviceLines.length === 0}
               className="px-8 py-3 bg-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 flex items-center gap-2"
             >
               {isCreating ? 'Launching...' : (<>Launch Job <Zap size={16} /></>)}
             </button>
           )}
        </div>
      </div>

      {isCreateClientOpen && (
        <CreateClientSlideOver
          isOpen={isCreateClientOpen}
          onClose={() => {
            setIsCreateClientOpen(false);
            // Re-fetch to show new client
            supabase.from('profiles').select('id, full_name, phone').eq('role', 'client').then(({data}) => {
              if (data) setClients(data);
            });
          }}
        />
      )}
    </div>
  );
};
