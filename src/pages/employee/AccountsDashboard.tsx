import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Wallet, CheckCircle2, AlertCircle, RefreshCw, FileText, Lock, Building2, ExternalLink, Activity, DollarSign, Users, ChevronRight, BarChart4, LayoutDashboard, History, X, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useExpenses } from '../../hooks/employee/useExpenses';
import { useAccountsOverview } from '../../hooks/employee/useAccountsOverview';
import { useNavigate } from 'react-router-dom';
import { downloadInvoice, downloadReceipt } from '../../utils/invoiceGenerator';

export default function AccountsDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  if (!profile?.can_do_accounts) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Lock className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-syne font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view the Accounts Portal.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'expenses' | 'history'>('overview');
  
  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Verify Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);
  
  // Job Details Modal State
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [jobDetailsTarget, setJobDetailsTarget] = useState<any | null>(null);

  const { pendingExpenses, loadingPending, updateExpenseStatus } = useExpenses();
  const { data: accountsData, isLoading: loadingOverview } = useAccountsOverview();

  // Fetch pending payments
  const { data: pendingPayments, isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['pending_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_payments')
        .select(`
          *,
          job:jobs(job_code, client:profiles!client_id(full_name, phone)),
          recorder:profiles!job_payments_recorded_by_fkey(full_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch verified/history payments
  const { data: historyPayments, isLoading: loadingHistory } = useQuery({
    queryKey: ['history_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_payments')
        .select(`
          *,
          job:jobs(job_code, client:profiles!client_id(full_name, phone)),
          recorder:profiles!job_payments_recorded_by_fkey(full_name),
          verifier:profiles!job_payments_verified_by_fkey(full_name)
        `)
        .in('status', ['verified', 'rejected'])
        .order('verified_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    }
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['accounts_overview'] });
    qc.invalidateQueries({ queryKey: ['job'] });
    qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
    qc.invalidateQueries({ queryKey: ['history_payments'] });
    refetchPayments();
  };

  const openVerifyModal = (payment: any) => {
    setVerifyTarget(payment);
    setVerifyModalOpen(true);
  };

  const submitVerify = async () => {
    if (!verifyTarget) return;
    try {
      // 1. Update payment status to verified
      const { error: verifyErr } = await supabase
        .from('job_payments')
        .update({
          status: 'verified',
          verified_by: profile.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', verifyTarget.id);

      if (verifyErr) throw verifyErr;

      // 2. Fetch job details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('id, total_fee, work_fee, ministry_fee, advance_paid_at, remaining_paid_at')
        .eq('id', verifyTarget.job_id)
        .single();

      if (jobData) {
        // Fetch all verified payments
        const { data: verifiedList } = await supabase
          .from('job_payments')
          .select('amount')
          .eq('job_id', verifyTarget.job_id)
          .eq('status', 'verified');

        // Fetch additional charges
        const { data: chargesList } = await supabase
          .from('job_additional_charges')
          .select('amount')
          .eq('job_id', verifyTarget.job_id);

        const totalPaid = (verifiedList || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const totalAdditional = (chargesList || []).reduce((sum, c) => sum + Number(c.amount), 0);
        const totalBilled = Number(jobData.total_fee) || (Number(jobData.work_fee) + Number(jobData.ministry_fee) + totalAdditional);
        const remaining = Math.max(0, totalBilled - totalPaid);

        const isAdvancePaid = totalPaid >= (totalBilled * 0.5);
        const isRemainingPaid = totalPaid >= totalBilled;

        await supabase.from('jobs').update({
          advance_paid: isAdvancePaid,
          advance_paid_at: isAdvancePaid ? (jobData.advance_paid_at || new Date().toISOString()) : null,
          remaining_paid: isRemainingPaid,
          remaining_paid_at: isRemainingPaid ? (jobData.remaining_paid_at || new Date().toISOString()) : null,
          advance_amount: totalPaid,
          remaining_amount: remaining
        }).eq('id', verifyTarget.job_id);

        // Update the linked invoice status based on remaining payment status
        const invoiceStatus = isRemainingPaid ? 'paid' : 'unpaid';
        await supabase
          .from('invoices')
          .update({
            status: invoiceStatus,
            paid_date: isRemainingPaid ? new Date().toISOString() : null
          })
          .eq('job_id', verifyTarget.job_id);
      }

      toast.success('Payment verified successfully. Operations unlocked.');
      setVerifyModalOpen(false);
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  const openRejectModal = (paymentId: string) => {
    setRejectTargetId(paymentId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const { data: paymentData } = await supabase
        .from('job_payments')
        .select('job_id')
        .eq('id', rejectTargetId)
        .single();

      const { error } = await supabase
        .from('job_payments')
        .update({
          status: 'rejected',
          verified_by: profile.id,
          verified_at: new Date().toISOString(),
          notes: `[REJECTED]: ${rejectReason}`
        })
        .eq('id', rejectTargetId);

      if (error) throw error;

      // Recalculate job totals
      if (paymentData?.job_id) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('id, total_fee, work_fee, ministry_fee, advance_paid_at, remaining_paid_at')
          .eq('id', paymentData.job_id)
          .single();

        if (jobData) {
          const { data: verifiedList } = await supabase
            .from('job_payments')
            .select('amount')
            .eq('job_id', paymentData.job_id)
            .eq('status', 'verified');

          const { data: chargesList } = await supabase
            .from('job_additional_charges')
            .select('amount')
            .eq('job_id', paymentData.job_id);

          const totalPaid = (verifiedList || []).reduce((sum, p) => sum + Number(p.amount), 0);
          const totalAdditional = (chargesList || []).reduce((sum, c) => sum + Number(c.amount), 0);
          const totalBilled = Number(jobData.total_fee) || (Number(jobData.work_fee) + Number(jobData.ministry_fee) + totalAdditional);
          const remaining = Math.max(0, totalBilled - totalPaid);

          const isAdvancePaid = totalPaid >= (totalBilled * 0.5);
          const isRemainingPaid = totalPaid >= totalBilled;

          await supabase.from('jobs').update({
            advance_paid: isAdvancePaid,
            advance_paid_at: isAdvancePaid ? jobData.advance_paid_at : null,
            remaining_paid: isRemainingPaid,
            remaining_paid_at: isRemainingPaid ? jobData.remaining_paid_at : null,
            advance_amount: totalPaid,
            remaining_amount: remaining
          }).eq('id', paymentData.job_id);

          // Update the linked invoice status based on remaining payment status
          const invoiceStatus = isRemainingPaid ? 'paid' : 'unpaid';
          await supabase
            .from('invoices')
            .update({
              status: invoiceStatus,
              paid_date: isRemainingPaid ? new Date().toISOString() : null
            })
            .eq('job_id', paymentData.job_id);
        }
      }

      toast.success('Payment rejected.');
      setRejectModalOpen(false);
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const handleViewReceipt = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      toast.error('Could not open document.');
    }
  };

  // KPI Calculations
  const totalBilled = accountsData?.reduce((sum, job) => sum + (job.total_fee || 0), 0) || 0;
  const totalVerified = accountsData?.reduce((sum, job) => sum + (job.advance_amount || 0), 0) || 0;
  const totalSpent = accountsData?.reduce((sum, job) => sum + (job.total_spent || 0), 0) || 0;
  const totalOutstanding = accountsData?.reduce((sum, job) => sum + Math.max(0, job.remaining_amount || 0), 0) || 0;

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground flex items-center gap-3">
            <BarChart4 className="w-8 h-8 text-primary" /> Accounts Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Master Financial Ledger & Verification Center</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <DollarSign size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Billed</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-black text-foreground">
              {totalBilled.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue generated</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verified Paid</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-black text-emerald-500">
              {totalVerified.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total collected & verified</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <Activity size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ops Expenses</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-black text-rose-500">
              {totalSpent.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total operational spending</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outstanding</span>
          </div>
          <div>
            <div className="text-3xl font-mono font-black text-amber-500">
              {totalOutstanding.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total amount due</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-1 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview' 
                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <LayoutDashboard size={16} /> Master Ledger
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'payments' 
                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <RefreshCw size={16} /> Verifications
            {pendingPayments && pendingPayments.length > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'expenses' 
                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <FileText size={16} /> Audits
            {pendingExpenses && pendingExpenses.length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingExpenses.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history' 
                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <History size={16} /> Verified History
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Job Details</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client & Team</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Billed</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Verified Paid</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Ops Spent</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Balance Due</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loadingOverview ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading ledger data...
                        </td>
                      </tr>
                    ) : accountsData?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                          No jobs found in the ledger.
                        </td>
                      </tr>
                    ) : (
                      accountsData?.map((job) => (
                        <tr key={job.id} className="hover:bg-muted/10 transition-colors group cursor-pointer" onClick={() => { setJobDetailsTarget(job); setJobDetailsModalOpen(true); }}>
                          <td className="px-6 py-4">
                            <div className="font-syne font-bold text-foreground flex items-center gap-2">
                              {job.job_code}
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(job.created_at), 'MMM d, yyyy')}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              {job.client?.full_name || 'Unknown'}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Sales: {job.sales?.full_name || 'None'}</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Ops: {job.ops?.full_name || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-sm font-bold text-foreground">{(job.total_fee || 0).toFixed(3)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-sm font-bold text-emerald-500">{(job.advance_amount || 0).toFixed(3)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-sm font-bold text-rose-500">{(job.total_spent || 0) > 0 ? (job.total_spent || 0).toFixed(3) : '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-mono text-sm font-bold ${(job.remaining_amount || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {(job.remaining_amount || 0).toFixed(3)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                              job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              job.status === 'draft' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {loadingPayments ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              ) : pendingPayments?.length === 0 ? (
                <div className="bg-card/50 border border-border/50 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-80" />
                  <h3 className="text-xl font-bold text-foreground">All Caught Up!</h3>
                  <p className="text-muted-foreground mt-2">No pending payments waiting for verification.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingPayments?.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-card border border-amber-500/30 shadow-lg shadow-amber-500/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-syne font-bold text-lg">{payment.job?.job_code}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-widest">
                              {payment.payment_method}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Client: <span className="text-foreground">{payment.job?.client?.full_name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recorded by: {payment.recorder?.full_name} on {format(new Date(payment.created_at), 'MMM d, h:mm a')}
                          </p>
                          {payment.reference_number && (
                            <p className="text-xs font-mono mt-1 text-primary">Ref: {payment.reference_number}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-3 shrink-0">
                        <div className="text-3xl font-mono font-black text-amber-500">
                          {payment.amount.toFixed(3)} <span className="text-lg opacity-50">OMR</span>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button
                            onClick={() => openRejectModal(payment.id)}
                            className="flex-1 md:flex-none px-4 py-2 border border-rose-500/30 text-rose-500 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openVerifyModal(payment)}
                            className="flex-1 md:flex-none px-6 py-2 bg-emerald-500 text-emerald-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Verify & Unlock
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              {loadingPending ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              ) : pendingExpenses?.length === 0 ? (
                <div className="bg-card/50 border border-border/50 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 opacity-80" />
                  <h3 className="text-xl font-bold text-foreground">All Audited!</h3>
                  <p className="text-muted-foreground mt-2">No pending expenses waiting for approval.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingExpenses?.map((expense: any) => (
                    <div
                      key={expense.id}
                      className="bg-card border border-emerald-500/30 shadow-lg shadow-emerald-500/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-syne font-bold text-lg">{expense.job?.job_code}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-widest">
                              {expense.service?.service_name}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-widest">
                              {expense.expense_type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Logged by: <span className="text-foreground">{expense.creator?.full_name}</span> on {format(new Date(expense.created_at), 'MMM d, h:mm a')}
                          </p>
                          {expense.notes && (
                            <p className="text-xs mt-2 text-foreground/80 bg-foreground/5 p-3 rounded-xl italic border-l-2 border-primary">"{expense.notes}"</p>
                          )}
                          {expense.receipt_url && (
                            <button 
                              onClick={() => handleViewReceipt(expense.receipt_url)}
                              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-lg w-fit transition-colors"
                            >
                              <ExternalLink size={14} /> View Attached Receipt
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-3 shrink-0">
                        <div className="text-3xl font-mono font-black text-emerald-500">
                          {expense.amount.toFixed(3)} <span className="text-lg opacity-50">OMR</span>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button
                            onClick={() => {
                              if(window.confirm('Reject this expense?')) {
                                updateExpenseStatus.mutate({ id: expense.id, status: 'rejected' });
                                invalidateAll();
                              }
                            }}
                            className="flex-1 md:flex-none px-4 py-2 border border-rose-500/30 text-rose-500 rounded-xl text-sm font-bold hover:bg-rose-500/10 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              updateExpenseStatus.mutate({ id: expense.id, status: 'approved' });
                              invalidateAll();
                            }}
                            className="flex-1 md:flex-none px-6 py-2 bg-emerald-500 text-emerald-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve Expense
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              ) : historyPayments?.length === 0 ? (
                <div className="bg-card/50 border border-border/50 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                  <History className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-foreground">No History</h3>
                  <p className="text-muted-foreground mt-2">Verified and rejected payments will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {historyPayments?.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-card border border-border shadow-sm rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-75 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${payment.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {payment.status === 'verified' ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-syne font-bold text-lg">{payment.job?.job_code}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${payment.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {payment.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Client: <span className="text-foreground">{payment.job?.client?.full_name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {payment.verifier?.full_name} on {payment.verified_at ? format(new Date(payment.verified_at), 'MMM d, h:mm a') : 'Unknown'}
                          </p>
                          {payment.notes && payment.notes.includes('[REJECTED]') && (
                            <p className="text-xs mt-2 text-rose-400 bg-rose-500/10 p-2 rounded-lg italic border-l-2 border-rose-500">
                              {payment.notes.replace('[REJECTED]: ', 'Reason: ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-3 shrink-0">
                        <div className={`text-3xl font-mono font-black ${payment.status === 'verified' ? 'text-emerald-500' : 'text-muted-foreground line-through'}`}>
                          {payment.amount.toFixed(3)} <span className="text-lg opacity-50">OMR</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Verify Modal */}
      <AnimatePresence>
        {verifyModalOpen && verifyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerifyModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-syne font-bold text-foreground">Confirm Verification</h2>
                  <p className="text-sm text-muted-foreground">Please double-check the details below.</p>
                </div>
              </div>

              <div className="space-y-4 bg-background/50 border border-border p-4 rounded-xl mb-6">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</span>
                  <span className="font-mono text-sm font-bold text-emerald-500">{verifyTarget.amount.toFixed(3)} OMR</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Job Code</span>
                  <span className="font-syne font-bold text-sm text-foreground">{verifyTarget.job?.job_code}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Client</span>
                  <span className="font-syne font-bold text-sm text-foreground">{verifyTarget.job?.client?.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Method</span>
                  <span className="text-sm text-foreground capitalize">{verifyTarget.payment_method?.replace('_', ' ')}</span>
                </div>
                {verifyTarget.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ref No.</span>
                    <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded">{verifyTarget.reference_number}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setVerifyModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-border text-foreground rounded-xl text-sm font-bold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitVerify}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-emerald-950 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} /> Confirm & Unlock
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-syne font-bold text-foreground">Reject Payment</h2>
                  <p className="text-sm text-muted-foreground">Provide a reason for the Sales team.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Rejection Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Transfer screenshot is blurry, amounts do not match..."
                    className="w-full h-32 px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none transition-all"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setRejectModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-border text-foreground rounded-xl text-sm font-bold hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReject}
                    className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={16} /> Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Job Details Modal */}
      <AnimatePresence>
        {jobDetailsModalOpen && jobDetailsTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setJobDetailsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-syne font-bold text-foreground">{jobDetailsTarget.job_code}</h2>
                    <p className="text-sm text-muted-foreground">{jobDetailsTarget.client?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => downloadInvoice(jobDetailsTarget, 'view')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" /> View Invoice
                  </button>
                  <button
                    onClick={() => downloadInvoice(jobDetailsTarget, 'download')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" /> Full Invoice
                  </button>
                  <button
                    onClick={() => setJobDetailsModalOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                {/* Job & Client Details */}
                <div className="bg-background border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Client Name</p>
                    <p className="text-sm font-bold text-foreground">{jobDetailsTarget.client?.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company Name</p>
                    <p className="text-sm font-bold text-foreground">{jobDetailsTarget.client?.company_name || 'Individual'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Handled By (Sales)</p>
                    <p className="text-sm font-bold text-foreground">{jobDetailsTarget.sales?.full_name || 'Unassigned'}</p>
                  </div>
                </div>

                {/* Job Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background border border-border rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Fee</p>
                    <p className="text-xl font-mono font-bold text-foreground">{(jobDetailsTarget.total_fee || 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Paid</p>
                    <p className="text-xl font-mono font-bold text-emerald-500">{(jobDetailsTarget.advance_amount || 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Balance Due</p>
                    <p className="text-xl font-mono font-bold text-amber-500">{(jobDetailsTarget.remaining_amount || 0).toFixed(3)}</p>
                  </div>
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Ops Spent</p>
                    <p className="text-xl font-mono font-bold text-rose-500">{(jobDetailsTarget.total_spent || 0).toFixed(3)}</p>
                  </div>
                </div>

                {/* Payment History Table */}
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Payment History
                  </h3>
                  
                  {jobDetailsTarget.payments?.length === 0 ? (
                    <div className="bg-background border border-border border-dashed rounded-2xl p-8 text-center">
                      <p className="text-muted-foreground">No payments recorded yet.</p>
                    </div>
                  ) : (
                    <div className="bg-background border border-border rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ref #</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Status</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {jobDetailsTarget.payments?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((payment: any, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/10">
                              <td className="px-4 py-3 text-sm text-foreground">
                                {format(new Date(payment.created_at), 'MMM d, yyyy')}
                                <div className="text-[10px] text-muted-foreground">{format(new Date(payment.created_at), 'h:mm a')}</div>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-foreground">
                                {Number(payment.amount).toFixed(3)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="capitalize text-sm">{payment.payment_method?.replace('_', ' ') || 'Unknown'}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {payment.reference_number || '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                                  payment.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                  payment.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                  'bg-rose-500/10 text-rose-500'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {payment.status === 'verified' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); downloadReceipt(jobDetailsTarget, payment, 'view'); }}
                                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                      title="View Receipt"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); downloadReceipt(jobDetailsTarget, payment, 'download'); }}
                                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                      title="Download Receipt"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
