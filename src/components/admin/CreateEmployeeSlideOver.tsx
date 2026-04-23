import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle, Eye, EyeOff, Copy, Mail } from 'lucide-react';
import { useCreateEmployee } from '../../hooks/admin/useAdminEmployees';
import { generateSecurePassword, generateUsername, copyToClipboard } from '../../lib/credentialUtils';
import PhotoCropper from '../shared/PhotoCropper';
import toast from 'react-hot-toast';


interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CreateEmployeeSlideOver = ({ isOpen, onClose }: Props) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    notes: '',
    services: [] as string[],
    avatarFile: null as File | null,
    previewUrl: '',
  });
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '', employeeCode: '' });
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: createEmployee, isPending } = useCreateEmployee();

  const handleNext = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    if (formData.services.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    const generatedPassword = generateSecurePassword();
    const username = generateUsername(formData.fullName);

    createEmployee({
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone ? `+968 ${formData.phone}` : undefined,
      password: generatedPassword,
      avatar_file: formData.avatarFile,
    }, {
      onSuccess: (data: any) => {
        setCredentials({
          username: username,
          password: generatedPassword,
          employeeCode: data?.employee_code ?? 'EMP-NEW',
        });
        setShowSuccess(true);
        toast.success('Employee created successfully!');
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Failed to create employee. Check if email already exists.');
      }
    });
  };


  const handleCopy = (text: string) => {
    copyToClipboard(text);
    toast.success('Copied to clipboard');
  };

  const resetForm = () => {
    setStep(1);
    setFormData({ fullName: '', email: '', phone: '', notes: '', services: [], avatarFile: null, previewUrl: '' });
    setShowSuccess(false);
    setShowPassword(false);
    onClose();
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
        <div key="employee-slideover">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-syne font-bold text-foreground">Create Employee</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!showSuccess ? (
                <div className="space-y-6">
                  {/* Step Indicator */}
                  <div className="flex items-center gap-2 mb-8">
                    <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-white/5'}`} />
                    <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-white/5'}`} />
                  </div>

                  {step === 1 && (
                    <div className="space-y-5">
                      <h3 className="text-lg font-syne font-bold text-foreground">Basic Information</h3>
                      
                      <div className="flex justify-center mb-6">
                        <label className="relative group cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setCroppingImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <div className={`w-28 h-28 rounded-full border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${formData.previewUrl ? 'border-primary' : 'border-white/20 hover:border-gold'}`}>
                            {formData.previewUrl ? (
                              <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <Upload size={24} className="group-hover:text-gold" />
                                <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-gold">Photo</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
                            placeholder="e.g. Ahmed Al Balushi"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email Address *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors"
                            placeholder="ahmed@osbic.om"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Phone Number *</label>
                          <div className="flex gap-2">
                            <div className="w-24 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground flex items-center justify-center pointer-events-none">
                              +968
                            </div>
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
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <h3 className="text-lg font-syne font-bold text-foreground">Access & Assignment</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-3">Assign Services (at least one)</label>
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

                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Notes (Internal)</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors min-h-[100px] resize-none"
                          placeholder="Any internal remarks..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                    <CheckCircle size={40} />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-syne font-bold text-foreground mb-2">Employee Created</h3>
                    <p className="text-muted-foreground whitespace-pre-line">
                      Successfully created account for <span className="text-foreground font-bold">{formData.fullName}</span>
                      <br />
                      <span className="font-mono text-primary text-lg mt-2 inline-block">{credentials.employeeCode}</span>
                    </p>
                  </div>

                  <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-left">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Important</p>
                    <p className="text-sm text-red-200">Save this password now. It will not be shown again.</p>
                  </div>

                  <div className="w-full space-y-3">
                    <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest text-left">Username</p>
                        <p className="text-foreground font-mono">{credentials.username}</p>
                      </div>
                      <button onClick={() => handleCopy(credentials.username)} className="p-2 hover:text-primary text-muted-foreground transition-colors"><Copy size={16} /></button>
                    </div>

                    <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest text-left">Password</p>
                        <p className="text-foreground font-mono">{showPassword ? credentials.password : '••••••••••••••••'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowPassword(!showPassword)} className="p-2 hover:text-primary text-muted-foreground transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => handleCopy(credentials.password)} className="p-2 hover:text-primary text-muted-foreground transition-colors"><Copy size={16} /></button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <Mail size={16} /> Welcome email sent to {formData.email}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex gap-3">
              {!showSuccess ? (
                <>
                  {step === 2 && (
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-3 rounded-xl border border-border text-foreground font-bold hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                  )}
                  {step === 1 ? (
                    <button
                      onClick={handleNext}
                      className="flex-1 bg-white text-[#0A0F1E] font-bold rounded-xl py-3 hover:bg-white/90 transition-colors"
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isPending}
                      className="flex-1 bg-primary text-[#0A0F1E] font-bold rounded-xl py-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Creating...' : 'Create Employee'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={resetForm}
                  className="w-full bg-white text-[#0A0F1E] font-bold rounded-xl py-3 hover:bg-white/90 transition-colors"
                >
                  Done
                </button>
              )}
            </div>

          </motion.div>
        </div>
      )}

      {croppingImage && (
        <PhotoCropper
          key="photo-cropper"
          image={croppingImage}
          onCancel={() => setCroppingImage(null)}
          onCropComplete={(blob, previewUrl) => {
            setFormData({
              ...formData,
              avatarFile: new File([blob], 'avatar.jpg', { type: 'image/jpeg' }),
              previewUrl,
            });
            setCroppingImage(null);
          }}
        />
      )}
    </AnimatePresence>
  );
};

export default CreateEmployeeSlideOver;
