import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, 
  Phone, Globe, Zap, 
  ShieldCheck, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAdminClient } from '../../hooks/admin/useAdminClients';
import { useClientHistory } from '../../hooks/shared/useClientHistory';
import ClientTimeline from '../../components/clients/ClientTimeline';
import Skeleton from '../../components/ui/Skeleton';

const ClientHistoryView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: client, isLoading: clientLoading } = useAdminClient(id);
  const { data: jobs, isLoading: jobsLoading } = useClientHistory(id);

  if (clientLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton height={100} rounded="32px" />
        <Skeleton height={400} rounded="32px" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <User size={48} className="text-[#475569] mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-foreground mb-2">Client Not Found</h2>
        <button onClick={() => navigate('/employee/clients')} className="text-primary text-sm font-bold uppercase tracking-widest hover:underline">Back to Directory</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Back Button & Header */}
      <div className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/employee/clients')}
          className="w-12 h-12 rounded-full bg-[#0F1629] border border-white/10 flex items-center justify-center text-[#475569] hover:text-foreground hover:border-white/20 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-syne font-bold text-foreground">Client Service Timeline</h1>
          <p className="text-muted-foreground/60 transition-colors uppercase tracking-[0.2em] font-bold text-xs mt-1">Full operational record for {client.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Client Profile Summary */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-[32px] p-8 shadow-xl"
          >
            <div className="flex flex-col items-center text-center mb-8">
               <div className="bg-background border border-border rounded-3xl flex items-center justify-center mb-4 overflow-hidden w-24 h-24">
                 {client.avatar_url ? (
                   <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                 ) : (
                   <User className="text-[#475569]" size={40} />
                 )}
               </div>
               <h3 className="text-xl font-bold text-foreground font-syne">{client.full_name}</h3>
               <p className="text-xs text-primary font-mono uppercase tracking-[0.2em] mt-1">{client.client_code}</p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Email</p>
                    <p className="text-sm text-foreground truncate">{client.email}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 rounded-xl bg-accent/10 text-accent">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Phone</p>
                    <p className="text-sm text-foreground">{client.phone || 'N/A'}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#475569] font-bold uppercase tracking-widest">Member Since</p>
                    <p className="text-sm text-foreground font-mono">{new Date(client.created_at).toLocaleDateString()}</p>
                  </div>
               </div>
            </div>

            <button 
              onClick={() => navigate('/employee/my-jobs', { state: { preSelectedClientId: client.id } })}
              className="w-full mt-8 py-4 bg-primary text-[#0A0F1E] font-bold rounded-2xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all active:scale-95"
            >
              <Zap size={18} /> Launch New Job
            </button>
          </motion.div>
        </div>

        {/* Right Col: Timeline */}
        <div className="lg:col-span-8">
           <div className="bg-card border border-border rounded-[32px] p-8 shadow-xl min-h-[500px]">
              <div className="flex items-center justify-between mb-10">
                 <h4 className="text-lg font-bold text-foreground font-syne uppercase tracking-wider">Historical Services</h4>
                 <div className="text-muted-foreground/60 transition-all border border-border flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                   Total: {jobs?.length || 0} Records
                 </div>
              </div>

              <ClientTimeline jobs={jobs || []} isLoading={jobsLoading} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHistoryView;
