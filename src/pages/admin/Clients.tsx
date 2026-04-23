import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Check, X as XIcon, 
  Eye, Edit3, UserPlus, Archive, Trash2
} from 'lucide-react';
import { useAdminClients } from '../../hooks/admin/useAdminClients';
import CreateClientSlideOver from '../../components/shared/clients/CreateClientSlideOver';
import Skeleton from '../../components/ui/Skeleton';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

const Clients = () => {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useAdminClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const filteredClients = clients?.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-syne font-bold text-foreground">Client Portal Registry</h1>
          <p className="text-sm text-muted-foreground">Manage multi-portal client accounts and business profiles</p>
        </div>
        <button 
          onClick={() => setIsRegisterOpen(true)}
          className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
        >
          <UserPlus size={18} /> Register Client
        </button>
      </div>

      <CreateClientSlideOver 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-2 rounded-2xl shadow-sm">
        <div className="flex-1 w-full sm:w-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by name, code, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-2 text-foreground placeholder:text-muted-foreground/50 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pr-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border flex items-center gap-2 whitespace-nowrap">
            <Filter size={16} /> <span className="text-sm font-medium">Assigned</span>
          </button>
          <button className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium">Service Type</span>
          </button>
          <button className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium">Job Status</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
           <Skeleton height={400} rounded="xl" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Client</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Contact / Nat.</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Workload</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Role</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</th>
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients?.map((client) => (
                  <tr key={client.id} className="border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground font-bold overflow-hidden">
                           {client.avatar_url ? <img src={client.avatar_url} alt="" /> : client.full_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{client.full_name}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-mono">{client.client_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-xs text-foreground">{client.email}</p>
                      <p className="text-[10px] text-muted-foreground/60 flex gap-2">
                        <span>{client.phone}</span>
                        <span>•</span>
                        <span>{client.nationality || 'OM'}</span>
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div onClick={(e) => { e.stopPropagation(); navigate(`/admin/jobs?client=${client.id}`); }} className="hover:scale-105 transition-transform cursor-pointer">
                           <p className="text-xs font-bold text-accent">{client.active_jobs}</p>
                           <p className="text-[9px] text-muted-foreground/60 uppercase">Active</p>
                        </div>
                        <div>
                           <p className="text-xs font-bold text-foreground">{client.total_paid.toLocaleString()} OMR</p>
                           <p className="text-[9px] text-muted-foreground/60 uppercase">Total Paid</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                       <p className="text-xs text-foreground">Institutional Client</p>
                       <p className="text-[10px] text-muted-foreground/60">Since {new Date(client.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="py-4 px-6">
                       <span className={cn(
                         "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5",
                         client.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                       )}>
                         {client.is_active ? <Check size={10} /> : <XIcon size={10} />}
                         {client.is_active ? 'Active' : 'Archived'}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => navigate(`/admin/clients/${client.id}`)}
                           className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" 
                           title="View Details"
                         >
                           <Eye size={16} />
                         </button>
                         <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit Client">
                           <Edit3 size={16} />
                         </button>
                         <div className="w-[1px] h-4 bg-border mx-1" />
                         
                         <button 
                           onClick={async (e) => {
                             e.stopPropagation();
                             if(confirm(`Are you sure you want to ${client.is_active ? 'ARCHIVE' : 'RESTORE'} this client?`)) {
                               const db = (await import('../../lib/supabase')).supabase as any;
                               await db.from('profiles').update({ is_active: !client.is_active }).eq('id', client.id);
                               window.location.reload();
                             }
                           }}
                           className={cn(
                             "p-1.5 rounded-lg transition-colors",
                             client.is_active ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"
                           )} 
                           title={client.is_active ? "Archive Client" : "Restore Client"}
                         >
                           {client.is_active ? <Archive size={16} /> : <Check size={16} />}
                         </button>

                         <button 
                           onClick={async (e) => {
                             e.stopPropagation();
                             if(confirm('CRITICAL: Are you sure you want to PERMANENTLY DELETE this client and all associated data? This cannot be undone.')) {
                               const db = (await import('../../lib/supabase')).supabase as any;
                               await db.from('profiles').delete().eq('id', client.id);
                               window.location.reload();
                             }
                           }}
                           className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                           title="Hard Delete"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
