import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, Download, Eye, CheckCircle2,
  Clock, XCircle, AlertCircle, AlertTriangle, FolderOpen, Calendar
} from 'lucide-react';
import { useClientDocuments } from '../../hooks/client/useClientDocuments';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Documents = () => {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { data: documents, isLoading } = useClientDocuments(profile?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const filteredDocs = useMemo(() => {
    if (!documents) return [];

    let temp = [...documents];

    // Filter by Tab
    if (activeTab === 'verified') {
      temp = temp.filter(d => d.status === 'approved' && (!d.expiry_date || new Date(d.expiry_date) > new Date()));
    } else if (activeTab === 'pending') {
      temp = temp.filter(d => d.status === 'pending');
    } else if (activeTab === 'rejected') {
      temp = temp.filter(d => d.status === 'rejected');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter(d =>
        d.file_name.toLowerCase().includes(q) ||
        d.document_type.toLowerCase().includes(q) ||
        d.job_code.toLowerCase().includes(q)
      );
    }

    return temp;
  }, [documents, activeTab, searchQuery]);

  const countByTab = useMemo(() => {
    if (!documents) return { all: 0, verified: 0, pending: 0, rejected: 0 };
    return {
      all: documents.length,
      verified: documents.filter(d => d.status === 'approved' && (!d.expiry_date || new Date(d.expiry_date) > new Date())).length,
      pending: documents.filter(d => d.status === 'pending').length,
      rejected: documents.filter(d => d.status === 'rejected').length,
    };
  }, [documents]);

  if (isLoading) {
    return (
      <div className="p-8 sm:p-12 space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto no-scrollbar relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Document Preview Modal ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-3xl w-full h-full max-w-6xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground truncate max-w-xs">{previewDoc.file_name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Digital Document Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                  title="Open in new tab"
                >
                  <Download size={20} />
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0A0F1E]/50 relative overflow-hidden">
              {previewDoc?.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={previewDoc.file_path}
                  alt={previewDoc.file_name}
                  className="absolute inset-0 w-full h-full object-contain p-4 lg:p-8"
                />
              ) : (
                <iframe
                  src={previewDoc?.file_path?.startsWith('http') ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.file_path)}&embedded=true` : ''}
                  className="w-full h-full border-none bg-white"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-6 bg-background/50 border-b border-white/[0.02]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-syne font-bold text-foreground mb-1">
              {isRtl ? 'الخزنة الرقمية' : 'Digital Vault'}
            </h1>
            <p className="text-muted-foreground/40 transition-colors uppercase tracking-[0.2em] text-[8px] font-black leading-none">
              {isRtl ? 'إدارة وتحميل المستندات والوثائق الخاصة بك' : 'Manage and download your verified documents & credentials'}
            </p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col xl:flex-row gap-6 items-center w-full">
          <div className="flex bg-muted/50 p-1 rounded-2xl border border-border self-start shrink-0 shadow-inner overflow-x-auto max-w-full no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap",
                activeTab === 'all' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isRtl ? 'الكل' : 'All'} ({countByTab.all})
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={cn(
                "px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap",
                activeTab === 'verified' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* <CheckCircle2 size={13} className={activeTab === 'verified' ? "text-[#0A0F1E]" : "text-emerald-500"} /> */}
              {isRtl ? 'المعتمدة' : 'Verified'} ({countByTab.verified})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap",
                activeTab === 'pending' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* <Clock size={13} className={activeTab === 'pending' ? "text-[#0A0F1E]" : "text-amber-500"} /> */}
              {isRtl ? 'تحت المراجعة' : 'Pending'} ({countByTab.pending})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                "px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap",
                activeTab === 'rejected' ? "bg-primary text-[#0A0F1E] shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* <AlertTriangle size={13} className={activeTab === 'rejected' ? "text-[#0A0F1E]" : "text-red-500"} /> */}
              {isRtl ? 'بحاجة لإجراء' : 'Action Required'} ({countByTab.rejected})
            </button>
          </div>

          <div className="flex-1 relative w-full group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={isRtl ? 'البحث في المستندات، اسم الملف، رمز الطلب...' : 'Search documents by file name, type, job code...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-foreground outline-none focus:border-primary/30 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── Document Grid ── */}
      <div className="p-6 sm:p-8 lg:p-12 pt-8 pb-24 shrink-0">
        <div className="max-w-7xl mx-auto">
          {filteredDocs.length === 0 ? (
            <div className="py-24 text-center bg-card/40 backdrop-blur-xl border border-border rounded-[40px] shadow-2xl flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 mx-auto border border-white/5">
                <FolderOpen size={32} className="text-muted-foreground/20" />
              </div>
              <h3 className="text-lg font-syne font-bold text-foreground mb-1">
                {isRtl ? 'لا توجد مستندات مطابقة' : 'No matching documents'}
              </h3>
              <p className="text-[10px] text-muted-foreground/40 max-w-xs mx-auto uppercase tracking-widest">
                {isRtl ? 'الخزنة فارغة' : 'Vault section clear'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocs.map((doc) => {
                const isDocExpired = doc.expiry_date ? new Date(doc.expiry_date) < new Date() : false;

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "bg-card/40 backdrop-blur-md border rounded-[32px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden flex flex-col justify-between group",
                      doc.status === 'approved' ? "border-emerald-500/10 hover:border-emerald-500/25" :
                        doc.status === 'rejected' ? "border-red-500/10 hover:border-red-500/25" :
                          "border-border hover:border-primary/20"
                    )}
                  >
                    <div>
                      {/* Top Bar inside Card */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-all",
                          doc.status === 'approved' && !isDocExpired ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            doc.status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                              doc.status === 'approved' && isDocExpired ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                "bg-gold/10 border-gold/20 text-gold"
                        )}>
                          <FileText size={24} />
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                            doc.status === 'approved' && !isDocExpired ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                              doc.status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                doc.status === 'approved' && isDocExpired ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                  "bg-gold/10 border-gold/20 text-gold"
                          )}>
                            {doc.status === 'approved' && isDocExpired ? (isRtl ? 'منتهي الصلاحية' : 'Expired') : (isRtl ? (doc.status === 'approved' ? 'معتمد' : doc.status === 'pending' ? 'معلق' : 'مرفوض') : doc.status)}
                          </span>
                        </div>
                      </div>

                      {/* Doc Info */}
                      <div className="mb-4">
                        <h4 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors" title={doc.file_name}>
                          {doc.file_name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mt-1">
                          {doc.document_type}
                        </p>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/[0.03] text-[10px] text-muted-foreground/60 font-mono mb-4">
                        <div>
                          <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-0.5">{isRtl ? 'رمز الطلب' : 'Project Code'}</p>
                          <p className="text-primary font-bold">{doc.job_code}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-wider text-muted-foreground/30 mb-0.5">{isRtl ? 'حجم الملف' : 'Size'}</p>
                          <p className="text-foreground">
                            {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                          </p>
                        </div>
                        {doc.expiry_date && (
                          <div className="col-span-2 flex items-center gap-1.5 text-amber-500/80">
                            <Calendar size={12} />
                            <span>{isRtl ? 'تاريخ الانتهاء:' : 'Expires:'} {new Date(doc.expiry_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Rejection Reason Notice */}
                      {doc.status === 'rejected' && doc.rejection_reason && (
                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl mb-4 flex gap-2 items-start">
                          <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-400 leading-normal">
                            <span className="font-bold">{isRtl ? 'سبب الرفض: ' : 'Reason: '}</span>
                            {doc.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-2 mt-2 pt-4 border-t border-white/[0.02]">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-foreground py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Eye size={12} />
                        {isRtl ? 'عرض' : 'Preview'}
                      </button>
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-primary hover:bg-primary/90 text-[#0A0F1E] py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Download size={12} />
                        {isRtl ? 'تحميل' : 'Download'}
                      </a>
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

export default Documents;
