import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Sparkles, MessageSquare, 
  ArrowUpRight, Clock, CheckCircle2, 
  AlertTriangle, Filter, Search, Plus, 
  Send, Info, Zap
} from 'lucide-react';
import { useSupport } from '../../hooks/shared/useSupport';
import type { ServiceInterest, EmployeeRequest } from '../../hooks/shared/useSupport';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EmployeeRequests = () => {
  const { profile } = useAuth();
  const { 
    leads, leadsLoading, updateLeadStatus,
    myRequests, requestsLoading, submitRequest
  } = useSupport();

  const [activeTab, setActiveTab] = useState<'leads' | 'sos'>('leads');
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [sosType, setSosType] = useState<EmployeeRequest['type']>('other');
  const [sosDescription, setSosDescription] = useState('');

  const handleSOSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosDescription) return;
    
    submitRequest.mutate({
      employee_id: profile?.id || '',
      type: sosType,
      description: sosDescription,
      job_id: null // Can be expanded to link to a specific job
    });
    
    setIsSOSModalOpen(false);
    setSosDescription('');
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
           <Zap size={150} className="text-primary" />
        </div>
        <div className="relative z-10">
           <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-primary/20">
                 Operational Intelligence
              </span>
           </div>
           <h1 className="text-3xl font-syne font-bold text-foreground mb-2">Support & Opportunity Hub</h1>
           <p className="text-muted-foreground text-sm font-medium">Connect with administration and capture incoming client leads.</p>
        </div>

        <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border relative z-10 shrink-0">
           <button 
             onClick={() => setActiveTab('leads')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
               activeTab === 'leads' ? "bg-background text-primary shadow-xl" : "text-muted-foreground hover:text-foreground"
             )}
           >
              <Sparkles size={16} /> Opportunity Stream
           </button>
           <button 
             onClick={() => setActiveTab('sos')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
               activeTab === 'sos' ? "bg-background text-red-500 shadow-xl" : "text-muted-foreground hover:text-red-400"
             )}
           >
              <ShieldAlert size={16} /> Admin SOS Line
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
         {activeTab === 'leads' ? (
           <motion.div 
             key="leads-tab"
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
             className="grid grid-cols-1 lg:grid-cols-3 gap-8"
           >
              {/* Opportunities List */}
              <div className="lg:col-span-2 space-y-6">
                 <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                       <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                          <Plus size={16} className="text-primary" /> Incoming Interests
                       </h3>
                       <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 font-bold uppercase tracking-widest">
                          {leads?.filter(l => l.status === 'new').length || 0} New Leads
                       </span>
                    </div>

                    <div className="divide-y divide-border">
                       {leadsLoading ? (
                         [1,2,3].map(i => <Skeleton key={i} height={100} className="m-4" />)
                       ) : leads?.length === 0 ? (
                         <div className="p-20 text-center text-muted-foreground opacity-50 font-medium">
                            No incoming interests detected.
                         </div>
                       ) : (
                         leads?.map((lead) => (
                           <div key={lead.id} className="p-6 hover:bg-white/5 transition-colors group">
                              <div className="flex items-start justify-between gap-4">
                                 <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                                       <MessageSquare size={20} />
                                    </div>
                                    <div>
                                       <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-bold text-foreground leading-none">{lead.client_name}</h4>
                                          {lead.status === 'new' && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                          )}
                                       </div>
                                       <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2 font-medium">
                                          Interested in <span className="text-primary font-bold">{lead.service_name}</span>
                                       </p>
                                       <div className="flex flex-wrap gap-2">
                                          {lead.status === 'new' ? (
                                            <button 
                                              onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'contacted' })}
                                              className="bg-white/5 hover:bg-primary/10 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary uppercase tracking-widest"
                                            >
                                              Mark Contacted
                                            </button>
                                          ) : (
                                            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-widest flex items-center gap-2">
                                              <CheckCircle2 size={12} /> Under Discovery
                                            </span>
                                          )}
                                          <button className="bg-primary text-[#0A0F1E] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:scale-105 transition-all shadow-lg shadow-gold/10 uppercase tracking-widest">
                                             Initiate Job File
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest mb-1">{new Date(lead.created_at).toLocaleDateString()}</p>
                                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground/40 font-mono">#{lead.id.slice(0,6).toUpperCase()}</span>
                                 </div>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
              </div>

              {/* Sidebar Guide */}
              <div className="space-y-6">
                 <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Sparkles size={60} />
                    </div>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Info size={16} /> Operational Guide
                    </h3>
                    <div className="space-y-4">
                       {[
                         { title: 'Response SLA', desc: 'Acknowledge leads within 2 Working Hours.' },
                         { title: 'Identity Check', desc: 'Verify Client ID before initiating any workflow.' },
                         { title: 'Lead Conversion', desc: 'Convert interest into a Job Ref to trigger automated roadmap.' }
                       ].map((item, i) => (
                         <div key={i} className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                               {i + 1}
                            </div>
                            <div>
                               <p className="text-[11px] font-bold text-foreground mb-0.5">{item.title}</p>
                               <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </motion.div>
         ) : (
           <motion.div 
             key="sos-tab"
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
             className="space-y-8"
           >
              {/* SOS Action Card */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden text-center max-w-3xl mx-auto">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                 <div className="relative z-10 max-w-xl mx-auto">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-8 shadow-inner border border-red-500/30">
                       <ShieldAlert size={40} className="animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-syne font-bold text-foreground mb-4">Critical Admin Escalation</h2>
                    <p className="text-muted-foreground text-base mb-8 font-medium">Use this line only for system blockers, emergencies, or high-priority operational overrides requiring immediate supervisor attention.</p>
                    <button 
                      onClick={() => setIsSOSModalOpen(true)}
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-10 py-5 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-900/40 active:scale-[0.98] flex items-center justify-center gap-3 mx-auto"
                    >
                       <Zap size={18} /> Direct Emergency Alert
                    </button>
                 </div>
              </div>

              {/* Request Tracking */}
              <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-xl max-w-5xl mx-auto">
                 <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                       <Clock size={16} className="text-slate-400" /> Administrative Feed
                    </h3>
                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">Real-time Override Status</span>
                 </div>
                 
                 <div className="divide-y divide-border">
                    {requestsLoading ? (
                       <Skeleton height={100} className="m-4" />
                    ) : myRequests?.length === 0 ? (
                       <div className="p-20 text-center text-muted-foreground opacity-50 font-medium italic">
                          No previous emergency alerts recorded.
                       </div>
                    ) : (
                       myRequests?.map((req) => (
                          <div key={req.id} className="p-8 hover:bg-white/5 transition-colors group">
                             <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                   <div className="flex items-center gap-3">
                                      <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                        req.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                        req.status === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        "bg-red-500/10 text-red-500 border-red-500/20"
                                      )}>
                                         {req.status}
                                      </span>
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest"># {req.type.replace('_', ' ')}</span>
                                   </div>
                                   <p className="text-sm font-bold text-slate-400 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                                      "{req.description}"
                                   </p>
                                </div>
                                {req.admin_response ? (
                                  <div className="md:w-72 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={12} /> Admin Protocol Response
                                     </p>
                                     <p className="text-xs text-slate-800 font-bold leading-relaxed">{req.admin_response}</p>
                                  </div>
                                ) : (
                                  <div className="md:w-72 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                     <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin mb-2" />
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Command</p>
                                  </div>
                                )}
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* SOS MODAL */}
      <AnimatePresence>
         {isSOSModalOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 onClick={() => setIsSOSModalOpen(false)}
                 className="absolute inset-0 bg-background/90 backdrop-blur-md"
              />
              <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="bg-card border border-border w-full max-w-lg rounded-[2.5rem] overflow-hidden relative z-10 shadow-3xl"
              >
                 <form onSubmit={handleSOSSubmit} className="p-10 space-y-8">
                    <div className="text-center space-y-2">
                       <h3 className="text-2xl font-syne font-bold text-foreground uppercase tracking-tighter">Emergency Signal</h3>
                       <p className="text-xs text-muted-foreground font-bold tracking-widest">Describe the operational blocker</p>
                    </div>

                    <div className="space-y-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Request Category</label>
                          <div className="grid grid-cols-2 gap-3">
                             {['price_adjustment', 'step_skip', 'deadline_extension', 'other'].map(t => (
                                <button 
                                  key={t} type="button"
                                  onClick={() => setSosType(t as any)}
                                  className={cn(
                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    sosType === t ? "bg-red-500 text-white border-red-400" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                  )}
                                >
                                   {t.replace('_', ' ')}
                                </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Situation Logs</label>
                          <textarea 
                            value={sosDescription}
                            onChange={(e) => setSosDescription(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-foreground outline-none focus:border-red-500/50 transition-all min-h-[120px] placeholder:text-muted-foreground/30 font-medium"
                            placeholder="Detail the emergencySituation, affected Job Ref, or required override permissions..."
                          />
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button 
                         type="button" 
                         onClick={() => setIsSOSModalOpen(false)}
                         className="flex-1 py-4 bg-background border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                       >
                          Abort
                       </button>
                       <button 
                         type="submit"
                         className="flex-[2] py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-3"
                       >
                          <Send size={14} /> Dispatch Signal
                       </button>
                    </div>
                 </form>
              </motion.div>
           </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeRequests;
