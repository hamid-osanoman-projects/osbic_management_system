import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminServices, type Service } from '../../hooks/admin/useAdminServices';
import { useAdminPackages } from '../../hooks/admin/useAdminPackages';
import { useAuth } from '../../contexts/AuthContext';
import { 
  X, Zap, Search, ChevronRight, User, 
  Building2, Briefcase, Plus, GripVertical, CheckCircle2, ArrowLeft, ArrowRight 
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../lib/supabase';
import CreateClientSlideOver from '../shared/clients/CreateClientSlideOver';

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
  const [packageServices, setPackageServices] = useState<any[]>([]);
  const [isAddingCustomService, setIsAddingCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Step 3: Configuration
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [ministryFee, setMinistryFee] = useState<number>(0);
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Step 4: Workflow Canvas
  const [customSteps, setCustomSteps] = useState<any[]>([]);

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

  const handleSelectService = async (service: Service) => {
    setSelectedService(service);
    setSelectedPackage(null);
    setServiceFee(service.work_fee || 0);
    setMinistryFee(service.ministry_fee || 0);
    
    // Pre-fetch workflow steps for Step 4
    const { data: wfSteps } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('service_id', service.id)
      .order('step_order', { ascending: true });

    if (wfSteps) {
      setCustomSteps((wfSteps as any[]).map(st => ({
        ...st,
        id: `template-${st.id}`,
        original_step_id: st.id,
        assigned_to: assignedTo
      })));
    } else {
      setCustomSteps([]);
    }
  };

  const handleSelectPackage = async (pkg: any) => {
    setSelectedPackage(pkg);
    setSelectedService(null);
    setPackageServices(pkg.services || []);
    
    const totalWorkFee = pkg.services.reduce((acc: number, s: any) => acc + (s.work_fee || 0), 0);
    const totalMinFee = pkg.services.reduce((acc: number, s: any) => acc + (s.ministry_fee || 0), 0);
    const discount = pkg.discount_percentage || 0;
    const discountedWorkFee = totalWorkFee * (1 - (discount / 100));
    
    setServiceFee(discountedWorkFee);
    setMinistryFee(totalMinFee);
  };

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCustomSteps((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleInitiateJob = async () => {
    if ((!selectedService && !selectedPackage) || !selectedClient) return;
    setIsCreating(true);

    try {
      if (selectedPackage) {
        const jobCodePrefix = `JOB-${Math.floor(Math.random() * 100000)}`;
        
        // Fetch default workflow steps for all selected package services
        const serviceIds = packageServices.map(s => s.id);
        const { data: defaultSteps } = await supabase
          .from('workflow_steps')
          .select('*')
          .in('service_id', serviceIds)
          .order('step_order', { ascending: true });

        for (let i = 0; i < packageServices.length; i++) {
           let srv = packageServices[i];
           
           // If it's a custom on-the-fly service, insert it first
           if (srv.isNew) {
              const { data: newSrv, error: createSrvErr } = await supabase.from('services').insert({
                 name_en: srv.name_en,
                 name_ar: srv.name_en,
                 category: 'other',
                 icon: 'Briefcase',
                 description_en: 'Custom requirement for client',
                 description_ar: 'متطلب خاص للعميل',
                 is_active: false,
                 estimated_days: 7,
                 work_fee: 0,
                 ministry_fee: 0
              } as any).select().single() as any;
              
              if (createSrvErr) throw createSrvErr;
              srv = newSrv;
           }

           const jWorkFee = i === 0 ? serviceFee : 0;
           const jMinFee = i === 0 ? ministryFee : 0;
           
           const { data: jobData, error: jobError } = await supabase.from('jobs').insert({
              job_code: `${jobCodePrefix}-${i+1}`,
              client_id: selectedClient.id,
              employee_id: profile?.id,
              assigned_by: profile?.id,
              service_id: srv.id,
              status: 'draft',
              total_fee: jWorkFee + jMinFee,
              work_fee: jWorkFee,
              ministry_fee: jMinFee,
              ministry_fee_type: 'fixed',
              advance_percentage: 0,
              advance_amount: 0,
              remaining_amount: jWorkFee + jMinFee,
              advance_paid: false,
              remaining_paid: false,
           } as any).select().single();
           
           if (jobError) throw jobError;
           
           const serviceSteps = (defaultSteps || []).filter(st => st.service_id === srv.id);
           
           const stepsToInsert = serviceSteps.map(st => ({
              job_id: jobData.id,
              workflow_step_id: st.id,
              custom_name: null,
              assigned_to: assignedTo,
              assigned_by: profile?.id,
              status: 'pending',
              is_client_visible: st.is_client_visible,
              notes: null
           }));
           
           if (stepsToInsert.length > 0) {
              const { error: stepsError } = await supabase.from('job_steps').insert(stepsToInsert as any);
              if (stepsError) throw stepsError;
           }
        }
      } else if (selectedService) {
        const { data, error: jobError } = await supabase.from('jobs').insert({
          job_code: `JOB-${Math.floor(Math.random() * 100000)}`,
          client_id: selectedClient.id,
          employee_id: profile?.id,
          assigned_by: profile?.id,
          service_id: selectedService.id,
          status: 'draft',
          total_fee: serviceFee + ministryFee,
          work_fee: serviceFee,
          ministry_fee: ministryFee,
          ministry_fee_type: 'fixed',
          advance_percentage: 0,
          advance_amount: 0,
          remaining_amount: serviceFee + ministryFee,
          advance_paid: false,
          remaining_paid: false,
        } as any).select().single();

        if (jobError) throw jobError;
        const job = data as any;

        const stepsToInsert = customSteps.map((st) => ({
          job_id: job.id,
          workflow_step_id: st.original_step_id || null,
          custom_name: st.is_custom ? st.name_en : null,
          assigned_to: st.assigned_to,
          assigned_by: profile?.id,
          status: 'pending',
          is_client_visible: true,
          notes: st.is_custom ? `Custom Step: ${st.description_en}` : null
        }));

        if (stepsToInsert.length > 0) {
          const { error: stepsError } = await supabase.from('job_steps').insert(stepsToInsert as any);
          if (stepsError) throw stepsError;
        }
      }

      onJobCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to initiate job');
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

          {/* STEP 3: CONFIGURATION */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Financials Box */}
                 <div className="bg-[#131824] border border-white/10 rounded-[32px] p-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4">Target {selectedPackage ? 'Package' : 'Service'}</p>
                    <h3 className="text-2xl font-bold font-syne text-white mb-8">{selectedPackage ? selectedPackage.name_en : selectedService?.name_en}</h3>
                    
                    <div className="space-y-4 mb-8 border-b border-white/10 pb-8">
                       <div className="flex items-center justify-between group">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Service Fee</span>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">OMR</span>
                             <input 
                               type="number"
                               value={serviceFee}
                               onChange={(e) => setServiceFee(Number(e.target.value))}
                               className="w-24 bg-black/40 border border-white/10 focus:border-gold rounded-lg px-3 py-2 text-right text-sm font-bold text-white outline-none transition-colors"
                             />
                          </div>
                       </div>
                       <div className="flex items-center justify-between group">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Ministry Fee</span>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">OMR</span>
                             <input 
                               type="number"
                               value={ministryFee}
                               onChange={(e) => setMinistryFee(Number(e.target.value))}
                               className="w-24 bg-black/40 border border-white/10 focus:border-gold rounded-lg px-3 py-2 text-right text-sm font-bold text-white outline-none transition-colors"
                             />
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-end justify-between">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Launch Total</span>
                       <span className="text-3xl font-bold text-white">{(serviceFee + ministryFee).toFixed(2)} <span className="text-sm text-white/50">OMR</span></span>
                    </div>
                 </div>

                 {/* Assignment Box */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Ownership Assignment</p>
                    <div className="bg-[#131824] border border-white/10 hover:border-white/30 transition-all rounded-3xl p-6 flex items-center gap-4 cursor-pointer">
                       <div className="w-12 h-12 rounded-full bg-[#1e3a8a] flex items-center justify-center text-blue-100 font-bold text-lg font-syne">
                         {employees.find(e => e.id === assignedTo)?.full_name?.charAt(0) || 'A'}
                       </div>
                       <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">
                            {assignedTo === profile?.id ? 'Self-Assigned' : 'Delegated to Coworker'}
                          </p>
                          <select
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="bg-transparent text-white font-bold text-lg outline-none cursor-pointer appearance-none"
                          >
                             {employees.map(emp => (
                               <option key={emp.id} value={emp.id} className="bg-[#131824] text-sm">
                                 {emp.full_name}
                               </option>
                             ))}
                          </select>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: WORKFLOW CANVAS */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <h3 className="font-syne font-bold text-lg flex items-center gap-2">
                  <Building2 size={18} className="text-gold" />
                  {selectedPackage ? 'Package Contents: ' + selectedPackage.name_en : 'Editing Canvas: ' + selectedService?.name_en}
                </h3>
                <span className="text-xs bg-gold/10 text-gold px-3 py-1 rounded-full font-bold border border-gold/20">
                  {selectedPackage ? `${packageServices.length} Services` : `${customSteps.length} Steps`}
                </span>
              </div>
              
              {selectedPackage ? (
                <div className="space-y-3">
                  {packageServices.map((srv: any) => (
                    <div key={srv.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/50">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="font-syne font-bold text-white text-sm">{srv.name_en}</p>
                          <p className="text-xs text-white/50 line-clamp-1">{srv.description_en || 'Standard Service'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPackageServices(packageServices.filter(s => s.id !== srv.id))}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Remove Service"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <div 
                          className="w-full bg-black/20 border border-white/10 hover:border-white/30 rounded-xl px-4 py-3 text-sm text-white/50 hover:text-white cursor-pointer flex justify-between items-center transition-all"
                          onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                        >
                          <span className="flex items-center gap-2"><Plus size={16} /> Add Existing Service...</span>
                          <ChevronRight size={16} className={`transform transition-transform ${isServiceDropdownOpen ? 'rotate-90' : ''}`} />
                        </div>

                        {isServiceDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#131824] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
                            <div className="p-2 border-b border-white/5 relative">
                               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                               <input 
                                 type="text"
                                 placeholder="Search services..."
                                 value={serviceSearchQuery}
                                 onChange={e => setServiceSearchQuery(e.target.value)}
                                 className="w-full bg-black/20 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-gold transition-colors"
                                 autoFocus
                               />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                              {services
                                ?.filter(s => s.is_active)
                                ?.filter(s => !packageServices.find(ps => ps.id === s.id))
                                ?.filter(s => s.name_en.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || s.name_ar.includes(serviceSearchQuery))
                                .map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => {
                                      setPackageServices([...packageServices, s]);
                                      setIsServiceDropdownOpen(false);
                                      setServiceSearchQuery('');
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-gold/10 rounded-lg transition-colors flex items-center justify-between group"
                                  >
                                    {s.name_en}
                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-gold transition-opacity" />
                                  </button>
                              ))}
                              {services?.filter(s => !packageServices.find(ps => ps.id === s.id) && (s.name_en.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || s.name_ar.includes(serviceSearchQuery))).length === 0 && (
                                <div className="p-4 text-center text-white/30 text-xs">No services found matching your search.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          setIsAddingCustomService(!isAddingCustomService);
                          setIsServiceDropdownOpen(false);
                        }}
                        className={`px-6 py-3 border rounded-xl text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                          isAddingCustomService 
                            ? 'bg-gold/10 border-gold/30 text-gold' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                        }`}
                      >
                        + Custom
                      </button>
                    </div>
                    
                    {isAddingCustomService && (
                      <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                         <input 
                           type="text"
                           value={customServiceName}
                           onChange={e => setCustomServiceName(e.target.value)}
                           placeholder="Type custom service name..."
                           className="flex-1 bg-transparent border-none text-sm text-white px-2 py-1 outline-none"
                           autoFocus
                         />
                         <button 
                           onClick={() => {
                             if (customServiceName.trim()) {
                               setPackageServices([...packageServices, { 
                                 id: `custom-${Date.now()}`, 
                                 name_en: customServiceName.trim(), 
                                 description_en: 'Custom client requirement',
                                 isNew: true 
                               }]);
                               setCustomServiceName('');
                               setIsAddingCustomService(false);
                             }
                           }}
                           className="px-4 py-2 bg-gold text-black font-bold text-xs uppercase rounded-lg hover:bg-yellow-500 transition-colors"
                         >
                           Add
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={customSteps} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {customSteps.map(st => (
                           <SortableStep 
                             key={st.id} 
                             step={st} 
                             onRemove={(id: string) => setCustomSteps(customSteps.filter(s => s.id !== id))}
                             onAssign={(id: string, empId: string) => setCustomSteps(customSteps.map(s => s.id === id ? { ...s, assigned_to: empId } : s))}
                             onUpdate={(id: string, updates: any) => setCustomSteps(customSteps.map(s => s.id === id ? { ...s, ...updates } : s))}
                             employees={employees}
                             currentUserId={profile?.id}
                           />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <button 
                    onClick={() => {
                      const newStep = {
                        id: `custom-${Date.now()}`,
                        name_en: 'New Custom Step',
                        description_en: 'Edit description...',
                        assigned_to: profile?.id,
                        is_custom: true
                      };
                      setCustomSteps([...customSteps, newStep]);
                    }}
                    className="w-full py-4 mt-4 border-2 border-dashed border-white/10 rounded-xl text-white/40 hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest"
                  >
                    <Plus size={16} /> Add Custom Step
                  </button>
                </>
              )}
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
        <div>
           {step === 2 && (
             <button 
               onClick={() => setStep(3)}
               disabled={!selectedService && !selectedPackage}
               className="px-8 py-3 bg-[#64748b] hover:bg-[#475569] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-30 disabled:scale-100 flex items-center gap-2"
             >
               Configure Entry <ArrowRight size={16} />
             </button>
           )}
           {step === 3 && (
             <button 
               onClick={() => {
                 // Set assignedTo for all customSteps to the selected assignee if they were defaults
                 setCustomSteps(steps => steps.map(s => ({...s, assigned_to: assignedTo})));
                 setStep(4);
               }}
               className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2"
             >
               Launch Job Workflow <ArrowRight size={16} />
             </button>
           )}
           {step === 4 && (
             <button 
               onClick={handleInitiateJob}
               disabled={isCreating}
               className="px-8 py-3 bg-gold hover:bg-yellow-500 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50"
             >
               {isCreating ? 'Initiating...' : 'Initiate Job'}
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
