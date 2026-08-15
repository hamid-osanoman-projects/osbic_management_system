import { downloadInvoice } from '../../utils/invoiceGenerator';
import { Download } from 'lucide-react';
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
  const handleDownload = () => {
    downloadInvoice(job, type, 'download');
  };

  return (
    <button
      onClick={handleDownload}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-syne font-bold uppercase tracking-widest text-[10px] bg-primary/20 text-primary border border-primary/20 hover:bg-primary hover:text-[#0A0F1E] shadow-lg shadow-primary/10",
        className
      )}
    >
      <Download size={14} /> Download Invoice
    </button>
  );
};

export default InvoiceButton;
