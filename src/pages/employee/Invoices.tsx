import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, CheckCircle2, FileClock, Eye, Edit, Trash2 } from 'lucide-react';
import { useInvoices, useDeleteInvoice } from '../../hooks/employee/useInvoices';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import ConfirmModal from '../../components/shared/ConfirmModal';

const EmployeeInvoices = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: invoices, isLoading } = useInvoices();
  const { mutateAsync: deleteInvoice } = useDeleteInvoice();
  const [filter, setFilter] = useState<'all' | 'quotations' | 'unpaid' | 'paid'>('all');
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteInvoice(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete document.');
    }
  };

  const filteredInvoices = invoices?.filter(inv => {
    // Strict Privacy Isolation: Non-manager employees only view invoices belonging to them or their jobs
    if (profile && profile.role === 'employee' && !profile.is_manager) {
      const isInvoiceOwner = inv.employee_id === profile.id;
      const isJobWorker = inv.job && (inv.job.employee_id === profile.id || inv.job.assigned_by === profile.id);
      if (!isInvoiceOwner && !isJobWorker) return false;
    }

    // Status/Type filter
    if (filter === 'quotations' && inv.type !== 'quotation') return false;
    if (filter === 'unpaid' && (inv.type === 'quotation' || inv.status === 'paid')) return false;
    if (filter === 'paid' && inv.status !== 'paid') return false;
    
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchNumber = inv.invoice_number?.toLowerCase()?.includes(q);
      const matchClient = inv.client?.full_name?.toLowerCase()?.includes(q);
      if (!matchNumber && !matchClient) return false;
    }
    return true;
  });

  const getStatusDisplay = (type: string, status: string) => {
    if (type === 'quotation') {
      return <span className="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest border border-blue-500/20">Quotation</span>;
    }
    if (status === 'paid') {
      return <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={12}/> Paid</span>;
    }
    return <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest border border-amber-500/20 flex items-center gap-1"><FileClock size={12}/> Unpaid</span>;
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Financials</p>
          <h1 className="text-3xl font-syne font-bold text-foreground tracking-tight">Invoices & Quotations</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search by ID or Client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all w-full md:w-64 placeholder:text-muted-foreground/50"
            />
          </div>
          <button 
            onClick={() => navigate('/employee/invoices/new')}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all uppercase tracking-widest flex items-center gap-2 text-xs shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <Plus size={16} /> New Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6 border-b border-border/30 overflow-x-auto no-scrollbar">
        {['all', 'quotations', 'unpaid', 'paid'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap ${filter === f ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {f.replace('_', ' ')}
            {filter === f && (
              <motion.div layoutId="invTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <>
             <Skeleton height={80} rounded="xl" />
             <Skeleton height={80} rounded="xl" />
             <Skeleton height={80} rounded="xl" />
          </>
        ) : filteredInvoices?.length === 0 ? (
           <div className="py-24 text-center border border-dashed border-border/50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                 <FileText size={20} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">No Documents Found</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Create a quotation or invoice to get started.</p>
           </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredInvoices?.map(inv => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={inv.id}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:border-primary/30 hover:bg-muted/10 transition-all group shadow-sm gap-4"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold text-foreground">{inv.invoice_number || 'DRAFT'}</h3>
                      {getStatusDisplay(inv.type, inv.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Client: <span className="font-medium text-foreground">{inv.client?.full_name}</span>
                      {inv.job && ` • Job: ${inv.job?.job_code}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-black text-foreground">{inv.total_amount.toFixed(3)} OMR</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                      {format(new Date(inv.issue_date || new Date()), 'dd MMM yyyy')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/employee/invoices/${inv.id!}?view=true`)}
                      className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all shadow-sm"
                      title="View Document"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => navigate(`/employee/invoices/${inv.id!}`)}
                      className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-amber-500 hover:border-amber-500 hover:text-white transition-all shadow-sm"
                      title="Edit Document"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(inv.id!)}
                      className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-destructive hover:border-destructive hover:text-destructive-foreground transition-all shadow-sm"
                      title="Delete Document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default EmployeeInvoices;
