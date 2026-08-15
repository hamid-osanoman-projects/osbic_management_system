import React from 'react';
import { AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Props {
  remainingAmount: number;
  totalFee: number;
  isClient?: boolean;
  hideActionButton?: boolean;
  jobId?: string;
  onAction?: () => void;
}

const FinanceWarning: React.FC<Props> = ({ remainingAmount, totalFee, isClient, hideActionButton, jobId, onAction }) => {
  const navigate = useNavigate();

  if (remainingAmount <= 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden group shadow-lg shadow-amber-500/5"
    >
      {/* Decorative pulse background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/[0.05] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
           <AlertTriangle size={24} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-500 uppercase tracking-[0.15em] mb-1">Financial Milestone Overdue</h3>
          <p className="text-xs text-amber-200/70 font-medium max-w-md leading-relaxed">
            {isClient 
              ? `Your project has reached its final processing stage. To avoid operational delays, please settle the remaining balance of `
              : `This job is reaching its final milestones, but the remaining balance is still pending. Outstanding amount: `
            }
            <strong className="text-amber-500 font-bold text-sm">
              {new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(remainingAmount)}
            </strong>
          </p>
        </div>
      </div>

      {!isClient && !hideActionButton && (
        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full sm:w-auto">
          <div className="hidden lg:block text-right pr-4 border-r border-white/10 mr-2">
             <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Balance Ratio</p>
             <p className="text-sm font-mono font-bold text-white leading-none mt-1">
               {Math.round((remainingAmount / totalFee) * 100)}% <span className="text-[10px]">Pending</span>
             </p>
          </div>
          
          <button 
            onClick={() => onAction ? onAction() : navigate(`/admin/finance?job=${jobId}`)}
            className="flex-1 sm:flex-none px-6 py-3 bg-amber-500 text-amber-950 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group/btn"
          >
            Verify Payment
            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default FinanceWarning;
