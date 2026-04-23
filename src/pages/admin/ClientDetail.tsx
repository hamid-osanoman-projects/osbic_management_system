import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Edit3, Key, Mail, Phone, Calendar, 
  Clock, CheckCircle, DollarSign,
  FileText, MessageSquare
} from 'lucide-react';
import { useAdminClient } from '../../hooks/admin/useAdminClients';
import ClientTimeline from '../../components/clients/ClientTimeline';
import CreateJobModal from '../../components/jobs/CreateJobModal';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading } = useAdminClient(id);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'documents' | 'payments' | 'messages'>('active');
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton height={200} rounded="xl" />
        <Skeleton height={400} rounded="xl" />
      </div>
    );
  }

  if (!client) return <div>Client not found</div>;

  const tabs = [
    { id: 'active', label: 'Active Jobs', icon: Clock, count: client.active_jobs },
    { id: 'completed', label: 'Service History', icon: CheckCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Navigation */}
      <div className="flex items-center gap-3">
        <Link to="/admin/clients" className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="text-sm">
          <Link to="/admin/clients" className="text-muted-foreground hover:text-foreground transition-colors">Clients</Link>
          <span className="text-muted-foreground/60 mx-2">/</span>
          <span className="text-foreground font-medium">{client.full_name}</span>
        </div>
      </div>

      {/* Top Profile Card */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        <div className="flex flex-col md:flex-row gap-8 relative z-10">
          {/* Avatar side */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="w-32 h-32 rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-4xl font-syne font-bold text-foreground overflow-hidden relative group">
              {client.avatar_url ? (
                <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{client.full_name?.[0] || 'C'}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                <Edit3 size={20} className="text-foreground" />
              </div>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
              client.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", client.is_active ? "bg-emerald-400" : "bg-red-400")} />
              {client.is_active ? 'Active' : 'Archived'}
            </div>
          </div>

          {/* Info side */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-3xl font-syne font-bold text-foreground max-w-md truncate" title={client.full_name}>{client.full_name}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-primary font-mono tracking-widest text-sm bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{client.client_code}</p>
                  <p className="text-xs text-muted-foreground">ID: {client.id_number || 'N/A'} ({client.nationality || 'OM'})</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={16} className="text-muted-foreground/60" /> {client.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone size={16} className="text-muted-foreground/60" /> {client.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16} className="text-muted-foreground/60" /> Joined {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <button 
                    onClick={() => setIsCreateJobOpen(true)}
                    className="p-2 sm:px-6 sm:py-2.5 rounded-xl bg-primary text-[#0A0F1E] font-bold hover:bg-accent/90 transition-all active:scale-95 flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  >
                    <DollarSign size={16} /> Start New Job
                  </button>
                  <button className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-muted/50 border border-border text-foreground font-medium hover:bg-muted transition-colors flex items-center gap-2 text-sm">
                    <Edit3 size={16} /> <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm">
                    <Key size={16} /> <span className="hidden sm:inline">Reset PW</span>
                  </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border">
               <div>
                 <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Active Workload</p>
                 <p className="text-2xl font-mono font-bold text-primary">{client.active_jobs}</p>
               </div>
               <div>
                 <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Lifetime Value (OMR)</p>
                 <p className="text-2xl font-mono font-bold text-foreground">{client.total_paid?.toLocaleString() || '0'}</p>
               </div>
               <div className="col-span-2">
                 <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-1">Lead Relationship Manager</p>
                 <div className="flex items-center gap-2 mt-1">
                   <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold font-syne">
                     {client.assigned_employee_name?.[0] || '?' }
                   </div>
                   {client.assigned_employee_id ? (
                     <Link to={`/admin/employees/${client.assigned_employee_id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                       {client.assigned_employee_name}
                     </Link>
                   ) : (
                     <span className="text-sm font-medium text-muted-foreground/60">No active employee assigned</span>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "border-accent text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === tab.id ? "bg-accent/20 text-primary" : "bg-white/10 text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Panes */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-xl min-h-[400px]"
      >
        {activeTab === 'active' && (
          <div>
            <h3 className="text-lg font-syne font-bold text-foreground mb-6">Current Operational Pipeline</h3>
            <div className="text-center py-20 text-muted-foreground/60 bg-black/20 rounded-[32px] border border-border border-dashed">
              <Clock size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">The live workflow grid will be rendered here.</p>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <div>
                <h3 className="text-xl font-syne font-bold text-foreground uppercase tracking-wider">Service Record Intelligence</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">Audit trail of all previous services performed by OSBIC</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <CheckCircle size={14} /> System Verified History
              </div>
            </div>
            
            <ClientTimeline clientId={id!} />
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <h3 className="text-lg font-syne font-bold text-foreground mb-6">Client Artifact Vault</h3>
            <div className="text-center py-20 text-muted-foreground/60 bg-black/20 rounded-[32px] border border-border border-dashed">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">Archived documents (Passports, Visas, CRs) are stored here.</p>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-syne font-bold text-foreground">Financial Statement Summary</h3>
              <button className="text-[10px] font-bold uppercase tracking-widest bg-muted/50 border border-border px-4 py-2 rounded-xl text-foreground hover:bg-white/10 transition-all">
                Export Ledger (CSV)
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-background border border-border rounded-2xl p-6">
                 <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-2">Gross Revenue</p>
                 <p className="text-2xl font-mono font-bold text-emerald-400">{client.total_paid?.toLocaleString() || '0'}.00 OMR</p>
               </div>
               <div className="bg-background border border-border rounded-2xl p-6">
                 <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2">Service Margin (Profit)</p>
                 <p className="text-2xl font-mono font-bold text-primary">{(client.total_paid - (client.total_ministry_spent || 0)).toLocaleString()}.00 OMR</p>
               </div>
               <div className="bg-background border border-border rounded-2xl p-6">
                 <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mb-2">Ministry Disbursement</p>
                 <p className="text-2xl font-mono font-bold text-foreground">{(client.total_ministry_spent || 0).toLocaleString()}.00 OMR</p>
               </div>
            </div>

            <div className="overflow-hidden border border-border rounded-2xl">
               <table className="w-full text-left text-sm">
                 <thead className="bg-white/5 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Job Code</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Total Fee</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Settlement</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                    {client.jobs?.map((job: any) => (
                      <tr key={job.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-primary">{job.job_code}</td>
                        <td className="px-6 py-4 text-foreground">{job.total_fee} OMR</td>
                        <td className="px-6 py-4">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                             job.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                           )}>
                             {job.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-foreground">
                           {(job.advance_paid ? job.advance_due_amount : 0) + (job.remaining_paid ? job.remaining_due_amount : 0)} OMR
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <h3 className="text-lg font-syne font-bold text-foreground mb-6">Internal Comms Audit</h3>
            <div className="text-center py-20 text-muted-foreground/60 bg-black/20 rounded-[32px] border border-border border-dashed">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">All client-employee communication history is logged for review.</p>
            </div>
          </div>
        )}
      </motion.div>

      <CreateJobModal 
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        preSelectedClientId={client.id}
      />
    </div>
  );
};

export default ClientDetail;
