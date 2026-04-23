import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, User, 
  Trash2, History, Archive,
  Filter, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployeeClients } from '../../hooks/admin/useAdminClients';
import { useAuth } from '../../contexts/AuthContext';
import ClientActionRequestModal from '../../components/clients/ClientActionRequestModal';
import CreateClientSlideOver from '../../components/shared/clients/CreateClientSlideOver';
import CreateJobModal from '../../components/jobs/CreateJobModal';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ClientsHub = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: clients, isLoading } = useEmployeeClients(profile?.id);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [requestModal, setRequestModal] = useState<{
    isOpen: boolean;
    mode: 'DELETE' | 'ARCHIVE';
    client: { id: string; full_name: string } | null;
  }>({
    isOpen: false,
    mode: 'ARCHIVE',
    client: null
  });

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{id: string, full_name: string} | null>(null);

  const filteredClients = clients?.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleActionRequest = (client: any, mode: 'DELETE' | 'ARCHIVE') => {
    setRequestModal({
      isOpen: true,
      mode,
      client
    });
  };

  const handleLaunchJob = (client: any) => {
    setSelectedClient(client);
    setIsCreateJobOpen(true);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground">Client Management Hub</h1>
          <p className="text-sm text-[#475569] uppercase font-bold tracking-[0.2em] mt-1">Client Lifetime Value & Operations</p>
        </div>
        <button 
          onClick={() => setIsRegisterOpen(true)}
          className="px-6 py-3 bg-primary text-[#0A0F1E] font-bold rounded-2xl flex items-center gap-2 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all active:scale-95"
        >
          <Plus size={20} /> Register New Client
        </button>
      </div>

      <CreateClientSlideOver 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
      />

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-3xl shadow-2xl p-2 flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569]" />
          <input 
            type="text" 
            placeholder="Search by Name, CR, or Phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0F1E]/50 border-none outline-none pl-12 pr-4 py-4 text-foreground placeholder:text-[#475569] text-base rounded-2xl"
          />
        </div>
        <div className="flex items-center gap-2 px-2 overflow-x-auto no-scrollbar w-full lg:w-auto">
           <div className="h-10 w-[1px] bg-white/10 mx-2 hidden lg:block" />
           <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">
             <Filter size={14} /> My Registrations
           </button>
        </div>
      </div>

      {/* Client Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} height={200} rounded="xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredClients?.map((client, idx) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border rounded-[32px] p-6 hover:border-primary/50 transition-all shadow-xl hover:shadow-gold/5 group relative"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-background border border-border rounded-2xl flex items-center justify-center overflow-hidden w-14 h-14">
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-[#475569]" size={28} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-foreground truncate font-syne">{client.full_name}</h3>
                      <p className="text-[10px] text-[#475569] font-mono tracking-widest uppercase">{client.client_code || 'No Code'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                     <button 
                       onClick={() => navigate(`/employee/clients/${client.id}/history`)}
                       className="p-2 rounded-xl bg-white/5 text-[#475569] hover:text-primary hover:bg-primary/10 transition-all"
                       title="View History"
                     >
                       <History size={18} />
                     </button>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Phone</span>
                    <span className="text-foreground font-mono">{client.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Total Jobs</span>
                    <span className="text-foreground font-mono">{client.active_jobs || 0} Active</span>
                  </div>
                </div>

                 <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => handleLaunchJob(client)}
                      className="py-3 rounded-2xl bg-primary/10 hover:bg-primary text-primary hover:text-[#0A0F1E] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-gold/20"
                    >
                      New Job <ChevronRight size={14} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleActionRequest(client, 'ARCHIVE')}
                        className="text-muted-foreground/60 transition-all border border-border flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-amber-500/20 hover:text-amber-400"
                      >
                        Deactivate <Archive size={12} />
                      </button>
                      <button 
                        onClick={() => handleActionRequest(client, 'DELETE')}
                        className="text-muted-foreground/60 transition-all border border-border flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400"
                      >
                        Delete <Trash2 size={12} />
                      </button>
                    </div>
                 </div>

                 <div className={cn(
                   "absolute top-4 right-4 h-2 w-2 rounded-full shadow-lg",
                   client.is_active ? "bg-emerald-400 shadow-emerald-500/50" : "bg-red-400 shadow-red-500/50"
                 )} title={client.is_active ? "Active Client" : "Archived Client"} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
       <ClientActionRequestModal 
         isOpen={requestModal.isOpen}
         onClose={() => setRequestModal({ ...requestModal, isOpen: false })}
         client={requestModal.client}
         mode={requestModal.mode}
       />

      <CreateJobModal 
        isOpen={isCreateJobOpen}
        onClose={() => {
          setIsCreateJobOpen(false);
          setSelectedClient(null);
        }}
        preSelectedClientId={selectedClient?.id}
      />
    </div>
  );
};

export default ClientsHub;
