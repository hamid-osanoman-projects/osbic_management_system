import { useState, useRef } from 'react';
import { 
  FolderOpen, Lock, Download, Upload, 
  AlertCircle, CheckCircle2, X, Loader2,
  FileText, ShieldCheck, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  jobId: string;
  steps: any[];
  documents: any[];
}

const ClientDocumentsTab = ({ jobId, steps, documents }: Props) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null); // 'general' or stepId
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // 1. Identify Required Documents (from all steps)
  const requiredDocs = steps.flatMap(step => 
    (step.required_docs || []).map((docType: string) => {
      // Check if this specific document type has been uploaded for this step
      const isUploaded = documents.some(d => 
        d.job_step_id === step.id && 
        d.document_type === docType && 
        d.status !== 'rejected'
      );

      return {
        stepId: step.id,
        stepName: step.name_en,
        type: docType,
        isUploaded
      };
    })
  ).filter(doc => !doc.isUploaded);

  // 2. Filter Client-Visible Vault (Approved ones or ones they uploaded)
  const vaultDocs = documents.filter(d => d.is_client_visible || d.status === 'approved' || d.uploaded_by === profile?.id);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, stepId?: string, docType?: string) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validation
    if (file.size > 10 * 1024 * 1024) return toast.error('File exceeds 10MB limit');
    
    const targetId = stepId || 'general';
    setUploading(targetId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // 1. Storage Upload
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Database Entry
      const { error: dbError } = await (supabase.from('documents') as any).insert({
        job_id: jobId,
        job_step_id: stepId || null,
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        document_type: docType || 'other',
        status: 'pending',
        is_client_visible: true,
        version: 1
      });

      if (dbError) throw dbError;

      toast.success('Document archived in vault. Awaiting officer verification.');
      qc.invalidateQueries({ queryKey: ['job', jobId] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (path: string, name: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(path);
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast.error('Download failed');
    }
  };

  return (
    <div className="space-y-10">
      
      {/* ── REQUIRED ACTIONS (PHASE-SPECIFIC) ── */}
      {requiredDocs.length > 0 && (
        <section className="space-y-6">
           <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
             <AlertCircle size={14} /> Pending Directives
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requiredDocs.map((doc, idx) => (
                <div key={idx} className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                      <FileText size={48} />
                   </div>
                   
                   <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                         <p className="text-[9px] font-bold text-amber-500/60 uppercase tracking-widest">{doc.stepName}</p>
                         <h4 className="text-sm font-bold text-foreground">{doc.type}</h4>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:animate-bounce">
                         <Upload size={14} />
                      </div>
                   </div>

                   <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mb-6 leading-relaxed">
                      Our system requires this document to finalize the current operational phase. 
                   </p>

                   <button 
                     onClick={() => {
                        setSelectedStepId(doc.stepId);
                        fileInputRef.current?.click();
                     }}
                     disabled={uploading !== null}
                     className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                   >
                      {uploading === doc.stepId ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Secure Upload
                   </button>
                </div>
              ))}
           </div>
        </section>
      )}

      {/* ── MULTI-TIER VAULT ── */}
      <section className="bg-card border border-border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl shadow-black/5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 pb-6 border-b border-border">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
              <FolderOpen size={14} className="text-primary" /> Centralized Secure Vault
            </h2>
            <p className="text-[12px] font-bold text-foreground/40 uppercase tracking-widest">Digital Twin & Asset Ledger</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => {
                 setSelectedStepId(null);
                 fileInputRef.current?.click();
               }}
               className="px-6 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
             >
                <Upload size={14} /> General Upload
             </button>
             <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-xl border border-border text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
               <ShieldCheck size={12} className="text-emerald-500" /> Encrypted
             </div>
          </div>
        </div>

        {vaultDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {vaultDocs.map((doc) => (
               <div key={doc.id} className="bg-muted/20 border border-border rounded-3xl p-6 hover:border-primary/40 hover:bg-card hover:shadow-2xl shadow-black/5 transition-all group flex flex-col">
                 <div className="flex items-start justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border text-muted-foreground flex items-center justify-center shrink-0 shadow-sm group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <FileText size={20} />
                    </div>
                    <div className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded border",
                      doc.status === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      doc.status === 'rejected' ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                    )}>
                      {doc.status}
                    </div>
                 </div>

                 <div className="flex-1 mb-8">
                    <p className="text-[13px] font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">{doc.file_name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest truncate">{doc.document_type}</p>
                 </div>

                 <div className="pt-4 border-t border-border flex items-center gap-2">
                    <button 
                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                      className="flex-1 flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-xl py-3 text-[9px] font-extrabold uppercase tracking-widest transition-all"
                    >
                      <Download size={14} /> Get
                    </button>
                    {/* Add metadata/view button if needed */}
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-border rounded-[2rem] bg-muted/10">
             <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border">
               <FolderOpen size={32} className="text-muted-foreground/20" />
             </div>
             <p className="text-foreground font-extrabold uppercase tracking-widest text-[11px] mb-2">Vault Unpopulated</p>
             <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Your digital twin assets and official certifications will appear here.</p>
          </div>
        )}
      </section>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={(e) => handleUpload(e, selectedStepId || undefined)}
        className="hidden"
      />
    </div>
  );
};

export default ClientDocumentsTab;
