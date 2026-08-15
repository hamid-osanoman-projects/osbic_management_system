import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, ArrowRight, ArrowUpRight, Loader2, Boxes, User, 
  FileText, Calendar, Wallet, CheckCircle2, ChevronRight, Activity, Clock, Briefcase, Landmark, RefreshCw
} from 'lucide-react';
import { useClientJobs } from '../../hooks/shared/useJobs';
import { useClientDocuments } from '../../hooks/client/useClientDocuments';
import { useInvoices } from '../../hooks/employee/useInvoices';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const { data: jobs, isLoading: isLoadingJobs } = useClientJobs(profile?.id || '');
  const { data: documents, isLoading: isLoadingDocs } = useClientDocuments(profile?.id);
  const { data: customInvoices, isLoading: isLoadingInvoices } = useInvoices(profile?.id || '');
  
  const isLoading = isLoadingJobs || isLoadingDocs || isLoadingInvoices;
  
  const [greeting, setGreeting] = useState('Good evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(isRtl ? 'صباح الخير' : 'Good morning');
    else if (hour < 18) setGreeting(isRtl ? 'مساء الخير' : 'Good afternoon');
    else setGreeting(isRtl ? 'مساء الخير' : 'Good evening');
  }, [isRtl]);

  const activeJobs = useMemo(() => jobs?.filter(j => j.status !== 'completed' && j.status !== 'cancelled') || [], [jobs]);
  const completedJobs = useMemo(() => jobs?.filter(j => j.status === 'completed') || [], [jobs]);

  const verifiedDocsCount = useMemo(() => {
    if (!documents) return 0;
    return documents.filter(d => d.status === 'approved' && (!d.expiry_date || new Date(d.expiry_date) > new Date())).length;
  }, [documents]);

  const unpaidAmount = useMemo(() => {
    let total = 0;
    if (customInvoices) {
      customInvoices.forEach(inv => {
        if (inv.status === 'unpaid' || inv.status === 'draft') {
          total += inv.total_amount || 0;
        }
      });
    }
    if (jobs) {
      jobs.forEach(job => {
        const hasCustomInvoice = customInvoices?.some(inv => inv.job_id === job.id);
        if (!hasCustomInvoice) {
          if (!job.advance_paid) total += job.advance_due_amount || 0;
          if (!job.remaining_paid) total += job.remaining_due_amount || 0;
        }
      });
    }
    return total;
  }, [jobs, customInvoices]);

  const expiringDocs = useMemo(() => {
    if (!documents) return [];
    return documents.filter(d => {
      if (d.status !== 'approved' || !d.expiry_date) return false;
      const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 60;
    });
  }, [documents]);

  // Handle WhatsApp Support / Custom Order Request
  const handleQuickServiceRequest = (serviceName: string) => {
    const targetPhone = '96872229827'; // OSBIC Primary Office
    const message = `Hello! 🌿
    
I want to inquire about or request the following service:
🔹 *${serviceName}*

*Client Profile:*
• Name: ${profile?.full_name || 'Anonymous Client'}
• ID: ${profile?.id ? profile.id.slice(0, 8) : 'N/A'}

Please guide me on the next steps. Thank you!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-[#475569] font-bold uppercase tracking-widest">Opening Secure Portal...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* ── Fixed Header Section ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-6 bg-background/80 backdrop-blur-2xl z-20 sticky top-0 border-b border-white/[0.02]">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-syne font-bold text-foreground mb-1 tracking-tight">
              {greeting}, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Client'}</span>
            </h1>
            <p className="text-muted-foreground/40 transition-colors font-black tracking-[0.2em] text-[8px] uppercase">
              {isRtl ? 'لوحة تحكم العميل' : 'Executive Service Portal'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/portal/profile')}
            className="w-10 h-10 rounded-full border border-primary/20 p-0.5 bg-card hover:border-primary transition-all active:scale-95 shrink-0"
          >
             <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden text-sm">
                {profile?.full_name?.charAt(0) || <User size={16} />}
             </div>
          </button>
        </div>
      </div>

      {/* ── Scrollable Dashboard Grid ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-12 pt-4 pb-32 lg:pb-12">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* ── Metrics Summary Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Metric 1: Active Services */}
            <div className="bg-card/40 backdrop-blur-md border border-white/[0.03] rounded-3xl p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase font-black tracking-widest">{isRtl ? 'الخدمات النشطة' : 'Active Services'}</p>
                <h3 className="text-3xl font-syne font-bold text-foreground mt-2 flex items-center gap-2">
                  {activeJobs.length}
                  {activeJobs.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Activity size={22} />
              </div>
            </div>

            {/* Metric 2: Verified Documents */}
            <div className="bg-card/40 backdrop-blur-md border border-white/[0.03] rounded-3xl p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase font-black tracking-widest">{isRtl ? 'المستندات المعتمدة' : 'Verified Documents'}</p>
                <h3 className="text-3xl font-syne font-bold text-foreground mt-2">{verifiedDocsCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <FileText size={22} />
              </div>
            </div>

            {/* Metric 3: Pending Balance */}
            <div className="bg-card/40 backdrop-blur-md border border-white/[0.03] rounded-3xl p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase font-black tracking-widest">{isRtl ? 'المبلغ المستحق' : 'Pending Balance'}</p>
                <h3 className="text-3xl font-syne font-bold text-primary mt-2 font-mono">
                  {unpaidAmount.toFixed(3)} <span className="text-xs uppercase font-syne font-bold">OMR</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                <Wallet size={22} />
              </div>
            </div>
          </div>

          {/* ── Document Expiry Alerts ── */}
          {expiringDocs.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-foreground/30 transition-all uppercase tracking-[0.3em] font-black text-[9px]">{isRtl ? 'تنبيهات هامة' : 'Important Expiry Notifications'}</h2>
              <div className="space-y-3">
                {expiringDocs.map(doc => {
                  const days = Math.ceil((new Date(doc.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpired = days <= 0;
                  
                  return (
                    <div key={doc.id} className="bg-red-500/5 border border-red-500/20 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm">
                            {isExpired ? `Document Expired: ${doc.file_name}` : `Document Expiring Soon: ${doc.file_name}`}
                          </h4>
                          <p className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-wider mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{doc.document_type}</span>
                            <span className="opacity-30">•</span>
                            <span className="text-red-400">{isExpired ? 'Action Required' : `Expires in ${days} days`}</span>
                            <span className="opacity-30">•</span>
                            <span>{new Date(doc.expiry_date!).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          const targetPhone = '96872229827';
                          const message = `Hello! 🌿 I want to request a renewal for my document: ${doc.file_name} (${doc.document_type}) which expires/expired on ${new Date(doc.expiry_date!).toLocaleDateString()}. Please initiate the renewal process. Thank you!`;
                          window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="sm:self-center bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={12} className="animate-spin-slow" />
                        {isRtl ? 'تجديد الآن' : 'Renew Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Active Services Timeline / Summary ── */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground/30 transition-all uppercase tracking-[0.3em] font-black text-[9px]">
                {isRtl ? 'الخدمات الجارية' : 'Ongoing Services & Progress'}
              </h2>
              {activeJobs.length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/80 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                  {activeJobs.length} {activeJobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              )}
            </div>

            {activeJobs.length === 0 ? (
              <div className="bg-card/30 border border-white/[0.03] rounded-[32px] p-10 text-center shadow-xl">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/5">
                   <Boxes className="text-muted-foreground/30" size={24} />
                </div>
                <h3 className="text-lg font-syne font-bold text-foreground mb-1">
                  {isRtl ? 'لا توجد خدمات نشطة' : 'No Active Services'}
                </h3>
                <p className="text-[10px] text-muted-foreground/30 max-w-xs mx-auto uppercase tracking-widest mb-6">
                  {isRtl ? 'جميع المعاملات منتهية' : 'All government processes completed'}
                </p>
                <button
                  onClick={() => navigate('/portal/services')}
                  className="bg-primary/10 hover:bg-primary text-primary hover:text-[#0A0F1E] border border-primary/20 font-black px-6 py-3 rounded-xl transition-all inline-flex items-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest"
                >
                  {isRtl ? 'استعراض الخدمات' : 'Explore Catalog'} <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {activeJobs.map(job => {
                  const progressPct = job.total_steps > 0 ? (job.completed_steps / job.total_steps) * 100 : 0;
                  const isPendingSetup = job.total_steps === 0;

                  return (
                    <div 
                      key={job.id} 
                      className="bg-card/40 backdrop-blur-md border border-white/[0.03] rounded-[28px] p-6 shadow-xl flex flex-col justify-between gap-5 group hover:border-primary/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[8px] font-mono font-black text-primary uppercase tracking-[0.2em] px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                              {job.job_code}
                            </span>
                            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                              {job.employee_name ? `${isRtl ? 'المعقّب:' : 'Handler:'} ${job.employee_name}` : 'Unassigned'}
                            </span>
                          </div>
                          <h3 className="text-lg font-syne font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors">
                            {job.service_name}
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary">
                            {job.status}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar / Setup Status */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/60">
                          <span>{isRtl ? 'حالة الانجاز' : 'Process Progress'}</span>
                          <span>{isPendingSetup ? (isRtl ? 'بانتظار التجهيز' : 'Setting up stages...') : `${Math.round(progressPct)}%`}</span>
                        </div>
                        {isPendingSetup ? (
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div 
                              initial={{ left: '-100%' }}
                              animate={{ left: '100%' }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                            />
                          </div>
                        ) : (
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(212,175,55,0.4)]" 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/[0.02]">
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar size={12} />
                          {isRtl ? 'بدأ في:' : 'Started:'} {new Date(job.started_date).toLocaleDateString()}
                        </span>
                        
                        <button
                          onClick={() => navigate(`/portal/jobs/${job.id}`)}
                          className="px-4 py-2 bg-white/5 hover:bg-primary/10 text-foreground hover:text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 hover:gap-2 active:scale-95 border border-white/5 hover:border-primary/20"
                        >
                          {isRtl ? 'متابعة الخطوات' : 'Track Details'}
                          <ChevronRight size={12} className="rtl:rotate-180" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Popular Transactions Grid (Upsell Showcase) ── */}
          <div className="space-y-6 pt-4">
            <h2 className="text-foreground/30 transition-all uppercase tracking-[0.3em] font-black text-[9px]">
              {isRtl ? 'طلب خدمة جديدة' : 'Quick Actions & Requests'}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Popular Service 1: Visa Service */}
              <div 
                onClick={() => handleQuickServiceRequest('Visa Issuance & Renewal')}
                className="bg-card/20 hover:bg-card/40 border border-white/5 hover:border-primary/20 rounded-[24px] p-5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-4 shadow-inner">
                  <User size={20} />
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-1">{isRtl ? 'تأشيرات وإقامات' : 'Visa Services'}</h4>
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed mb-3">
                  {isRtl ? 'طلب تأشيرة مستثمر أو تجديد إقامة' : 'Apply for investor visas or renew existing residency cards.'}
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isRtl ? 'اطلب الآن' : 'Order Now'} <ArrowUpRight size={10} />
                </span>
              </div>

              {/* Popular Service 2: CR Renewal */}
              <div 
                onClick={() => handleQuickServiceRequest('Commercial Registration (CR) Renewal')}
                className="bg-card/20 hover:bg-card/40 border border-white/5 hover:border-primary/20 rounded-[24px] p-5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                  <Landmark size={20} />
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors mb-1">{isRtl ? 'السجل التجاري' : 'CR Renewal'}</h4>
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed mb-3">
                  {isRtl ? 'تجديد السجل التجاري أو الترخيص البلدي' : 'Renew commercial registration files and municipal cards.'}
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isRtl ? 'اطلب الآن' : 'Order Now'} <ArrowUpRight size={10} />
                </span>
              </div>

              {/* Popular Service 3: Labor / Custom */}
              <div 
                onClick={() => handleQuickServiceRequest('Ministry of Labor Transactions')}
                className="bg-card/20 hover:bg-card/40 border border-white/5 hover:border-primary/20 rounded-[24px] p-5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors mb-1">{isRtl ? 'وزارة العمل' : 'Labor Services'}</h4>
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed mb-3">
                  {isRtl ? 'تحديث بطاقات العمل والمأذونيات' : 'Submit labor clearance request forms or work permit reviews.'}
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isRtl ? 'اطلب الآن' : 'Order Now'} <ArrowUpRight size={10} />
                </span>
              </div>
            </div>
          </div>

          {/* ── Completed Services (Past Successes Mini List) ── */}
          {completedJobs.length > 0 && (
            <section className="pt-10 border-t border-white/[0.02]">
              <h2 className="text-foreground/30 transition-all uppercase tracking-[0.3em] font-black text-[9px] mb-6">
                {isRtl ? 'الخدمات المنجزة سابقاً' : 'Past Successes'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completedJobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => navigate(`/portal/jobs/${job.id}`)}
                    className="bg-card/20 hover:bg-card/40 border border-white/[0.03] rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:border-emerald-500/20 transition-all"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors">{job.service_name}</h4>
                      <p className="text-[9px] text-muted-foreground/45 font-mono uppercase tracking-widest mt-1">Finalized / {job.job_code}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                      <ArrowRight size={14} className="rtl:rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
