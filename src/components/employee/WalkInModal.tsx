import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useAdminServices } from "../../hooks/admin/useAdminServices";
import { X, Zap, User, Phone, Search, Shield, Users } from "lucide-react";
import toast from "react-hot-toast";

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
}

export const WalkInModal = ({ isOpen, onClose, onJobCreated }: WalkInModalProps) => {
  const { profile } = useAuth();
  const { data: services } = useAdminServices();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [workFee, setWorkFee] = useState(0);
  const [ministryFee, setMinistryFee] = useState(0);
  const [notes, setNotes] = useState("");

  // POS / Simple Task States
  const [posDescription, setPosDescription] = useState("");
  const [posAmount, setPosAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    if (selectedService && !selectedService.isPosPlaceholder) {
      setWorkFee(selectedService.work_fee || 0);
      setMinistryFee(selectedService.ministry_fee || 0);
    }
  }, [selectedService]);

  const handleSubmit = async () => {
    if (!clientName.trim() || !selectedService) {
      toast.error("Client name and service are required");
      return;
    }
    setIsSubmitting(true);

    try {
      if (selectedService.isPosPlaceholder) {
        // POS / Simple Task Flow
        if (!posDescription.trim() || !posAmount) {
          toast.error("Description and amount are required for simple task");
          setIsSubmitting(false);
          return;
        }

        const { error: rpcErr } = await (supabase.rpc as any)('create_quick_task', {
          p_employee_id: profile?.id,
          p_task_description: posDescription.trim(),
          p_amount: parseFloat(posAmount),
          p_payment_method: paymentMethod,
          p_customer_name: clientName.trim(),
          p_customer_phone: clientPhone.trim() || null,
          p_status: "completed"
        });

        if (rpcErr) throw rpcErr;
        toast.success(`Quick Task completed for ${clientName}!`);
      } else {
        // Catalog Service Flow
        // 1. Create a walk-in client profile
        const { data: client, error: cErr } = await (supabase.from("profiles").insert({
          full_name: clientName.trim(),
          phone: clientPhone.trim() || null,
          role: "client",
          entry_type: "walkin",
        } as any).select().single() as any);
        if (cErr) throw cErr;

        const totalFee = (workFee + ministryFee) * quantity;

        // 2. Create the job record
        const { data: job, error: jErr } = await (supabase.from("jobs").insert({
          job_code: `WI-${Math.floor(Math.random() * 100000)}`,
          client_id: client.id,
          employee_id: profile?.id,
          assigned_by: profile?.id,
          service_id: selectedService.id,
          status: "active",
          total_fee: totalFee,
          work_fee: workFee * quantity,
          ministry_fee: ministryFee * quantity,
          ministry_fee_type: "fixed",
          advance_percentage: 0,
          advance_amount: 0,
          remaining_amount: totalFee,
          advance_paid: false,
          remaining_paid: false,
          entry_type: "walkin",
          sales_employee_id: profile?.id,
          ops_employee_id: profile?.id,
        } as any).select().single() as any);
        if (jErr) throw jErr;

        // 3. Create job_services rows — one per applicant
        const rows = Array.from({ length: quantity }, (_: any, i: number) => ({
          job_id: job.id,
          service_id: selectedService.id,
          service_name: selectedService.name_en,
          display_order: i + 1,
          quantity,
          item_number: i + 1,
          status: "pending",
          work_fee: workFee,
          ministry_fee: ministryFee,
          total_fee: workFee + ministryFee,
          ops_employee_id: profile?.id,
          assigned_by: profile?.id,
          assigned_at: new Date().toISOString(),
          notes: notes || null,
        }));

        const { error: sErr } = await (supabase.from("job_services").insert(rows as any) as any);
        if (sErr) throw sErr;

        toast.success(`Walk-in job created for ${clientName}!`);
      }

      // Reset states
      setClientName("");
      setClientPhone("");
      setPosDescription("");
      setPosAmount("");
      setSelectedService(null);
      setNotes("");
      setQuantity(1);
      onJobCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit walk-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const posServiceOption = {
    id: "pos_task_simple",
    name_en: "Simple Task / Typing / Printing (POS)",
    name_ar: "مهمة سريعة / طباعة / تخليص فوري",
    work_fee: 0,
    ministry_fee: 0,
    requires_pro: false,
    isPosPlaceholder: true
  };

  const filteredServices = [
    posServiceOption,
    ...(services?.filter(
      (s) =>
        s.is_active &&
        (s.name_en.toLowerCase().includes(serviceSearch.toLowerCase()) ||
          s.name_ar.includes(serviceSearch))
    ) || [])
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#1a2130] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10"
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center text-gold">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="font-syne font-bold text-white text-lg">Walk-in Entry</h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Quick counter registration</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Client Info */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Client Info</p>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl pl-9 pr-3 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl pl-9 pr-3 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Service *</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services..."
                    className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl pl-9 pr-3 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {filteredServices?.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                        selectedService?.id === s.id
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-white/10 bg-black/20 text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="line-clamp-2 leading-tight">{s.name_en}</span>
                        {s.requires_pro && <Shield size={10} className="text-amber-400 shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedService && selectedService.isPosPlaceholder && (
                <>
                  {/* Task Description */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Task Description *</label>
                    <textarea
                      value={posDescription}
                      onChange={(e) => setPosDescription(e.target.value)}
                      rows={2}
                      placeholder="e.g. Translation and Xerox copying of 5 passports..."
                      className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none placeholder:text-white/20"
                    />
                  </div>

                  {/* Amount and Payment Method */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Amount (OMR) *</label>
                      <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 focus-within:border-gold rounded-xl px-3 py-2.5 transition-colors">
                        <span className="text-white/30 text-[10px] font-bold">OMR</span>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={posAmount}
                          onChange={(e) => setPosAmount(e.target.value)}
                          className="w-full bg-transparent outline-none text-sm text-white font-bold text-right"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl px-3 py-2.5 text-sm text-white font-bold outline-none cursor-pointer transition-colors"
                      >
                        <option value="cash" className="bg-[#1a2130]">Cash</option>
                        <option value="card" className="bg-[#1a2130]">Card</option>
                        <option value="bank" className="bg-[#1a2130]">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selectedService && !selectedService.isPosPlaceholder && (
                <>
                  {/* Quantity */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={11} /> Applicants / Quantity
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-lg transition-colors"
                      >−</button>
                      <span className="text-2xl font-bold text-white font-syne w-8 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-lg transition-colors"
                      >+</button>
                    </div>
                  </div>

                  {/* Fees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Work Fee / item</label>
                      <div className="flex items-center gap-1 bg-black/30 border border-white/10 focus-within:border-gold rounded-xl px-3 py-2 transition-colors">
                        <span className="text-white/30 text-[10px] font-bold">OMR</span>
                        <input
                          type="number"
                          step="0.001"
                          value={workFee}
                          onChange={(e) => setWorkFee(Number(e.target.value))}
                          className="flex-1 bg-transparent outline-none text-sm text-white font-bold text-right"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Ministry Fee / item</label>
                      <div className="flex items-center gap-1 bg-black/30 border border-white/10 focus-within:border-gold rounded-xl px-3 py-2 transition-colors">
                        <span className="text-white/30 text-[10px] font-bold">OMR</span>
                        <input
                          type="number"
                          step="0.001"
                          value={ministryFee}
                          onChange={(e) => setMinistryFee(Number(e.target.value))}
                          className="flex-1 bg-transparent outline-none text-sm text-white font-bold text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-gold/5 border border-gold/20 rounded-2xl px-5 py-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Total Amount</span>
                    <span className="text-2xl font-bold text-gold font-syne">
                      {((workFee + ministryFee) * quantity).toFixed(3)} <span className="text-sm text-white/40">OMR</span>
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Any special instructions or applicant details..."
                      className="w-full bg-black/30 border border-white/10 focus:border-gold rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none placeholder:text-white/20"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !clientName.trim() || !selectedService}
                className="flex-1 py-3 bg-gold hover:bg-yellow-400 text-black font-bold rounded-xl transition-all text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : selectedService?.isPosPlaceholder ? (
                  <>
                    <Zap size={16} /> Complete Walk-in Task
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Create Job
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalkInModal;
