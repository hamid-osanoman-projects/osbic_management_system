import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Search, Download, CheckCircle2, Clock, 
  AlertCircle, DollarSign, Wallet, FileText, ArrowUpRight, Calendar
} from 'lucide-react';
import { useClientJobs } from '../../hooks/shared/useJobs';
import { useInvoices } from '../../hooks/employee/useInvoices';
import { downloadInvoice, downloadCustomInvoice } from '../../utils/invoiceGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Payments = () => {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const { data: jobs, isLoading: isLoadingJobs } = useClientJobs(profile?.id || '');
  const { data: customInvoices, isLoading: isLoadingInvoices } = useInvoices(profile?.id || '');
  const isLoading = isLoadingJobs || isLoadingInvoices;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'settled'>('all');

  const mergedBillings = useMemo(() => {
    const list: any[] = [];

    // 1. Add all custom invoices
    if (customInvoices) {
      customInvoices.forEach(inv => {
        list.push({
          id: inv.id,
          type: 'custom_invoice',
          invoice_number: inv.invoice_number || 'DRAFT',
          date: inv.issue_date || new Date().toISOString(),
          status: inv.status, // 'draft', 'unpaid', 'paid', 'cancelled'
          total_amount: inv.total_amount,
          subtotal: inv.subtotal,
          tax_percentage: inv.tax_percentage,
          discount_amount: inv.discount_amount,
          notes: inv.notes,
          terms: inv.terms,
          items: inv.items || [],
          job_code: inv.job?.job_code || 'STANDALONE',
          service_name: inv.job?.service?.name_en || 'Professional Consulting Services',
          rawInvoice: inv,
          jobId: inv.job_id
        });
      });
    }

    // 2. Add jobs that DO NOT have an associated custom invoice
    if (jobs) {
      jobs.forEach(job => {
        const hasCustomInvoice = customInvoices?.some(inv => inv.job_id === job.id);
        if (!hasCustomInvoice) {
          list.push({
            id: job.id,
            type: 'job',
            job_code: job.job_code,
            date: job.started_date,
            status: (job.advance_paid && job.remaining_paid) ? 'paid' : 'unpaid',
            total_amount: job.total_fee,
            work_fee: job.work_fee,
            customAmount: job.total_fee,
            ministry_fee: job.ministry_fee,
            advance_paid: job.advance_paid,
            remaining_paid: job.remaining_paid,
            advance_due_amount: job.advance_due_amount,
            remaining_due_amount: job.remaining_due_amount,
            advance_receipt_url: job.advance_receipt_url,
            remaining_receipt_url: job.remaining_receipt_url,
            service_name: job.service_name,
            rawJob: job,
            jobId: job.id
          });
        }
      });
    }

    return list;
  }, [jobs, customInvoices]);

  const stats = useMemo(() => {
    let totalBooked = 0;
    let paidToDate = 0;

    mergedBillings.forEach(item => {
      if (item.status === 'cancelled') return;

      totalBooked += item.total_amount;
      if (item.type === 'custom_invoice') {
        if (item.status === 'paid') {
          paidToDate += item.total_amount;
        }
      } else {
        // Fallback job
        if (item.advance_paid) {
          paidToDate += item.advance_due_amount;
        }
        if (item.remaining_paid) {
          paidToDate += item.remaining_due_amount;
        }
      }
    });

    return {
      totalBooked,
      paidToDate,
      outstanding: Math.max(0, totalBooked - paidToDate),
    };
  }, [mergedBillings]);

  const filteredInvoices = useMemo(() => {
    let temp = mergedBillings.filter(item => item.status !== 'cancelled');

    // Filter by Tab
    if (activeTab === 'pending') {
      temp = temp.filter(item => {
        if (item.type === 'custom_invoice') {
          return item.status !== 'paid';
        } else {
          return !item.advance_paid || !item.remaining_paid;
        }
      });
    } else if (activeTab === 'settled') {
      temp = temp.filter(item => {
        if (item.type === 'custom_invoice') {
          return item.status === 'paid';
        } else {
          return item.advance_paid && item.remaining_paid;
        }
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter(item => 
        item.service_name.toLowerCase().includes(q) || 
        item.job_code.toLowerCase().includes(q) ||
        (item.invoice_number && item.invoice_number.toLowerCase().includes(q))
      );
    }

    return temp;
  }, [mergedBillings, activeTab, searchQuery]);

  if (isLoading) {
    return (
      <div className="p-8 sm:p-12 space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl animate-pulse" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div className="p-6 sm:p-8 lg:p-12 pb-4 bg-background/50 backdrop-blur-2xl border-b border-white/[0.02] shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-syne font-bold text-foreground mb-1">
              {isRtl ? 'المدفوعات والفواتير' : 'Payments & Billing'}
            </h1>
            <p className="text-muted-foreground/40 transition-colors uppercase tracking-[0.2em] text-[8px] font-black leading-none">
              {isRtl ? 'تتبع فواتيرك ومدفوعاتك الرقمية والتحويلات' : 'Monitor transactions, down-payments, and final balances'}
            </p>
          </div>
        </div>

        {/* Stats Carousel on Mobile / Flex Grid on Desktop */}
        <div className="flex overflow-x-auto no-scrollbar gap-4 mb-6 shrink-0 snap-x">
          <div className="bg-card border border-border p-5 rounded-[24px] shadow-lg flex items-center justify-between min-w-[220px] sm:min-w-0 sm:flex-1 snap-start">
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{isRtl ? 'إجمالي الرسوم' : 'Total Booked'}</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-foreground">{stats.totalBooked.toLocaleString()} <span className="text-[10px] sm:text-xs font-sans text-primary">OMR</span></p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-[24px] shadow-lg flex items-center justify-between min-w-[220px] sm:min-w-0 sm:flex-1 snap-start">
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{isRtl ? 'المدفوع' : 'Paid to Date'}</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">{stats.paidToDate.toLocaleString()} <span className="text-[10px] sm:text-xs font-sans text-emerald-500">OMR</span></p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Wallet size={20} />
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-[24px] shadow-lg flex items-center justify-between min-w-[220px] sm:min-w-0 sm:flex-1 snap-start">
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">{isRtl ? 'المتبقي المستحق' : 'Outstanding'}</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-amber-500">{stats.outstanding.toLocaleString()} <span className="text-[10px] sm:text-xs font-sans text-amber-500">OMR</span></p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-6 items-center w-full">
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border self-start shrink-0 shadow-inner">
            <button 
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === 'all' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'pending' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock size={14} />
              {isRtl ? 'المعلقة' : 'Pending'}
            </button>
            <button 
              onClick={() => setActiveTab('settled')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'settled' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 size={14} />
              {isRtl ? 'المسددة' : 'Settled'}
            </button>
          </div>

          <div className="flex-1 relative w-full group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={isRtl ? 'البحث عن الفواتير بواسطة اسم الخدمة، رمز الطلب...' : 'Search invoices by service name, job code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-foreground outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── Invoices List ── */}
      <div className="p-6 sm:p-8 lg:p-12 pt-4 pb-24 shrink-0">
        <div className="max-w-7xl mx-auto">
          {filteredInvoices.length === 0 ? (
            <div className="py-24 text-center bg-card/40 backdrop-blur-xl border border-border rounded-[40px] shadow-2xl flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 mx-auto border border-white/5">
                <CreditCard size={32} className="text-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-syne font-bold text-foreground mb-1">
                {isRtl ? 'لا توجد فواتير مطابقة' : 'No matching invoices'}
              </h3>
              <p className="text-[10px] text-muted-foreground/40 max-w-xs mx-auto uppercase tracking-widest">
                {isRtl ? 'السجلات فارغة' : 'Records clear'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredInvoices.map((item) => {
                const isPaid = item.status === 'paid';
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "bg-card/40 backdrop-blur-md border rounded-[32px] p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden",
                      isPaid ? "border-emerald-500/10" : "border-border"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      
                      {/* Left Block: Identity & Name */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono font-black text-primary uppercase tracking-[0.2em] px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 shadow-sm">
                            {item.type === 'custom_invoice' ? item.invoice_number : item.job_code}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                            isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          )}>
                            {isPaid ? (isRtl ? 'مسددة بالكامل' : 'Paid') : (isRtl ? 'مستحقة' : 'Unpaid')}
                          </span>
                          {item.type === 'custom_invoice' && (
                            <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest">
                              {isRtl ? 'فاتورة مخصصة' : 'Custom Invoice'}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-syne font-bold text-foreground leading-tight tracking-tight">
                          {item.service_name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono">
                          <Calendar size={12} className="text-muted-foreground/40" />
                          <span>{isRtl ? 'التاريخ: ' : 'Date: '} {new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>
 
                      {/* Middle Block: Payment Breakdown */}
                      {item.type === 'custom_invoice' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl text-[11px] font-mono flex-1">
                          <div className="px-2">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'المجموع الفرعي' : 'Subtotal'}</p>
                            <p className="text-foreground font-bold">{item.subtotal.toLocaleString()} OMR</p>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'الخصم' : 'Discount'}</p>
                            <p className="text-foreground font-bold">{item.discount_amount.toLocaleString()} OMR</p>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'الضريبة' : 'Tax'}</p>
                            <p className="text-foreground font-bold">{item.tax_percentage}%</p>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'عدد المواد' : 'Items'}</p>
                            <p className="text-foreground font-bold">{item.items.length}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl text-[11px] font-mono flex-1">
                          <div className="px-2">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'رسوم العمل' : 'Work Fee'}</p>
                            <p className="text-foreground font-bold">{item.work_fee.toLocaleString()} OMR</p>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-1">{isRtl ? 'الرسوم الحكومية' : 'Govt Fee'}</p>
                            <p className="text-foreground font-bold">{item.ministry_fee.toLocaleString()} OMR</p>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-0.5">{isRtl ? 'الدفعة الأولى' : 'Deposit (50%)'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                item.advance_paid ? "bg-emerald-500" : "bg-amber-500"
                              )} />
                              <span className="text-foreground font-bold">{item.advance_due_amount.toLocaleString()} OMR</span>
                            </div>
                          </div>
                          <div className="px-2 border-l border-white/5">
                            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-0.5">{isRtl ? 'الدفعة النهائية' : 'Balance'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                item.remaining_paid ? "bg-emerald-500" : "bg-amber-500"
                              )} />
                              <span className="text-foreground font-bold">{item.remaining_due_amount.toLocaleString()} OMR</span>
                            </div>
                          </div>
                        </div>
                      )}
 
                      {/* Right Block: Actions & Download */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-white/5 shrink-0">
                        <div className="text-left lg:text-right">
                          <p className="text-[9px] text-muted-foreground/40 uppercase font-black tracking-widest mb-1">{isRtl ? 'إجمالي القيمة' : 'Total Amount'}</p>
                          <p className="text-2xl font-mono font-bold text-foreground">
                            {item.total_amount.toLocaleString()} <span className="text-xs font-sans text-primary">OMR</span>
                          </p>
                        </div>
                        
                        {item.type === 'custom_invoice' && (
                          <button
                            onClick={() => {
                              downloadCustomInvoice(item.rawInvoice);
                            }}
                            className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-md"
                            title={isRtl ? 'تحميل الفاتورة' : 'Download Invoice'}
                          >
                            <Download size={18} />
                          </button>
                        )}

                        {item.jobId && (
                          <a
                            href={`/portal/jobs/${item.jobId}`}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all active:scale-95 shadow-md"
                            title="View Job Details"
                          >
                            <ArrowUpRight size={20} />
                          </a>
                        )}
                      </div>
 
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;
