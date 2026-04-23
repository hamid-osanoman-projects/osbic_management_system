import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import { Download, FileText, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  job: any;
  type: 'advance' | 'remaining' | 'full';
  className?: string;
}

const InvoiceButton = ({ job, type, className }: Props) => {
  const fileName = `OSBIC_INV_${job.job_code}_${type.toUpperCase()}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDF job={job} type={type} />}
      fileName={fileName}
      className="inline-block"
    >
      {({ loading, error }) => (
        <button
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-syne font-bold uppercase tracking-widest text-[10px]",
            loading 
              ? "bg-white/5 text-muted-foreground/40 cursor-not-allowed" 
              : "bg-primary/20 text-primary border border-primary/20 hover:bg-primary hover:text-[#0A0F1E] shadow-lg shadow-primary/10",
            className
          )}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Preparing Invoice...
            </>
          ) : error ? (
            <>
              <FileText size={14} className="text-red-400" /> Error generating
            </>
          ) : (
            <>
              <Download size={14} /> Download Invoice
            </>
          )}
        </button>
      )}
    </PDFDownloadLink>
  );
};

export default InvoiceButton;
