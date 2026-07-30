import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, LayoutTemplate, FolderOpen, 
  MessageCircle, DollarSign, Download, Lock, CheckCircle2, Clock,
  Star, Sparkles, Eye
} from 'lucide-react';
import { useJobDetail, useSubmitJobFeedback } from '../../hooks/shared/useJobs';
import { useInvoices } from '../../hooks/employee/useInvoices';
import { downloadCustomInvoice } from '../../utils/invoiceGenerator';
import { useAuth } from '../../contexts/AuthContext';
import PizzaTracker from '../../components/client/PizzaTracker';
import Skeleton from '../../components/ui/Skeleton';
import MessagesTab from '../../components/jobs/MessagesTab'; 
import ClientDocumentsTab from '../../components/client/ClientDocumentsTab';
import { downloadInvoice } from '../../utils/invoiceGenerator';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ClientJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { data, isLoading } = useJobDetail(id || '');
  const { profile } = useAuth();
  const { data: invoices } = useInvoices(profile?.id);
  const customInvoice = invoices?.find(inv => inv.job_id === id);

  const [activeTab, setActiveTab] = useState<'progress' | 'documents' | 'messages' | 'payment'>('progress');
  const qc = useQueryClient();

  const [clientServices, setClientServices] = useState<any[]>([]);
  const [timelineMap, setTimelineMap] = useState<Record<string, any[]>>({});
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const loadClientServices = async () => {
    try {
      const { data: svcs, error: svcsError } = await supabase
        .from('job_services')
        .select(`
          *,
          service:services(name_en, name_ar, requires_pro)
        `)
        .eq('job_id', id!)
        .order('display_order', { ascending: true });
        
      if (svcsError) throw svcsError;
      setClientServices(svcs || []);

      if (svcs && svcs.length > 0) {
        const { data: tlines, error: tlineError } = await supabase
          .from('job_service_timeline')
          .select('*')
          .in('job_service_id', svcs.map(s => s.id))
          .order('changed_at', { ascending: true });

        if (tlineError) throw tlineError;

        const mapping: Record<string, any[]> = {};
        tlines?.forEach(entry => {
          if (!mapping[entry.job_service_id]) mapping[entry.job_service_id] = [];
          mapping[entry.job_service_id].push(entry);
        });
        setTimelineMap(mapping);
      }
    } catch (err) {
      console.error('Error loading client service timeline', err);
    }
  };

  useEffect(() => {
    if (id) {
      loadClientServices();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      // Realtime listener for document updates
      const docChannel = supabase
        .channel(`client-job-docs-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `job_id=eq.${id}`
          },
          () => {
            qc.invalidateQueries({ queryKey: ['job', id] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(docChannel);
      };
    }
  }, [id]);
  
  const feedbackMutation = useSubmitJobFeedback();
  const [clientRating, setClientRating] = useState<number>(0);
  const [clientFeedbackText, setClientFeedbackText] = useState<string>('');
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  useEffect(() => {
    if (data?.job) {
      setClientRating(data.job.client_rating || 0);
      setClientFeedbackText(data.job.client_feedback || '');
    }
  }, [data?.job]);

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

  const unreadCount = messages ? messages.filter((m: any) => m.sender_id !== profile?.id && !m.is_read).length : 0;

  const uploadedInvoiceDoc = documents.find(d => 
    d.status === 'approved' && 
    (d.file_name.toLowerCase().includes('invoice') || 
     d.document_type.toLowerCase().includes('invoice') ||
     d.file_name.includes('فاتورة') || 
     d.document_type.includes('فاتورة'))
  );

  const handleDownloadUploadedInvoice = async (doc: any) => {
    try {
      const { data: signData, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);
      if (error) throw error;
      if (signData?.signedUrl) {
        const link = document.createElement('a');
        link.href = signData.signedUrl;
        link.download = doc.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      toast.error('Could not download file: ' + err.message);
    }
  };

  const handleViewUploadedInvoice = async (doc: any) => {
    try {
      const { data: signData, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);
      if (error) throw error;
      if (signData?.signedUrl) {
        window.open(signData.signedUrl, '_blank');
      }
    } catch (err: any) {
      toast.error('Could not view file: ' + err.message);
    }
  };

  const handleDownloadInvoice = () => {
    if (customInvoice) {
      downloadCustomInvoice(customInvoice);
    } else if (job.advance_paid) {
      downloadInvoice(job);
    } else {
      toast.error(
        isRtl 
          ? 'لم يتم إصدار الفاتورة بعد. يرجى التواصل مع الدعم.' 
          : 'Invoice has not been generated yet. Please contact support.'
      );
    }
  };

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
                {(job.status === 'active' || job.status === 'in_progress') && (
                  <span className="bg-blue-500/10 text-blue-400 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-blue-500/20">
                    In Progress
                  </span>
                )}
                {job.status === 'draft' && (
                  <span className="bg-amber-500/10 text-amber-500 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-amber-500/20">
                    Pending Setup
                  </span>
                )}
                {job.status === 'on_hold' && (
                  <span className="bg-orange-500/10 text-orange-400 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-orange-500/20">
                    On Hold
                  </span>
                )}
                {job.status === 'cancelled' && (
                  <span className="bg-red-500/10 text-red-400 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-red-500/20">
                    Cancelled
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
              className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4 mb-8 shadow-inner"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-xl shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Service Completed</h3>
                <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5 uppercase tracking-wider font-bold">Requirement fulfilled successfully</p>
              </div>
            </motion.div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-muted/50 border border-border p-1 rounded-2xl flex overflow-x-auto no-scrollbar shadow-inner scroll-smooth max-w-full">
            {[
              { id: 'progress', label: 'Progress', icon: LayoutTemplate },
              { id: 'documents', label: 'Documents', icon: FolderOpen },
              { id: 'messages', label: 'Chat Support', icon: MessageCircle, count: unreadCount > 0 ? unreadCount : undefined },
              { id: 'payment', label: 'Pricing', icon: DollarSign },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-primary text-[#0A0F1E] shadow-lg scale-[1.02]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <tab.icon size={13} strokeWidth={2.5} className={activeTab === tab.id ? "text-[#0A0F1E]" : "opacity-40 text-muted-foreground"} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold shadow-sm transition-all",
                    activeTab === tab.id ? "bg-[#0A0F1E]/20 text-[#0A0F1E]" : "bg-white/10 text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
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

                  {/* Applicants Progress */}
                  {clientServices.length > 0 && (
                    <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                          {isRtl ? 'حالة المتقدمين للخدمات' : 'Applicants Status Tracker'}
                        </h2>
                      </div>

                      <div className="space-y-4">
                        {clientServices.map((svc) => {
                          const isExpanded = expandedServiceId === svc.id;
                          const tline = timelineMap[svc.id] || [];
                          return (
                            <div key={svc.id} className="border border-border/80 rounded-2xl overflow-hidden bg-muted/5">
                              {/* Accordion Trigger */}
                              <button
                                onClick={() => setExpandedServiceId(isExpanded ? null : svc.id)}
                                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-all font-sans"
                              >
                                <div className="min-w-0 pr-4">
                                  <p className="text-xs font-bold text-foreground truncate">
                                    {svc.applicant_name || `Applicant #${svc.item_number}`}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate font-normal">
                                    {svc.service?.name_en || svc.service_name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                    svc.status === 'completed' || svc.status === 'gov_approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                    svc.status === 'on_hold' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                                    svc.status === 'gov_rejected' || svc.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                    'bg-blue-500/10 text-blue-400'
                                  }`}>
                                    {svc.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-muted-foreground text-xs">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                              </button>

                              {/* Accordion Timeline */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-border/60 bg-muted/10 p-5 space-y-4 font-sans"
                                  >
                                    <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2">History Log</p>
                                    <div className="relative pl-4 border-l border-border/60 space-y-4">
                                      {tline.map((step, idx) => (
                                        <div key={idx} className="relative">
                                          <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                                          <p className="text-xs font-bold text-foreground">
                                            Status updated to <span className="text-primary">{step.to_status.replace('_', ' ').toUpperCase()}</span>
                                          </p>
                                          {step.reason && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 bg-muted/40 p-2.5 rounded-lg border border-border/30 font-normal">
                                              {step.reason}
                                            </p>
                                          )}
                                          <p className="text-[9px] text-muted-foreground/50 mt-0.5 uppercase font-normal">
                                            {new Date(step.changed_at).toLocaleString()}
                                          </p>
                                        </div>
                                      ))}
                                      {tline.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic font-normal">Process initiated. Awaiting stage progression updates.</p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-3 mb-10">
                      <Clock size={16} className="text-primary/40" />
                      <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                        Recent Activity
                      </h3>
                    </div>
                    <div className="border-border border-l ml-3 relative space-y-10">
                      {(job.status === 'active' || job.status === 'in_progress') && (
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

                      {timelineEvents.length === 0 && job.status !== 'active' && job.status !== 'in_progress' && (
                        <div className="pl-8 text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">No history records available</div>
                      )}
                    </div>
                  </div>

                  {job.status === 'completed' && (
                    <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-black/5 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 p-10 opacity-[0.02] pointer-events-none">
                        <Star size={240} className="text-foreground" />
                      </div>
                      
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                          <Sparkles size={16} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                          {isRtl ? 'تقييم الخدمة' : 'Service Feedback'}
                        </h3>
                      </div>

                      {job.client_rating ? (
                        <div className="space-y-4">
                          <h4 className="text-lg font-bold text-foreground">
                            {isRtl ? 'شكراً لتقييمك!' : 'Thank you for your review!'}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={24} 
                                fill={star <= job.client_rating ? '#D4AF37' : 'none'} 
                                className={star <= job.client_rating ? 'text-primary' : 'text-muted-foreground/20'}
                              />
                            ))}
                          </div>
                          {job.client_feedback && (
                            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative italic text-xs text-muted-foreground leading-relaxed max-w-xl">
                              "{job.client_feedback}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-lg font-bold text-foreground">
                              {isRtl ? 'كيف كانت تجربتك معنا؟' : 'How was your experience?'}
                            </h4>
                            <p className="text-xs text-muted-foreground/60 mt-1 font-medium">
                              {isRtl ? 'يرجى تزويدنا بتقييمك لتحسين مستوى الخدمة لدينا.' : 'Please rate this completed service and leave a review.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isFilled = hoveredRating ? star <= hoveredRating : star <= clientRating;
                              return (
                                <Star 
                                  key={star} 
                                  size={32}
                                  fill={isFilled ? '#D4AF37' : 'none'}
                                  onMouseEnter={() => setHoveredRating(star)}
                                  onMouseLeave={() => setHoveredRating(0)}
                                  onClick={() => setClientRating(star)}
                                  className={cn(
                                    "transition-all cursor-pointer active:scale-95", 
                                    isFilled ? "text-primary filter drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]" : "text-muted-foreground/30 hover:text-primary/60"
                                  )}
                                />
                              );
                            })}
                          </div>

                          <div className="space-y-2 max-w-xl">
                            <textarea
                              rows={3}
                              placeholder={isRtl ? 'اكتب تعليقك هنا...' : 'Write your comments here...'}
                              value={clientFeedbackText}
                              onChange={(e) => setClientFeedbackText(e.target.value)}
                              className="w-full bg-background border border-border focus:border-primary/40 rounded-2xl p-4 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed font-medium"
                            />
                          </div>

                          <button
                            onClick={() => {
                              if (clientRating === 0) return toast.error('Please choose a rating');
                              feedbackMutation.mutate({
                                jobId: job.id,
                                rating: clientRating,
                                feedback: clientFeedbackText,
                                jobCode: job.job_code
                              }, {
                                onSuccess: () => {
                                  toast.success('Feedback submitted successfully!');
                                }
                              });
                            }}
                            disabled={clientRating === 0 || feedbackMutation.isPending}
                            className="bg-primary text-[#0A0F1E] font-black px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all text-[9px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 shadow-xl shadow-primary/10"
                          >
                            {feedbackMutation.isPending ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
                  <MessagesTab jobId={id || ''} messages={messages} isAdmin={false} currentUserType="client" scope="staff_client" />
                </div>
              )}

              {/* —— PAYMENT SUMMARY TAB —— */}
              {activeTab === 'payment' && (
                <div className="space-y-8">
                  <div className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-12 shadow-xl shadow-black/5 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 p-10 opacity-[0.02] pointer-events-none">
                      <DollarSign size={240} className="text-foreground" />
                    </div>

                    <div className="flex items-center justify-between gap-3 mb-12">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                          <DollarSign size={16} strokeWidth={3} />
                        </div>
                        <h2 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                          Service Pricing
                        </h2>
                      </div>
                      
                      {uploadedInvoiceDoc ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewUploadedInvoice(uploadedInvoiceDoc)}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 text-foreground font-black px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all text-[9px] uppercase tracking-widest shadow-md flex items-center gap-1.5 shrink-0"
                            title="View Uploaded Invoice File"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            onClick={() => handleDownloadUploadedInvoice(uploadedInvoiceDoc)}
                            className="bg-primary text-[#0A0F1E] font-black px-4 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all text-[9px] uppercase tracking-widest shadow-lg shadow-primary/10 flex items-center gap-1.5 shrink-0"
                            title="Download Uploaded Invoice File"
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>
                      ) : (
                        !!customInvoice && (
                          <button
                            onClick={handleDownloadInvoice}
                            className="bg-primary text-[#0A0F1E] font-black px-5 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all text-[9px] uppercase tracking-widest shadow-lg shadow-primary/10 shrink-0"
                          >
                            Download Invoice
                          </button>
                        )
                      )}
                    </div>
                    
                    {customInvoice ? (
                      <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 items-start">
                          <div className="space-y-2 sm:col-span-2 md:col-span-1">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Invoice Number</p>
                            <p className="text-xl sm:text-2xl font-mono font-bold text-foreground truncate">
                              {customInvoice.invoice_number}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Subtotal</p>
                            <p className="text-2xl font-mono font-bold text-foreground">
                              {customInvoice.subtotal.toLocaleString()} <span className="text-xs font-sans text-muted-foreground">OMR</span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Discount</p>
                            <p className="text-2xl font-mono font-bold text-amber-500">
                              {customInvoice.discount_amount.toLocaleString()} <span className="text-xs font-sans text-amber-500/60">OMR</span>
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">VAT Tax</p>
                            <p className="text-2xl font-mono font-bold text-foreground">
                              {customInvoice.tax_percentage || 0}%
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Total Amount</p>
                            <p className="text-2xl font-mono font-bold text-emerald-500">
                              {customInvoice.total_amount.toLocaleString()} <span className="text-xs font-sans text-emerald-500/60">OMR</span>
                            </p>
                          </div>
                        </div>

                        {/* Items Desktop Table View */}
                        <div className="hidden sm:block border border-border rounded-2xl overflow-hidden bg-white/[0.01]">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-muted/50 border-b border-border text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider">
                                <th className="p-4 w-12">#</th>
                                <th className="p-4">Item Description</th>
                                <th className="p-4 text-center w-20">Qty</th>
                                <th className="p-4 text-right w-28">Unit Price</th>
                                <th className="p-4 text-right w-28">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(customInvoice.items || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-border/50 text-muted-foreground hover:bg-white/[0.01]">
                                  <td className="p-4 font-mono">{idx + 1}</td>
                                  <td className="p-4 text-foreground font-bold">{item.description}</td>
                                  <td className="p-4 text-center font-mono">{item.quantity}</td>
                                  <td className="p-4 text-right font-mono">{Number(item.unit_price).toFixed(3)} OMR</td>
                                  <td className="p-4 text-right font-mono text-foreground font-bold">{Number(item.total).toFixed(3)} OMR</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Items Mobile Card List View */}
                        <div className="block sm:hidden space-y-4">
                          {(customInvoice.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <p className="text-[9px] font-mono text-muted-foreground/40 font-bold uppercase">Item #{idx + 1}</p>
                                  <h4 className="text-xs font-bold text-foreground mt-1">{item.description}</h4>
                                </div>
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 shrink-0">
                                  Qty: {item.quantity}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] pt-2 border-t border-white/5 font-mono">
                                <span className="text-muted-foreground">Unit: {Number(item.unit_price).toFixed(3)} OMR</span>
                                <span className="text-foreground font-bold">Total: {Number(item.total).toFixed(3)} OMR</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
