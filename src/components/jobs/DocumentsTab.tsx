import { useState } from 'react';
import { FileText, Download, Trash2, XCircle, UploadCloud, Eye } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type JobDocument, useUploadJobDocument } from '../../hooks/shared/useJobs';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  jobId: string;
  documents: JobDocument[];
  isEmployee: boolean;
  isAdmin: boolean;
}

import { useDropzone } from 'react-dropzone';

const DocumentsTab = ({ jobId, documents, isEmployee, isAdmin }: Props) => {
  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<JobDocument | null>(null);
  const [uploadMode, setUploadMode] = useState<'direct' | 'link'>('direct');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { mutate: uploadDoc, isPending } = useUploadJobDocument();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setFileName(file.name);
      }
    },
    multiple: false
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadMode === 'direct' && !selectedFile) return toast.error('Please select a file');
    if (uploadMode === 'link' && (!fileName || !fileUrl)) return toast.error('Please fill all fields');

    uploadDoc({
      jobId,
      fileName,
      fileUrl: uploadMode === 'link' ? fileUrl : undefined,
      file: uploadMode === 'direct' ? selectedFile! : undefined,
      docType: 'general'
    }, {
      onSuccess: () => {
        toast.success('Document uploaded successfully');
        setShowUpload(false);
        setFileName('');
        setFileUrl('');
        setSelectedFile(null);
      }
    });
  };

  return (
    <div className="space-y-6 relative overflow-hidden">
      
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
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Digital Artifact Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <a 
                     href={previewDoc.file_path} 
                     download 
                     className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                     title="Download Original"
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-syne font-bold text-foreground">Document Vault</h3>
          <p className="text-xs text-muted-foreground">Secure artifact storage for this workflow</p>
        </div>
        {(isEmployee || isAdmin) && (
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-primary text-[#0A0F1E] px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 transition-transform active:scale-95 flex items-center gap-2"
          >
            <UploadCloud size={16} /> New Upload
          </button>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Upload Document</h3>
                  <p className="text-xs text-muted-foreground">Securely store project artifacts</p>
                </div>
                <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <XCircle size={24} />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-muted rounded-xl mb-6">
                <button 
                  onClick={() => setUploadMode('direct')}
                  className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all", uploadMode === 'direct' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/60")}
                >
                  System File
                </button>
                <button 
                  onClick={() => setUploadMode('link')}
                  className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all", uploadMode === 'link' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/60")}
                >
                  Cloud Link
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {uploadMode === 'direct' ? (
                  <div {...getRootProps()} className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                    isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-muted/30",
                    selectedFile && "border-emerald-500/50 bg-emerald-500/5"
                  )}>
                    <input {...getInputProps()} />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <p className="text-sm font-bold text-foreground truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-sm font-bold text-foreground">Click or Drag File</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">PDF, Word, Images up to 10MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Display Name</label>
                      <input 
                        type="text" 
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="e.g. CR_Document.pdf"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-gold outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Public Link URL</label>
                      <input 
                        type="url" 
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-gold outline-none"
                        required
                      />
                    </div>
                  </>
                )}
                
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full py-4 mt-6 rounded-xl bg-primary text-[#0A0F1E] text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 disabled:opacity-50"
                >
                  {isPending ? 'Processing Upload...' : uploadMode === 'direct' ? 'Start Vault Secure Upload' : 'Record Document Link'}
                </button>
              </form>
           </div>
        </div>
      )}

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-2xl p-5 relative group overflow-hidden shadow-xl hover:border-gold/30 transition-colors">
               
               {doc.status === 'rejected' && (
                 <div className="absolute top-0 left-0 right-0 bg-red-500/10 text-red-500 border-b border-red-500/20 px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-center">
                   Rejected: {doc.rejection_reason}
                 </div>
               )}

               <div className={cn("flex items-start gap-4", doc.status === 'rejected' && "pt-6")}>
                 <div className="w-12 h-12 rounded-xl bg-white/5 text-primary flex items-center justify-center shrink-0">
                    <FileText size={20} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate mb-1" title={doc.file_name}>{doc.file_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">Uploaded by {doc.uploaded_by_name}</p>
                    <p className="text-[10px] text-muted-foreground/60">{new Date(doc.uploaded_at).toLocaleString()}</p>
                 </div>
               </div>

               <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", 
                    doc.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" : 
                    doc.status === 'pending' ? "bg-amber-500/10 text-amber-500" : 
                    "bg-red-500/10 text-red-400"
                  )}>
                    {doc.status}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     {(isAdmin || isEmployee) && doc.status === 'pending' && (
                       <button className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors" title="Reject Document">
                         <XCircle size={14} />
                       </button>
                     )}
                     <button 
                      onClick={() => setPreviewDoc(doc)}
                      className="text-muted-foreground hover:text-primary p-1.5 transition-colors" 
                      title="View Preview"
                     >
                       <Eye size={14} />
                     </button>
                     <button className="text-muted-foreground hover:text-foreground p-1.5 transition-colors" title="Download">
                       <Download size={14} />
                     </button>
                     {(isAdmin || isEmployee) && (
                       <button className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors" title="Delete">
                         <Trash2 size={14} />
                       </button>
                     )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-2xl bg-card">
           <FileText size={48} className="mx-auto mb-4 text-muted-foreground/60 opacity-30" />
           <p className="text-muted-foreground font-bold mb-2">Vault is Empty</p>
           <p className="text-xs text-muted-foreground/60 max-w-sm mx-auto">No documents have been uploaded to this job pipeline yet.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
