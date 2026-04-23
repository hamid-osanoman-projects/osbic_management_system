import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, Filter, Edit3, Trash2, 
  Loader2, Boxes, ArrowRight, LayoutGrid, List
} from 'lucide-react';
import { useAdminPackages, useDeletePackage } from '../../hooks/admin/useAdminPackages';
import Skeleton from '../../components/ui/Skeleton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PackagesList = () => {
  const navigate = useNavigate();
  const { data: packages, isLoading } = useAdminPackages();
  const { mutate: deletePkg, isPending: isDeleting } = useDeletePackage();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredPackages = packages?.filter(p => 
    p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.name_ar.includes(searchQuery)
  );

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete package "${name}"? This will not affect the individual services.`)) {
      deletePkg(id, {
        onSuccess: () => toast.success('Package deleted'),
        onError: (err: any) => toast.error(err.message || 'Failed to delete')
      });
    }
  };

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemAnimations = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-syne font-bold text-foreground flex items-center gap-2">
             <Boxes className="text-primary" size={24} /> Service Packages
          </h1>
          <p className="text-sm text-muted-foreground">Bundle multiple services into high-value operational offerings</p>
        </div>
        <Link 
          to="/admin/packages/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 w-fit"
        >
          <Plus size={18} />
          <span>New Package</span>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-2 rounded-2xl shadow-sm">
        <div className="flex-1 w-full sm:w-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search packages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-2 text-foreground placeholder:text-muted-foreground/50 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List size={16} />
            </button>
          </div>
          <div className="w-[1px] h-6 bg-border mx-2" />
          <button className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border flex items-center gap-2">
            <Filter size={16} /> <span className="text-sm font-medium hidden sm:inline">Status</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {[1,2,3].map(i => <Skeleton key={i} height={240} rounded="xl" />)}
        </div>
      ) : filteredPackages?.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-20 text-center shadow-xl">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
              <Package size={32} />
           </div>
           <h3 className="text-xl font-bold text-foreground mb-2">No Packages Found</h3>
           <p className="text-muted-foreground max-w-sm mx-auto mb-8">Start bundling your services to offer better value to your clients.</p>
           <Link to="/admin/packages/new" className="text-primary font-bold hover:underline inline-flex items-center gap-2">
              Create your first package <ArrowRight size={16} />
           </Link>
        </div>
      ) : (
        <motion.div 
          variants={containerAnimations} initial="hidden" animate="show"
          className={cn(
            viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "space-y-4"
          )}
        >
          {filteredPackages?.map((pkg) => (
            <motion.div 
              key={pkg.id} 
              variants={itemAnimations} 
              className={cn(
                "bg-card border border-border rounded-3xl shadow-sm group hover:border-primary/30 transition-all overflow-hidden",
                viewMode === 'list' ? "flex items-center p-4 gap-6" : "p-6 flex flex-col h-full"
              )}
            >
               <div className={cn(
                 "bg-muted rounded-2xl flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105",
                 viewMode === 'list' ? "w-14 h-14" : "w-16 h-16 mb-6"
               )}>
                  <Package size={viewMode === 'list' ? 24 : 32} />
               </div>

               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                     <h3 className="text-lg font-bold text-foreground truncate">{pkg.name_en}</h3>
                     {pkg.discount_percentage > 0 && (
                       <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {pkg.discount_percentage}% OFF
                       </span>
                     )}
                  </div>
                  <p className="text-sm text-muted-foreground/60 font-medium mb-4" dir="rtl">{pkg.name_ar}</p>
                  
                  {viewMode === 'grid' && (
                    <div className="space-y-2 mb-8">
                       <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Included Services ({pkg.services.length})</p>
                       <div className="flex flex-wrap gap-2">
                          {pkg.services.slice(0, 3).map((s, i) => (
                             <span key={i} className="text-[10px] bg-background border border-border px-2 py-1 rounded-lg text-foreground font-medium">
                                {s.name_en}
                             </span>
                          ))}
                          {pkg.services.length > 3 && (
                            <span className="text-[10px] text-primary font-bold">+ {pkg.services.length - 3} more</span>
                          )}
                       </div>
                    </div>
                  )}
               </div>

               <div className={cn(
                 "flex items-center gap-2",
                 viewMode === 'grid' ? "mt-auto pt-4 border-t border-border" : "shrink-0"
               )}>
                  <button 
                    onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted/50 hover:bg-primary hover:text-primary-foreground rounded-xl text-xs font-bold transition-all border border-transparent"
                  >
                     <Edit3 size={14} /> Edit
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => handleDelete(pkg.id, pkg.name_en)}
                    className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-transparent"
                  >
                     {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
               </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default PackagesList;
