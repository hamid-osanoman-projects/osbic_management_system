import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Receipt, DollarSign, CheckCircle2, AlertCircle, X, CreditCard, Banknote, Landmark, Upload, Paperclip, Download, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdvanceForm = ({ job, onSave }: { job: any, onSave: () => void }) => {
  const [amount, setAmount] = useState(job.advance_amount?.toString() || '0');
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'pos' | 'online'>('bank_transfer');
  const [reference, setReference] = useState('');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if ((method === 'bank_transfer' || method === 'online') && !reference.trim()) {
      toast.error('Reference number is required for bank transfer or online payment');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          advance_paid: true,
          advance_paid_at: new Date(dateReceived).toISOString(),
          advance_payment_method: method,
          advance_reference: reference || null,
          advance_amount: parseFloat(amount)
        })
        .eq('id', job.id);

      if (error) throw error;
      toast.success('Advance payment recorded!');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Amount (OMR)</label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Date Received</label>
          <input
            type="date"
            value={dateReceived}
            onChange={e => setDateReceived(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Payment Method</label>
        <div className="flex flex-wrap gap-4">
          {(['bank_transfer', 'pos', 'cash', 'online'] as const).map(m => (
            <label key={m} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="radio"
                name="advance_method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="accent-primary"
              />
              <span className="capitalize">{m.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {(method === 'bank_transfer' || method === 'online') && (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Reference Number *</label>
          <input
            type="text"
            placeholder="e.g. Transaction Ref"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
            required
          />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary text-[#0A0F1E] font-bold text-xs py-2.5 rounded-xl hover:bg-primary/95 transition-all disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Mark Advance as Paid'}
      </button>
    </div>
  );
};

const RemainingForm = ({ job, onSave }: { job: any, onSave: () => void }) => {
  const [amount, setAmount] = useState(job.remaining_amount?.toString() || '0');
  const [method, setMethod] = useState<'cash' | 'bank_transfer' | 'pos' | 'online'>('bank_transfer');
  const [reference, setReference] = useState('');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if ((method === 'bank_transfer' || method === 'online') && !reference.trim()) {
      toast.error('Reference number is required for bank transfer or online payment');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          remaining_paid: true,
          remaining_paid_at: new Date(dateReceived).toISOString(),
          remaining_payment_method: method,
          remaining_reference: reference || null,
          remaining_amount: parseFloat(amount)
        })
        .eq('id', job.id);

      if (error) throw error;
      toast.success('Remaining payment recorded!');
      onSave();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Amount (OMR)</label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Date Received</label>
          <input
            type="date"
            value={dateReceived}
            onChange={e => setDateReceived(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Payment Method</label>
        <div className="flex flex-wrap gap-4">
          {(['bank_transfer', 'pos', 'cash', 'online'] as const).map(m => (
            <label key={m} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="radio"
                name="remaining_method"
                checked={method === m}
                onChange={() => setMethod(m)}
                className="accent-primary"
              />
              <span className="capitalize">{m.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {(method === 'bank_transfer' || method === 'online') && (
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Reference Number *</label>
          <input
            type="text"
            placeholder="e.g. Transaction Ref"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full bg-white/5 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
            required
          />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-primary text-[#0A0F1E] font-bold text-xs py-2.5 rounded-xl hover:bg-primary/95 transition-all disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Mark Final Payment as Paid'}
      </button>
    </div>
  );
};

export const JobLedger = ({ job, onPaymentReceived }: { job: any, onPaymentReceived: () => void }) => {
  const { profile } = useAuth();
  const [additionalCharges, setAdditionalCharges] = useState<any[]>([]);
  const [subTasks, setSubTasks] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isAddingCharge, setIsAddingCharge] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newCharge, setNewCharge] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'bank_transfer', reference: '', notes: '' });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadChargesAndPayments = async () => {
    setLoading(true);
    
    // Fetch Charges
    const { data: charges } = await supabase
      .from('job_additional_charges')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
    if (charges) setAdditionalCharges(charges);

    // Fetch Sub-Task Fees
    const { data: stData } = await supabase
      .from('job_sub_tasks')
      .select('id, name, ministry_fee, job_steps!inner(job_id)')
      .eq('job_steps.job_id', job.id);
    if (stData) setSubTasks(stData.filter(st => st.ministry_fee && st.ministry_fee > 0));

    // Fetch Payments
    const { data: payData } = await supabase
      .from('job_payments')
      .select('*, profiles:recorded_by(full_name)')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
    if (payData) setPayments(payData);

    setLoading(false);
  };

  useEffect(() => {
    if (job?.id) loadChargesAndPayments();
  }, [job]);

  const handleAddCharge = async () => {
    if (!newCharge.description || !newCharge.amount) return;

    const { data } = await supabase.from('job_additional_charges').insert({
      job_id: job.id,
      description: newCharge.description,
      amount: parseFloat(newCharge.amount)
    } as any).select().single();

    if (data) {
      const updatedCharges = [...additionalCharges, data];
      setAdditionalCharges(updatedCharges);
      setNewCharge({ description: '', amount: '' });
      setIsAddingCharge(false);

      // Update job totals in DB
      const newTotalAdditional = updatedCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
      const totalSubTasks = subTasks.reduce((sum, st) => sum + Number(st.ministry_fee), 0);
      const newTotalBilled = job.work_fee + job.ministry_fee + newTotalAdditional + totalSubTasks;
      const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      const newRemaining = Math.max(0, newTotalBilled - totalPaid);
      
      await supabase.from('jobs').update({
        total_fee: newTotalBilled,
        remaining_amount: newRemaining,
        remaining_paid: newRemaining <= 0
      }).eq('id', job.id);
      
      onPaymentReceived();
    }
  };

  const handleDeleteCharge = async (id: string) => {
    await supabase.from('job_additional_charges').delete().eq('id', id);
    const updatedCharges = additionalCharges.filter(c => c.id !== id);
    setAdditionalCharges(updatedCharges);

    // Update job totals in DB
    const newTotalAdditional = updatedCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
    const totalSubTasks = subTasks.reduce((sum, st) => sum + Number(st.ministry_fee), 0);
    const newTotalBilled = job.work_fee + job.ministry_fee + newTotalAdditional + totalSubTasks;
    const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    const newRemaining = Math.max(0, newTotalBilled - totalPaid);
    
    await supabase.from('jobs').update({
      total_fee: newTotalBilled,
      remaining_amount: newRemaining,
      remaining_paid: newRemaining <= 0
    }).eq('id', job.id);
    
    onPaymentReceived();
  };

  const handleRecordPayment = async () => {
    if (!newPayment.amount) return;
    
    setIsUploading(true);
    let filePath = '';
    
    try {
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${job.id}/receipt_${Date.now()}.${fileExt}`;
        filePath = `documents/${fileName}`;
        
        const { error: storageError } = await supabase.storage.from('documents').upload(filePath, receiptFile);
        if (storageError) throw storageError;
        
        // Also add it to documents table so it shows up in job documents if needed
        await supabase.from('documents').insert({
          job_id: job.id,
          uploaded_by: profile?.id,
          file_name: receiptFile.name,
          file_path: filePath,
          file_size: receiptFile.size,
          file_type: receiptFile.type,
          document_type: 'payment_receipt',
          status: 'approved',
          is_client_visible: false,
          version: 1
        });
      }

      let finalNotes = newPayment.notes || null;
      if (filePath) {
        finalNotes = finalNotes ? `${finalNotes}\n[RECEIPT:${filePath}|${receiptFile?.name}]` : `[RECEIPT:${filePath}|${receiptFile?.name}]`;
      }

      const { data, error } = await supabase.from('job_payments').insert({
        job_id: job.id,
        amount: parseFloat(newPayment.amount),
        payment_method: newPayment.method,
        reference_number: newPayment.reference || null,
        notes: finalNotes,
        recorded_by: profile?.id
      } as any).select('*, profiles:recorded_by(full_name)').single();

      if (error) throw error;
      toast.success('Payment recorded successfully');
      setIsUploading(false);

    if (data) {
      const updatedPayments = [...payments, data];
      setPayments(updatedPayments);
      setNewPayment({ amount: '', method: 'bank_transfer', reference: '', notes: '' });
      setReceiptFile(null);
      setIsAddingPayment(false);
      
      // Update job totals in DB
      const totalAdditional = additionalCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
      const totalSubTasks = subTasks.reduce((sum, st) => sum + Number(st.ministry_fee), 0);
      const newTotalBilled = job.work_fee + job.ministry_fee + totalAdditional + totalSubTasks;
      const newTotalPaid = updatedPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      const newRemaining = Math.max(0, newTotalBilled - newTotalPaid);
      
      await supabase.from('jobs').update({
        remaining_amount: newRemaining,
        remaining_paid: newRemaining <= 0,
        advance_paid: newTotalPaid > 0,
        advance_amount: newTotalPaid // Storing total paid in advance_amount for UI compatibility
      }).eq('id', job.id);
      
      // If the job was in draft, recording the first payment can auto-confirm it
      if (job.status === 'draft') {
        await handleConfirmPayment();
      } else {
        onPaymentReceived();
      }
    }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record payment');
      setIsUploading(false);
    }
  };

  const handleDownloadReceipt = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(filePath);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Download failed');
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

  const handleConfirmPayment = async () => {
    await (supabase as any).from('jobs').update({ status: 'active' }).eq('id', job.id);
    onPaymentReceived();
  };

  const totalAdditional = additionalCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const totalSubTasks = subTasks.reduce((sum, st) => sum + Number(st.ministry_fee), 0);
  const totalBilled = job.work_fee + job.ministry_fee + totalAdditional + totalSubTasks;
  const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
  const remainingBalance = totalBilled - totalPaid;

  const mode = localStorage.getItem('employee_mode') || 'sales';
  const isSalesMode = mode === 'sales';

  return (
    <div className="max-w-3xl mx-auto py-8">

      {/* Draft State Alert */}
      {job.status === 'draft' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-syne font-bold text-amber-500 text-lg">Awaiting Payment Confirmation</h3>
              <p className="text-amber-500/70 text-sm">This job is in a Draft/Pre-requisite state. Confirm payment to unlock subsequent steps.</p>
            </div>
          </div>
          <button
            onClick={handleConfirmPayment}
            className="px-6 py-3 bg-amber-500 text-amber-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
          >
            <CheckCircle2 size={18} /> Confirm Payment
          </button>
        </div>
      )}

      {/* Invoice Card */}
      <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8 border-b border-border pb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-syne font-bold text-foreground">Financial Ledger</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{job.job_code}</p>
          </div>
        </div>

        {/* Fixed Fees */}
        <div className="space-y-4 mb-8">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Fees</h4>
          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
            <span className="text-sm font-bold text-foreground">Service Fee</span>
            <span className="font-mono text-sm">{job.work_fee.toFixed(3)} OMR</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl">
            <span className="text-sm font-bold text-foreground">Ministry Fee (Fixed)</span>
            <span className="font-mono text-sm">{job.ministry_fee.toFixed(3)} OMR</span>
          </div>
        </div>

        {/* Additional Charges */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Additional Charges</h4>
            <button
              onClick={() => setIsAddingCharge(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} /> Add Charge
            </button>
          </div>

          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading charges...</div>
          ) : additionalCharges.length === 0 && subTasks.length === 0 && !isAddingCharge ? (
            <div className="text-center border border-dashed border-border rounded-xl p-6 text-muted-foreground text-xs">
              No additional charges or sub-task fees added.
            </div>
          ) : (
            <div className="space-y-2">
              {additionalCharges.map(charge => (
                <div key={charge.id} className="flex items-center justify-between p-4 border border-border rounded-xl group hover:border-primary/30 transition-colors">
                  <span className="text-sm font-medium text-foreground">{charge.description}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">{Number(charge.amount).toFixed(3)} OMR</span>
                    <button
                      onClick={() => handleDeleteCharge(charge.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Render Sub-Task Auto Fees */}
              {subTasks.map(st => (
                <div key={st.id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{st.name}</h4>
                    <p className="text-[9px] uppercase font-bold tracking-widest text-primary/80 mt-0.5">Sub-Task Fee</p>
                  </div>
                  <div className="flex items-center gap-4 pr-1">
                    <span className="font-mono text-sm text-primary">+{st.ministry_fee.toFixed(3)} OMR</span>
                  </div>
                </div>
              ))}

              {isAddingCharge && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 border border-primary/30 bg-primary/5 rounded-xl">
                  <input
                    type="text"
                    placeholder="Description (e.g. Resubmission Fee)"
                    value={newCharge.description}
                    onChange={e => setNewCharge({ ...newCharge, description: e.target.value })}
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.000"
                      value={newCharge.amount}
                      onChange={e => setNewCharge({ ...newCharge, amount: e.target.value })}
                      className="w-24 bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <button onClick={handleAddCharge} className="p-2 bg-primary text-primary-foreground rounded-lg hover:scale-105 transition-all">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => setIsAddingCharge(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* ── SALES MODE PAYMENT RECORDING SECTION ── */}
        {isSalesMode && (
          <div className="mt-8 border-t border-border pt-8 space-y-6">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Recording</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ADVANCE PAYMENT BLOCK */}
              <div className="bg-white/5 border border-border/80 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <h5 className="text-sm font-bold text-foreground">1. Advance Payment</h5>
                  {job.advance_paid ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Paid
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Pending
                    </span>
                  )}
                </div>

                {job.advance_paid ? (
                  <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
                    <p>Amount: <span className="font-bold text-foreground">{Number(job.advance_amount).toFixed(3)} OMR</span></p>
                    <p>Method: <span className="font-bold text-foreground capitalize">{job.advance_payment_method}</span></p>
                    {job.advance_reference && <p>Reference: <span className="font-mono text-foreground">{job.advance_reference}</span></p>}
                    <p>Received: <span className="font-bold text-foreground">{job.advance_paid_at ? new Date(job.advance_paid_at).toLocaleDateString() : 'N/A'}</span></p>
                  </div>
                ) : (
                  <AdvanceForm job={job} onSave={onPaymentReceived} />
                )}
              </div>

              {/* REMAINING PAYMENT BLOCK */}
              {job.advance_paid ? (
                <div className="bg-white/5 border border-border/80 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-4">
                    <h5 className="text-sm font-bold text-foreground">2. Final Payment</h5>
                    {job.remaining_paid ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                    )}
                  </div>

                  {job.remaining_paid ? (
                    <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
                      <p>Amount: <span className="font-bold text-foreground">{Number(job.remaining_amount).toFixed(3)} OMR</span></p>
                      <p>Method: <span className="font-bold text-foreground capitalize">{job.remaining_payment_method}</span></p>
                      {job.remaining_reference && <p>Reference: <span className="font-mono text-foreground">{job.remaining_reference}</span></p>}
                      <p>Received: <span className="font-bold text-foreground">{job.remaining_paid_at ? new Date(job.remaining_paid_at).toLocaleDateString() : 'N/A'}</span></p>
                    </div>
                  ) : (
                    <RemainingForm job={job} onSave={onPaymentReceived} />
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                  <AlertCircle size={20} className="text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground/60 italic">Final payment is locked until the advance payment is marked as verified.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Section */}
        <div className="mt-8 border-t border-border pt-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment History</h4>
            {!isAddingPayment && (
              <button 
                onClick={() => setIsAddingPayment(true)}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
              >
                <Plus size={14} /> Verify Payment
              </button>
            )}
          </div>

          <div className="space-y-2">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {payment.payment_method === 'cash' && <Banknote size={14} className="text-emerald-500" />}
                    {payment.payment_method === 'bank_transfer' && <Landmark size={14} className="text-blue-500" />}
                    {(payment.payment_method === 'pos' || payment.payment_method === 'online') && <CreditCard size={14} className="text-purple-500" />}
                    <span className="text-sm font-bold text-foreground capitalize">{payment.payment_method.replace('_', ' ')}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                    {payment.reference_number && (
                      <>
                        <span>•</span>
                        <span className="font-mono uppercase tracking-wider">Ref: {payment.reference_number}</span>
                      </>
                    )}
                    {payment.profiles?.full_name && (
                      <>
                        <span>•</span>
                        <span>By {payment.profiles.full_name}</span>
                      </>
                    )}
                  </div>
                  
                  {(() => {
                    if (!payment.notes) return null;
                    const receiptMatch = payment.notes.match(/\[RECEIPT:(.*?)\|(.*?)\]/);
                    if (receiptMatch) {
                      const filePath = receiptMatch[1];
                      const fileName = receiptMatch[2];
                      return (
                        <div className="mt-2 flex items-center gap-2">
                          <button 
                            onClick={() => handleViewReceipt(filePath)}
                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                          >
                            <Eye size={10} /> View
                          </button>
                          <button 
                            onClick={() => handleDownloadReceipt(filePath, fileName)}
                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                          >
                            <Download size={10} /> Download
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <span className="font-mono text-sm text-emerald-500 font-bold">+{Number(payment.amount).toFixed(3)} OMR</span>
              </div>
            ))}

            {payments.length === 0 && !isAddingPayment && (
              <div className="text-center border border-dashed border-border rounded-xl p-6 text-muted-foreground text-xs">
                No payments recorded yet.
              </div>
            )}

            <AnimatePresence>
              {isAddingPayment && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="p-5 border border-primary/30 bg-primary/5 rounded-xl space-y-4">
                    <h5 className="font-syne font-bold text-sm text-foreground flex items-center gap-2">
                      <DollarSign size={16} className="text-emerald-500" /> Record New Payment
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Amount (OMR)</label>
                        <input
                          type="number"
                          placeholder="0.000"
                          value={newPayment.amount}
                          onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Method</label>
                        <select
                          value={newPayment.method}
                          onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary text-foreground"
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="pos">POS / Card</option>
                          <option value="cash">Cash</option>
                          <option value="online">Online Payment</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Reference Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="Transaction ID or Receipt No."
                        value={newPayment.reference}
                        onChange={e => setNewPayment({ ...newPayment, reference: e.target.value })}
                        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Document / Proof (Optional)</label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-border hover:border-primary/50 bg-background hover:bg-primary/5 transition-all rounded-lg p-3 cursor-pointer group">
                          <Upload size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                            {receiptFile ? receiptFile.name : 'Upload Invoice or Receipt (PDF, Image)'}
                          </span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,.pdf"
                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          />
                        </label>
                        {receiptFile && (
                          <button 
                            onClick={() => setReceiptFile(null)}
                            className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button 
                        disabled={isUploading}
                        onClick={() => {
                          setIsAddingPayment(false);
                          setReceiptFile(null);
                        }} 
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button 
                        disabled={isUploading}
                        onClick={handleRecordPayment} 
                        className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isUploading ? <><span className="animate-spin text-lg leading-none">⟳</span> Uploading...</> : <><CheckCircle2 size={14} /> Verify Payment</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Total Summaries */}
        <div className="mt-8 bg-muted/20 border border-border rounded-[1.5rem] p-6 grid grid-cols-3 divide-x divide-border">
          <div className="px-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Billed</p>
            <p className="text-xl font-mono font-bold text-foreground">{totalBilled.toFixed(3)} <span className="text-xs text-muted-foreground ml-0.5">OMR</span></p>
          </div>
          <div className="px-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Paid</p>
            <p className="text-xl font-mono font-bold text-emerald-500">{totalPaid.toFixed(3)} <span className="text-xs text-emerald-500/50 ml-0.5">OMR</span></p>
          </div>
          <div className="px-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Amount Due</p>
            <p className={`text-2xl font-mono font-black ${remainingBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {remainingBalance.toFixed(3)} <span className="text-sm opacity-50 ml-0.5">OMR</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
