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
    <div className="h-full flex flex-col overflow-hidden bg-background">
      
      {/* ── Fixed Header Section ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-4 bg-background/80 backdrop-blur-2xl z-20 border-b border-white/[0.02]">
        <div className="max-w-4xl mx-auto w-full">
          {/* Header Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate('/portal')} 
              className="p-3 rounded-xl bg-card border border-border text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-syne font-bold text-foreground leading-tight tracking-tight">
                {job.service_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground/40 transition-colors font-mono text-[10px] font-bold uppercase tracking-widest">
                  Ref: {job.job_code}
                </p>
                {job.status === 'completed' && (
                  <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-emerald-500/20">
                    Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Service Status Banner (Only show if completed) */}
          {job.status === 'completed' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-inner"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-xl shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Service Completed</h3>
                  <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5 uppercase tracking-wider font-bold">Requirement fulfilled successfully</p>
                </div>
              </div>
              <button 
                onClick={() => job.advance_paid && downloadInvoice(job)}
                disabled={!job.advance_paid}
                className={cn(
                  "font-black px-6 py-2.5 rounded-xl transition-all text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-lg",
                  job.advance_paid 
                    ? "bg-primary text-[#0A0F1E] hover:scale-105 active:scale-95" 
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed border border-border"
                )}
              >
                {job.remaining_paid ? <CheckCircle2 size={12} /> : (job.advance_paid ? <Download size={12} /> : <Lock size={12} />)}
                {job.remaining_paid ? 'Final Receipt' : (job.advance_paid ? 'Receipt' : 'Locked')}
              </button>
            </motion.div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-card border border-border p-1 rounded-[20px] flex overflow-x-auto no-scrollbar shadow-sm">
            {[
              { id: 'progress', label: 'Progress', icon: LayoutTemplate },
              { id: 'documents', label: 'Documents', icon: FolderOpen },
              { id: 'messages', label: 'Support', icon: MessageCircle },
              { id: 'payment', label: 'Pricing', icon: DollarSign },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-[16px] text-[10px] font-black tracking-[0.2em] uppercase transition-all whitespace-nowrap min-w-[120px]",
                  activeTab === tab.id 
                    ? "bg-foreground text-background shadow-lg active:scale-95" 
                    : "text-muted-foreground/40 hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon size={14} strokeWidth={2.5} className={activeTab === tab.id ? "text-primary" : "opacity-30"} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable Content Area ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-12 pt-8">
        <div className="max-w-4xl mx-auto w-full pb-20">
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
                <div className="space-y-12">
                  <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5 overflow-hidden">
                    <div className="flex items-center gap-3 mb-10">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                      <h2 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                        Live Status Tracker
                      </h2>
                    </div>
                    <PizzaTracker steps={steps} currentStatus={job.status} />
                  </div>

                  <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-3 mb-10">
                      <Clock size={16} className="text-primary/40" />
                      <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                        Recent Activity
                      </h3>
                    </div>
                    <div className="border-border border-l ml-3 relative space-y-10">
                      {job.status === 'in_progress' && (
                        <div className="relative pl-8">
                          <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse" />
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Team is processing next stage...</p>
                        </div>
                      )}
                      
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="relative pl-8 group">
                          <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                          <div className="bg-muted/30 border border-border rounded-2xl p-6 group-hover:border-emerald-500/20 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <p className="text-xs font-bold text-foreground flex items-center gap-2">
                                {event.name_en} 
                                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Completed</span>
                              </p>
                              <span className="text-muted-foreground/30 font-black text-[9px] uppercase tracking-widest">
                                {new Date(event.completed_at!).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-bold uppercase tracking-wider opacity-60">Verified successfully</p>
                          </div>
                        </div>
                      ))}

                      {timelineEvents.length === 0 && job.status !== 'in_progress' && (
                        <div className="pl-8 text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">No history records available</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* —— DOCUMENTS TAB —— */}
              {activeTab === 'documents' && (
                <div className="bg-card border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden">
                  <ClientDocumentsTab jobId={id || ''} steps={steps} documents={documents} />
                </div>
              )}

              {/* —— MESSAGES TAB —— */}
              {activeTab === 'messages' && (
                <div className="bg-card border border-border rounded-[2.5rem] shadow-xl shadow-black/5 overflow-hidden h-[600px]">
                  <MessagesTab jobId={id || ''} messages={messages} isAdmin={false} currentUserType="client" />
                </div>
              )}

              {/* —— PAYMENT SUMMARY TAB —— */}
              {activeTab === 'payment' && (
                <div className="space-y-8">
                  <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-12 shadow-xl shadow-black/5 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 p-10 opacity-[0.02]">
                      <DollarSign size={240} className="text-foreground" />
                    </div>

                    <div className="flex items-center gap-3 mb-12">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                        <DollarSign size={16} strokeWidth={3} />
                      </div>
                      <h2 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                        Service Pricing
                      </h2>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-12 md:gap-24 items-start relative z-10">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Total Value</p>
                        <p className="text-5xl font-mono font-bold text-foreground tracking-tighter">
                          {job.total_fee.toLocaleString()} 
                          <span className="text-sm font-black text-muted-foreground/20 uppercase tracking-widest ms-3 font-syne">OMR</span>
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Amount Cleared</p>
                        <p className="text-5xl font-mono font-bold text-emerald-500 tracking-tighter">
                          {job.remaining_paid ? job.total_fee.toLocaleString() : (job.total_fee - job.remaining_due_amount).toLocaleString()} 
                          <span className="text-sm font-black text-emerald-500/30 uppercase tracking-widest ms-3 font-syne">OMR</span>
                        </p>
                      </div>
                    </div>

                    {(!job.remaining_paid && job.remaining_due_amount > 0) && (
                      <div className="border-border border-t mt-16 pt-12">
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-inner">
                          <div className="space-y-2">
                            <p className="text-amber-500 uppercase tracking-[0.3em] font-black text-[9px] flex items-center gap-2">
                              <Clock size={14} strokeWidth={3} /> Outstanding Balance
                            </p>
                            <p className="text-5xl font-mono font-bold text-amber-500 tracking-tighter">
                              {job.remaining_due_amount.toLocaleString()} 
                              <span className="text-sm font-black text-amber-500/30 uppercase tracking-widest ms-3 font-syne">OMR</span>
                            </p>
                          </div>
                          <button 
                            onClick={() => job.advance_paid && downloadInvoice(job)}
                            disabled={!job.advance_paid}
                            className={cn(
                              "px-12 py-6 rounded-2xl transition-all w-full lg:w-auto text-[10px] uppercase tracking-[0.3em] font-black shadow-2xl active:scale-95",
                              job.advance_paid 
                                ? "bg-foreground text-background hover:opacity-90" 
                                : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                            )}
                          >
                            {job.remaining_paid ? 'Get Receipt' : (job.advance_paid ? 'Get Receipt' : 'Awaiting Action')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-muted/20 border border-border rounded-[2rem] flex items-start gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-primary/40 shadow-sm">
                      <Lock size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-foreground uppercase tracking-widest mb-1">Encrypted Billing</p>
                      <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-loose max-w-xl">
                        Transactional records are secured via end-to-end encryption. Contact support for billing inquiries.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ClientJobDetail;
