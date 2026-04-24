import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, LayoutTemplate, FolderOpen, 
  MessageCircle, DollarSign, Download, Lock, CheckCircle2, Clock
} from 'lucide-react';
import { useJobDetail } from '../../hooks/shared/useJobs';
import PizzaTracker from '../../components/client/PizzaTracker';
import Skeleton from '../../components/ui/Skeleton';
import MessagesTab from '../../components/jobs/MessagesTab'; 
import ClientDocumentsTab from '../../components/client/ClientDocumentsTab';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ClientJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJobDetail(id || '');

  const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'messages' | 'payment'>('progress');

  useEffect(() => {
    if (data?.job?.status === 'completed') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFFFFF', '#0A0F1E']
      });
    }
  }, [data?.job?.status]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24">
        <Skeleton height={200} rounded="xl" />
        <Skeleton height={400} rounded="xl" />
      </div>
    );
  }

  if (!data) return <div className="text-foreground text-center py-12">Service data not found</div>;

  const { job, steps, documents, messages } = data;

  // Filter client visible documents (assuming approved docs are meant for the client to see/download)
  const clientDocs = documents.filter(d => d.status === 'approved');

  // Generate the timeline for the activity feed (using completed steps logic)
  const timelineEvents = steps
    .filter(s => s.is_client_visible && s.status === 'completed' && s.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      
      {/* ── HEADER NAVIGATION ── */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/portal/dashboard')} className="p-3 rounded-xl bg-white/5 text-foreground hover:bg-white/10 transition-colors border border-white/10">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-syne font-bold text-foreground">{job.service_name}</h1>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-muted-foreground transition-colors font-mono text-xs">Ref: {job.job_code}</p>
             {job.status === 'completed' && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter border border-emerald-500/20">Archived Record</span>
             )}
          </div>
        </div>
      </div>

      {job.status === 'completed' && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-xl">
                 <CheckCircle2 size={24} />
              </div>
              <div>
                 <h3 className="text-sm font-bold text-foreground">Service Successfully Fulfilled</h3>
                 <p className="text-xs text-muted-foreground/60 leading-tight mt-0.5">This project has been officially logged and archived in your records.</p>
              </div>
           </div>
            <button 
              onClick={() => job.advance_paid && downloadInvoice(job)}
              disabled={!job.advance_paid}
              className={cn(
                "font-bold px-6 py-2.5 rounded-xl transition-all text-xs flex items-center gap-2 shadow-lg",
                job.advance_paid 
                  ? "bg-primary text-[#0A0F1E] hover:scale-105 active:scale-95 shadow-gold/20" 
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed shadow-none border border-border"
              )}
            >
               {job.remaining_paid ? <CheckCircle2 size={14} /> : (job.advance_paid ? <Download size={14} /> : <Lock size={14} />)}
               {job.remaining_paid ? 'Final Settlement' : (job.advance_paid ? 'Advance Receipt' : 'Locked Until Advance')}
            </button>
        </div>
      )}

      {/* ── TABS (Mobile Friendly Scrolling) ── */}
      <div className="bg-card border border-border p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-xl shadow-black/5 flex">
        {[
          { id: 'progress', label: 'Progress', icon: LayoutTemplate },
          { id: 'documents', label: 'Documents', icon: FolderOpen },
          { id: 'messages', label: 'Messages', icon: MessageCircle },
          { id: 'payment', label: 'Payment', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-[11px] font-extrabold tracking-widest uppercase transition-all whitespace-nowrap min-w-[120px]",
              activeTab === tab.id 
                ? "bg-foreground text-background shadow-md active:scale-95" 
                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
            )}
          >
            <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : "opacity-50"} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT AREA ── */}
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
        >
           {/* —— PROGRESS TAB —— */}
           {activeTab === 'progress' && (
             <div className="space-y-8">
                <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl shadow-black/5 overflow-hidden">
                   <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                     <LayoutTemplate size={14} className="text-primary" /> Lifecycle Tracker
                   </h2>
                   <PizzaTracker steps={steps} currentStatus={job.status} />
                </div>

                <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5">
                   <h3 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                     <Clock size={14} className="text-primary" /> Real-time Activity
                   </h3>
                   <div className="border-border border-l-2 ml-3 relative space-y-8">
                      {job.status === 'in_progress' && (
                        <div className="relative pl-8">
                           <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                             <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                           </div>
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Case Officer processing next milestone...</p>
                        </div>
                      )}
                      
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="relative pl-8 group">
                           <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center">
                             <CheckCircle2 size={10} className="text-emerald-500" />
                           </div>
                           <div className="bg-muted/30 border border-border rounded-2xl p-5 group-hover:border-emerald-500/30 transition-colors">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                               <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                 {event.name_en} 
                                 <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Success</span>
                               </p>
                               <span className="text-muted-foreground/60 font-bold text-[9px] uppercase tracking-widest">
                                 {new Date(event.completed_at!).toLocaleDateString()}
                               </span>
                             </div>
                             <p className="text-xs text-muted-foreground leading-relaxed font-medium">This operational step has been verified and permanently logged in the system records.</p>
                           </div>
                        </div>
                      ))}

                      {timelineEvents.length === 0 && job.status !== 'in_progress' && (
                        <div className="pl-8 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Awaiting first activity log...</div>
                      )}
                   </div>
                </div>
             </div>
           )}

           {/* —— DOCUMENTS TAB (Actionable Vault) —— */}
           {activeTab === 'documents' && (
             <ClientDocumentsTab jobId={id || ''} steps={steps} documents={documents} />
           )}

           {/* —— MESSAGES TAB —— */}
           {activeTab === 'messages' && (
             <div className="bg-card border border-border rounded-[2.5rem] shadow-2xl shadow-black/5 overflow-hidden">
                <MessagesTab jobId={id || ''} messages={messages} isAdmin={false} currentUserType="client" />
             </div>
           )}

           {/* —— PAYMENT SUMMARY TAB —— */}
           {activeTab === 'payment' && (
             <div className="space-y-8">
                <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl shadow-black/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                      <DollarSign size={120} className="text-foreground" />
                   </div>

                   <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                     <DollarSign size={14} className="text-primary" /> Revenue Reconciliation
                   </h2>
                   
                   <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-widest">Total Agreed Fee</p>
                        <p className="text-4xl font-mono font-bold text-foreground flex items-baseline gap-2">
                          {job.total_fee.toLocaleString()} 
                          <span className="text-sm font-bold text-muted-foreground/30 uppercase tracking-widest font-syne">OMR</span>
                        </p>
                      </div>
                      
                      <div className="hidden md:block w-px h-16 bg-border" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-widest">Aggregate Settlement</p>
                        <p className="text-4xl font-mono font-bold text-emerald-500 flex items-baseline gap-2">
                          {job.remaining_paid ? job.total_fee.toLocaleString() : (job.total_fee - job.remaining_due_amount).toLocaleString()} 
                          <span className="text-sm font-bold text-emerald-200 uppercase tracking-widest font-syne">OMR</span>
                        </p>
                      </div>
                   </div>

                   {(!job.remaining_paid && job.remaining_due_amount > 0) && (
                     <div className="border-border border-t mt-12 pt-10">
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
                           <div className="space-y-1">
                             <p className="text-amber-500 uppercase tracking-[0.2em] font-extrabold text-[10px] flex items-center gap-2">
                               <Clock size={14} /> Balance Pending Fulfillment
                             </p>
                             <p className="text-4xl font-mono font-bold text-amber-500 flex items-baseline gap-2">
                               {job.remaining_due_amount.toLocaleString()} 
                               <span className="text-sm font-bold text-amber-200 uppercase tracking-widest font-syne">OMR</span>
                             </p>
                           </div>
                           <button 
                             onClick={() => job.advance_paid && downloadInvoice(job)}
                             disabled={!job.advance_paid}
                             className={cn(
                               "px-10 py-5 rounded-2xl transition-all w-full sm:w-auto text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 font-extrabold",
                               job.advance_paid 
                                 ? "bg-foreground text-background hover:bg-foreground/90" 
                                 : "bg-muted text-muted-foreground/40 cursor-not-allowed shadow-none"
                             )}
                           >
                             {job.remaining_paid ? 'Receive Final Settlement' : (job.advance_paid ? 'Receive Advance Receipt' : 'Awaiting Payment')}
                           </button>
                        </div>
                     </div>
                   )}
                </div>

                <div className="p-6 bg-muted/20 border border-border rounded-[2rem] flex items-start gap-5 shadow-sm">
                  <div className="shrink-0 mt-1 w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground/40">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold text-foreground uppercase tracking-widest mb-1">Secure Transaction Guarantee</p>
                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-loose">All financial logs are notarized and archived. For detailed tax audits or breakdowns, please initiate a direct message with your assigned Case Officer.</p>
                  </div>
                </div>
             </div>
           )}

        </motion.div>
      </AnimatePresence>

    </div>
  );
};

export default ClientJobDetail;
