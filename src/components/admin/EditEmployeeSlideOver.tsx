import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { useUpdateEmployee } from '../../hooks/admin/useAdminEmployees';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

const EditEmployeeSlideOver = ({ isOpen, onClose, employee }: Props) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    notes: '',
    services: [] as string[],
  });

  const { mutate: updateEmployee, isPending } = useUpdateEmployee();

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone ? employee.phone.replace('+968 ', '') : '',
        notes: employee.notes || '',
        services: employee.assigned_services || [],
      });
    }
  }, [employee]);

  const handleSubmit = () => {
    if (!formData.fullName || !formData.email) {
      toast.error('Name and Email are required');
      return;
    }

    updateEmployee({
      id: employee.id,
      updates: {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone ? `+968 ${formData.phone}` : null,
        // Assuming profiles table has a notes field or it's handled via metadata
        // assigned_services: formData.services,
      } as any
    }, {
      onSuccess: () => {
        toast.success('Profile updated successfully!');
        onClose();
      },
      onError: (err: any) => {
        toast.error(err.message || 'Update failed');
      }
    });
  };

  const availableServices = [
    { id: '1', name: 'CR Registration', category: 'Ministry of Commerce' },
    { id: '2', name: 'Visas', category: 'ROP' },
    { id: '3', name: 'Labor Cards', category: 'Ministry of Labor' },
    { id: '4', name: 'Chamber of Commerce', category: 'Ministry of Commerce' },
    { id: '5', name: 'General Services', category: 'Other' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-syne font-bold text-foreground">Edit Profile</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="w-24 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground flex items-center justify-center pointer-events-none">+968</div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
                        placeholder="9123 4567"
                      />
                    </div>
                  </div>
               </div>

               <div>
                <label className="block text-sm font-medium text-muted-foreground mb-3">Assign Services</label>
                <div className="space-y-2">
                  {availableServices.map((service) => {
                    const isSelected = formData.services.includes(service.name);
                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          if (isSelected) {
                            setFormData({ ...formData, services: formData.services.filter(s => s !== service.name) });
                          } else {
                            setFormData({ ...formData, services: [...formData.services, service.name] });
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-gold/50' : 'bg-white/5 border-border hover:border-white/20'}`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{service.name}</p>
                          <p className="text-[10px] text-muted-foreground/60">{service.category}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-gold text-[#0A0F1E]' : 'border-white/20'}`}>
                          {isSelected && <CheckCircle size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3">
              <button 
                onClick={onClose} 
                className="px-6 py-3 rounded-xl border border-border text-foreground font-bold hover:bg-white/5 transition-colors"
                disabled={isPending}
              >Cancel</button>
              <button 
                onClick={handleSubmit} 
                className="flex-1 bg-primary text-[#0A0F1E] font-bold rounded-xl py-3 hover:bg-primary/90 transition-colors shadow-lg shadow-gold/20"
                disabled={isPending}
              >{isPending ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditEmployeeSlideOver;
