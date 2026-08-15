import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, Filter, Edit3, Trash2, 
  Loader2, Boxes, ArrowRight, LayoutGrid, List, CheckCircle2,
  Eye, X, Calendar, DollarSign, Layers
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
  const [viewingPackage, setViewingPackage] = useState<any | null>(null);

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

  const calculatePackageTotals = (pkg: any) => {
    let totalWorkFee = 0;
    let totalMinistryFee = 0;
    
    pkg.services.forEach((s: any) => {
      const workFee = Number(s.service?.work_fee) || 0;
      const ministryFee = Number(s.service?.ministry_fee) || 0;
      const qty = Number(s.default_quantity) || 1;
      
      totalWorkFee += workFee * qty;
      totalMinistryFee += ministryFee * qty;
    });
    
    const subtotal = totalWorkFee + totalMinistryFee;
    let discountAmount = 0;
    
    if (pkg.fixed_price !== null && pkg.fixed_price !== undefined && Number(pkg.fixed_price) > 0) {
      discountAmount = Math.max(0, subtotal - Number(pkg.fixed_price));
    } else if (pkg.discount_percentage > 0) {
      discountAmount = subtotal * (Number(pkg.discount_percentage) / 100);
    }
    
    const finalPrice = Math.max(0, subtotal - discountAmount);
    
    return {
      work: totalWorkFee,
      ministry: totalMinistryFee,
      subtotal,
      discount: discountAmount,
      total: finalPrice
    };
  };

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemAnimations = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const stats = {
    total: packages?.length || 0,
    active: packages?.filter(p => p.is_active).length || 0,
    totalServices: packages?.reduce((sum, p) => sum + p.services.length, 0) || 0
  };

  const renderList = () => {
    return (
      <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/80 bg-black/20">
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Package Name</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Arabic Name</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Discount</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Included Services</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60">Status</th>
                <th className="py-4 px-6 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredPackages?.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-4 px-6 text-sm font-bold text-foreground">{pkg.name_en}</td>
                  <td className="py-4 px-6 text-xs text-muted-foreground font-medium" dir="rtl">{pkg.name_ar}</td>
                  <td className="py-4 px-6">
                    {pkg.discount_percentage > 0 ? (
                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {pkg.discount_percentage}% OFF
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 font-mono">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-xs text-muted-foreground font-medium">
                    {pkg.services.length} services
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                      pkg.is_active 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    )}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewingPackage(pkg)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-xl transition-all"
                        title="Edit Package"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        disabled={isDeleting}
                        onClick={() => handleDelete(pkg.id, pkg.name_en)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete Package"
                      >
                        {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
          className="flex items-center gap-2 bg-primary text-[#0A0F1E] px-6 py-2.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-95 w-fit"
        >
          <Plus size={18} />
          <span>New Package</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Packages</p>
            <h3 className="text-2xl font-syne font-bold text-foreground mt-2">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Boxes size={24} />
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Active Packages</p>
            <h3 className="text-2xl font-syne font-bold text-foreground mt-2">{stats.active}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Linked Services</p>
            <h3 className="text-2xl font-syne font-bold text-foreground mt-2">{stats.totalServices}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-2 rounded-2xl shadow-sm">
        <div className="flex-1 w-full sm:w-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input 
            type="text" 
            placeholder="Search packages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-2 text-foreground placeholder:text-muted-foreground/40 text-sm"
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
        <div className="bg-card border border-border rounded-3xl p-20 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
               <Package size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Packages Found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">Start bundling your services to offer better value to your clients.</p>
            <Link to="/admin/packages/new" className="text-primary font-bold hover:underline inline-flex items-center gap-2">
               Create your first package <ArrowRight size={16} />
            </Link>
        </div>
      ) : viewMode === 'list' ? (
        renderList()
      ) : (
        <motion.div 
          variants={containerAnimations} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredPackages?.map((pkg) => (
            <motion.div 
              key={pkg.id} 
              variants={itemAnimations} 
              className="bg-card border border-border rounded-3xl p-6 shadow-sm group hover:border-primary/30 transition-all flex flex-col h-full relative"
            >
               {/* Icon & Status */}
               <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary transition-transform group-hover:scale-105 shrink-0">
                     <Boxes size={22} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                     {pkg.discount_percentage > 0 && (
                       <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {pkg.discount_percentage}% OFF
                       </span>
                     )}
                     <span className={cn(
                       "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                       pkg.is_active 
                       ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                       : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                     )}>
                       {pkg.is_active ? 'Active' : 'Inactive'}
                     </span>
                  </div>
               </div>

               {/* Name & Translation */}
               <div className="space-y-1.5 mb-5 flex-1 min-w-0">
                  <h3 className="text-base font-syne font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {pkg.name_en}
                  </h3>
                  <p className="text-xs text-muted-foreground/60 font-medium" dir="rtl">
                    {pkg.name_ar}
                  </p>
               </div>

               {/* Included Services */}
               <div className="border-t border-border/50 pt-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-extrabold text-muted-foreground/40 uppercase tracking-widest">
                       Included Services
                     </span>
                     <span className="text-[10px] font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                       {pkg.services.length} Total
                     </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                     {pkg.services.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[9px] bg-muted/40 border border-border/80 px-2 py-0.5 rounded text-foreground font-medium truncate max-w-[150px]">
                           {s.service?.name_en || s.service?.name_ar || 'Service'}
                        </span>
                     ))}
                     {pkg.services.length > 3 && (
                       <span className="text-[9px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                         + {pkg.services.length - 3} more
                       </span>
                     )}
                  </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                  <button 
                    onClick={() => setViewingPackage(pkg)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted/50 hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all border border-transparent"
                  >
                     <Eye size={13} /> View
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/packages/${pkg.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-[#0A0F1E] hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] rounded-xl text-xs font-bold transition-all border border-transparent"
                  >
                     <Edit3 size={13} /> Edit
                  </button>
                  <button 
                    disabled={isDeleting}
                    onClick={() => handleDelete(pkg.id, pkg.name_en)}
                    className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-transparent shrink-0"
                  >
                     {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
               </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingPackage && (() => {
          const totals = calculatePackageTotals(viewingPackage);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingPackage(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-[#0e1424] border border-border w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="p-6 lg:p-8 border-b border-border/60 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shrink-0">
                      <Boxes size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-syne font-bold text-foreground">{viewingPackage.name_en}</h2>
                        {viewingPackage.discount_percentage > 0 && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {viewingPackage.discount_percentage}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground/80 mt-1 font-medium" dir="rtl">{viewingPackage.name_ar}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingPackage(null)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 lg:p-8 overflow-y-auto space-y-8 flex-1">
                  {/* Description */}
                  {(viewingPackage.description_en || viewingPackage.description_ar) && (
                    <div className="space-y-2 bg-muted/20 border border-border/40 p-5 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">About this package</h4>
                      {viewingPackage.description_en && <p className="text-sm text-foreground leading-relaxed">{viewingPackage.description_en}</p>}
                      {viewingPackage.description_ar && <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium mt-1" dir="rtl">{viewingPackage.description_ar}</p>}
                    </div>
                  )}

                  {/* Pricing Summary */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} className="text-primary" /> Pricing Summary
                    </h4>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
                         <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ministry Fees (Fixed)</p>
                         <p className="text-lg font-mono font-bold text-foreground mt-1">{totals.ministry.toFixed(3)} <span className="text-xs">OMR</span></p>
                       </div>
                       <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                         <p className="text-[10px] text-primary uppercase font-extrabold tracking-wider">Bundle Price</p>
                         <p className="text-lg font-mono font-bold text-primary mt-1">{totals.total.toFixed(3)} <span className="text-xs">OMR</span></p>
                       </div>
                     </div>
                  </div>

                  {/* Workflow / Steps Timeline */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                      <Layers size={14} className="text-primary" /> Included Service Workflow
                    </h4>

                    <div className="relative border-l border-border pl-6 ml-4 space-y-8">
                      {viewingPackage.services.map((s: any, idx: number) => {
                        const minD = s.estimated_days_min ?? 0;
                        const maxD = s.estimated_days_max ?? 0;
                        
                        return (
                          <div key={idx} className="relative group/timeline">
                            {/* Marker */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border border-border bg-[#0e1424] flex items-center justify-center text-[8px] font-bold text-muted-foreground/80 group-hover/timeline:border-primary group-hover/timeline:text-primary transition-colors">
                              {idx + 1}
                            </div>
                            <div className="bg-card border border-border/40 p-4 rounded-2xl hover:border-border transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                <div>
                                  <h5 className="text-sm font-bold text-foreground">{s.service?.name_en}</h5>
                                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                    <p className="text-xs text-muted-foreground/60 font-medium" dir="rtl">{s.service?.name_ar}</p>
                                    <span className="text-muted-foreground/20 text-[9px]">•</span>
                                    <p className="text-[10px] text-muted-foreground/80 font-mono">Gov Fee: <span className="text-foreground font-bold">{(Number(s.service?.ministry_fee) || 0).toFixed(3)}</span> OMR</p>
                                    {s.default_quantity > 1 && (
                                      <>
                                        <span className="text-muted-foreground/20 text-[9px]">•</span>
                                        <span className="text-[10px] text-primary font-bold">Qty: {s.default_quantity}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                  {s.is_parallel && (
                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Parallel
                                    </span>
                                  )}
                                  {s.is_optional && (
                                    <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Optional
                                    </span>
                                  )}
                                  <span className="bg-muted/80 text-foreground border border-border text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                                    <Calendar size={10} /> {minD === maxD ? `${minD} days` : `${minD}-${maxD} days`}
                                  </span>
                                </div>
                              </div>

                              {s.notes && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/20 pl-2 mt-2">
                                  {s.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/10 border-t border-border/60 flex items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    This package contains <span className="text-foreground font-bold">{viewingPackage.services.length} services</span> in sequence.
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setViewingPackage(null)}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Close
                    </button>
                    <button 
                      onClick={() => {
                        setViewingPackage(null);
                        navigate(`/admin/packages/${viewingPackage.id}`);
                      }}
                      className="px-6 py-2.5 bg-primary text-[#0A0F1E] font-bold rounded-xl hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit Package
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default PackagesList;
