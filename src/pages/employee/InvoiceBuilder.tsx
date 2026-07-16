import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, Plus, Trash2, FileText, Printer, CheckCircle2, Edit } from 'lucide-react';
import { useInvoice, useSaveInvoice, useUpdateInvoiceStatus, useNextInvoiceNumber, type Invoice, type InvoiceItem } from '../../hooks/employee/useInvoices';
import { useAdminClients } from '../../hooks/admin/useAdminClients';
import { useAdminJobs } from '../../hooks/shared/useJobs';
import { InvoiceDocument } from '../../components/employee/InvoiceDocument';
import { QuotationDocument } from '../../components/employee/QuotationDocument';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';

const InvoiceBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view') === 'true';
  const isNew = id === 'new';

  const { data: initialData, isLoading: isLoadingInvoice } = useInvoice(id);
  const { mutateAsync: saveInvoice, isPending: isSaving } = useSaveInvoice();
  const { mutateAsync: updateStatus } = useUpdateInvoiceStatus();
  
  const { data: clients } = useAdminClients();
  const { data: jobs } = useAdminJobs();
  const { data: nextInvoiceNumber } = useNextInvoiceNumber();

  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Invoice>({
    client_id: '',
    job_id: '',
    type: 'invoice',
    status: 'draft',
    subtotal: 0,
    tax_percentage: 5,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    notes: 'Thank you for your business.',
    terms: 'Payment is due within 15 days.',
    items: []
  });

  useEffect(() => {
    if (initialData && !isNew) {
      setFormData(initialData);
    }
  }, [initialData, isNew]);

  // Handle URL Params for Auto-Drafting from a Job
  useEffect(() => {
    if (isNew) {
      const params = new URLSearchParams(window.location.search);
      const autofillJobId = params.get('job_id');
      const autofillClientId = params.get('client_id');
      const baseFee = params.get('base_fee');
      const minFee = params.get('min_fee');

      if (autofillJobId && autofillClientId) {
        const autoItems: InvoiceItem[] = [];
        if (baseFee && parseFloat(baseFee) > 0) {
          autoItems.push({ description: 'Professional Services / Work Fee', quantity: 1, unit_price: parseFloat(baseFee), total: parseFloat(baseFee) });
        }
        if (minFee && parseFloat(minFee) > 0) {
          autoItems.push({ description: 'Government / Ministry Fee', quantity: 1, unit_price: parseFloat(minFee), total: parseFloat(minFee) });
        }

        setFormData(prev => ({
          ...prev,
          client_id: autofillClientId,
          job_id: autofillJobId,
          items: autoItems.length > 0 ? autoItems : [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
        }));
      } else if (formData.items?.length === 0) {
        setFormData(prev => ({ ...prev, items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] }));
      }
    }
  }, [isNew]);

  // Recalculate totals whenever items, tax, or discount changes
  useEffect(() => {
    if (!formData.items) return;
    
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax_amount = (subtotal - formData.discount_amount) * (formData.tax_percentage / 100);
    const total_amount = subtotal - formData.discount_amount + tax_amount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount,
      total_amount
    }));
  }, [formData.items, formData.tax_percentage, formData.discount_amount]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { description: '', quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async () => {
    if (!formData.client_id) {
      return toast.error('Please select a client');
    }
    if (!formData.items || formData.items.length === 0 || formData.items.some(i => !i.description)) {
      return toast.error('Please complete all item descriptions');
    }

    try {
      const savedId = await saveInvoice(formData);
      toast.success('Invoice saved successfully');
      if (isNew) {
        navigate(`/employee/invoices/${savedId}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save invoice');
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: formData.invoice_number || (formData.type === 'quotation' ? 'Quotation' : 'Invoice'),
  });

  const togglePaid = async () => {
    if (isNew) return toast.error('Please save the invoice first');
    
    const newStatus = formData.status === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateStatus({ id: id!, status: newStatus });
      setFormData(prev => ({ ...prev, status: newStatus }));
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (isLoadingInvoice) return <div className="p-8 text-center text-muted-foreground">Loading invoice data...</div>;

  const activeClients = clients || [];
  const clientJobs = jobs?.filter(j => j.client_id === formData.client_id) || [];

  return (
    <div className="max-w-7xl mx-auto pb-24 print:p-0 print:m-0">
      
      {/* HEADER (Hidden in Print) */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employee/invoices')} 
            className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              {formData.invoice_number || 'DRAFT'}
            </p>
            <h1 className="text-2xl font-syne font-bold text-foreground tracking-tight flex items-center gap-3">
              {isNew ? 'Create Document' : viewMode ? 'View Document' : 'Edit Document'}
              {!isNew && formData.status === 'paid' && (
                <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} /> Paid
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={handlePrint}
             className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold hover:bg-muted transition-colors text-foreground"
           >
             <Printer size={16} /> Print / PDF
           </button>
           
           {viewMode ? (
             <button 
               onClick={() => navigate(`/employee/invoices/${id}`)}
               className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
             >
               <Edit size={16} /> Edit Document
             </button>
           ) : (
             <>
               {!isNew && formData.type === 'invoice' && (
                 <button 
                   onClick={togglePaid}
                   className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-colors ${
                     formData.status === 'paid' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                   }`}
                 >
                   <CheckCircle2 size={16} /> {formData.status === 'paid' ? 'Mark as Unpaid' : 'Mark as PAID'}
                 </button>
               )}
               
               <button 
                 onClick={handleSave}
                 disabled={isSaving}
                 className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
               >
                 <Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}
               </button>
             </>
           )}
        </div>
      </div>

      <div className={`flex flex-col ${viewMode ? 'items-center' : 'lg:flex-row'} gap-8 print:block`}>
        
        {/* LEFT: FORM BUILDER (Hidden in Print and View Mode) */}
        {!viewMode && (
          <div className="w-full lg:w-[45%] space-y-6 print:hidden">
          
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
             <div className="grid grid-cols-2 gap-4 border-b border-border pb-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Document Type</label>
                 <select 
                   value={formData.type}
                   onChange={e => setFormData({...formData, type: e.target.value as any})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 >
                   <option value="invoice">Tax Invoice</option>
                   <option value="quotation">Quotation</option>
                 </select>
               </div>
               
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Client *</label>
                 <select 
                   value={formData.client_id}
                   onChange={e => setFormData({...formData, client_id: e.target.value, job_id: ''})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 >
                   <option value="">Select a client...</option>
                   {activeClients.map(c => (
                     <option key={c.id} value={c.id}>{c.full_name}</option>
                   ))}
                 </select>
               </div>

               <div className="space-y-2 col-span-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Link to Job (Optional)</label>
                 <select 
                   value={formData.job_id || ''}
                   onChange={e => setFormData({...formData, job_id: e.target.value})}
                   disabled={!formData.client_id}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all disabled:opacity-50"
                 >
                   <option value="">No specific job linked</option>
                   {clientJobs.map(j => (
                     <option key={j.id} value={j.id}>{j.job_code} - {j.service_name}</option>
                   ))}
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custom Invoice No.</label>
                 <input 
                   type="text" 
                   placeholder={nextInvoiceNumber || "Auto-generated"}
                   value={formData.invoice_number || ''}
                   onChange={e => setFormData({...formData, invoice_number: e.target.value})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-muted-foreground/40"
                 />
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Issue Date</label>
                 <input 
                   type="date" 
                   value={formData.issue_date ? formData.issue_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                   onChange={e => setFormData({...formData, issue_date: e.target.value})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 />
               </div>

               <div className="space-y-2 col-span-2 md:col-span-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reference Name (Description)</label>
                 <input 
                   type="text" 
                   placeholder="e.g. REF BY MAATHIR"
                   value={formData.notes || ''}
                   onChange={e => setFormData({...formData, notes: e.target.value})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 />
               </div>

               <div className="space-y-2 col-span-2 md:col-span-1">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Mode</label>
                 <select 
                   value={formData.terms || 'Credit'}
                   onChange={e => setFormData({...formData, terms: e.target.value})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 >
                   <option value="Credit">Credit</option>
                   <option value="Cash">Cash</option>
                   <option value="Bank Transfer">Bank Transfer</option>
                   <option value="Card">Card / POS</option>
                 </select>
               </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Line Items</label>
                  <button onClick={addItem} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"><Plus size={12}/> ADD ITEM</button>
                </div>
                
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                  {formData.items?.map((item, idx) => (
                    <motion.div layout key={idx} className="bg-muted/10 border border-border rounded-xl p-4 relative group">
                      <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-muted-foreground/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Description..." 
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-transparent border-b border-border/50 pb-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
                        />
                        <div className="grid grid-cols-3 gap-3">
                           <div>
                             <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Qty</label>
                             <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none" />
                           </div>
                           <div>
                             <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Unit Price</label>
                             <input type="number" min="0" step="0.001" value={item.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none" />
                           </div>
                           <div>
                             <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1 text-right">Total</label>
                             <div className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground font-bold text-right">
                               {item.total.toFixed(3)}
                             </div>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Discount Amount (OMR)</label>
                 <input 
                   type="number" 
                   min="0"
                   step="0.001"
                   value={formData.discount_amount}
                   onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tax Percentage (%)</label>
                 <input 
                   type="number" 
                   min="0"
                   max="100"
                   value={formData.tax_percentage}
                   onChange={e => setFormData({...formData, tax_percentage: parseFloat(e.target.value) || 0})}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                 />
               </div>
             </div>

             {formData.type === 'quotation' && (
                <div className="space-y-4 border-t border-border pt-6">
                   <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText size={16}/> Quotation Details</h3>
                   
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Documents Required (One per line)</label>
                     <textarea 
                       rows={4}
                       placeholder="Selfie with Passport&#10;Passport Size Photo"
                       value={typeof formData.metadata?.documents === 'string' ? formData.metadata.documents : (formData.metadata?.documents?.join('\n') || '')}
                       onChange={e => setFormData({...formData, metadata: { ...formData.metadata, documents: e.target.value }})}
                       className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Timeline (Format: Task:Days - One per line)</label>
                     <textarea 
                       rows={4}
                       placeholder="CR Certificate:0-1 Working Days&#10;Activity License:0-1 Working Days"
                       value={typeof formData.metadata?.timeline === 'string' ? formData.metadata.timeline : (formData.metadata?.timeline?.map((t: any) => `${t.task}:${t.days}`).join('\n') || '')}
                       onChange={e => setFormData({...formData, metadata: { ...formData.metadata, timeline: e.target.value }})}
                       className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-all"
                     />
                   </div>
                </div>
             )}

          </div>
        </div>
        )}

        {/* RIGHT: DOCUMENT PREVIEW (Visible in Print) */}
        <div className={viewMode ? "w-full max-w-[210mm] mx-auto print:w-full print:block print:static" : "w-full lg:w-[55%] print:w-full print:block print:static"}>
           <div className="sticky top-8 rounded-2xl overflow-hidden border border-border shadow-2xl print:shadow-none print:border-none print:overflow-visible print:static">
              <style>{`
                @media print {
                  @page { margin: 0; size: A4 portrait; }
                  html, body {
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                    background: white;
                  }
                  .print-section {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}</style>
              <div className="print-section" ref={printRef}>
                {formData.type === 'quotation' ? (
                  <QuotationDocument 
                    invoice={{
                      ...formData,
                      client: clients?.find(c => c.id === formData.client_id),
                      job: jobs?.find(j => j.id === formData.job_id)
                    }} 
                  />
                ) : (
                  <InvoiceDocument 
                    invoice={{
                      ...formData,
                      client: clients?.find(c => c.id === formData.client_id),
                      job: jobs?.find(j => j.id === formData.job_id)
                    }} 
                  />
                )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default InvoiceBuilder;
