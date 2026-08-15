import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, 
  CreditCard, PieChart, BarChart3, ArrowUpRight, 
  ArrowDownRight, RefreshCw, Loader2, Users
} from 'lucide-react';
import { useFinanceMetrics } from '../../hooks/admin/useFinance';
import { useBranch } from '../../contexts/BranchContext';

const StatCard = ({ title, amount, trend, subtext, icon: Icon, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-${color}-500/10 transition-colors`} />
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>
        <Icon size={20} />
      </div>
      <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
        {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(trend)}%
      </div>
    </div>
    <p className="text-muted-foreground/60 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-foreground mb-1">
      {new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(amount)}
    </h3>
    <p className="text-[10px] text-muted-foreground/60 font-medium">{subtext}</p>
  </motion.div>
);

const Finance = () => {
  const { selectedBranchId } = useBranch();
  const { data: metrics, isLoading, refetch } = useFinanceMetrics(selectedBranchId);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">Reconciling Financial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground mb-2">Financial Dashboard</h1>
          <p className="text-muted-foreground font-medium">Live tracking of all earnings, profits, and unpaid balances.</p>
        </div>
        <button 
           onClick={() => refetch()}
           className="p-3 rounded-2xl bg-muted/50 hover:bg-white/10 text-foreground transition-all border border-border"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Money In" 
          amount={metrics?.totalRevenue} 
          trend={12.4} 
          subtext="The total price of all projects started."
          icon={DollarSign}
          color="blue"
        />
        <StatCard 
          title="Our Actual Profit" 
          amount={metrics?.netProfit} 
          trend={8.2} 
          subtext="The money the center keeps as profit."
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard 
          title="Government Fees" 
          amount={metrics?.ministryHeld} 
          trend={-2.1} 
          subtext="Money held to pay for registrations."
          icon={Wallet}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Unpaid Deposits" 
          amount={metrics?.advancesUnpaid} 
          trend={15.3} 
          subtext="Money clients owe for job startups."
          icon={CreditCard}
          color="red"
        />
        <StatCard 
          title="Money Clients Owe Us" 
          amount={metrics?.remainingUnpaid} 
          trend={5.9} 
          subtext="Total amount still waiting to be collected."
          icon={BarChart3}
          color="amber"
        />
        <StatCard 
          title="This Month's Growth" 
          amount={metrics?.monthlyRevenue} 
          trend={22.1} 
          subtext="New money made during this month."
          icon={PieChart}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance by Employee */}
        <div className="bg-card border border-border rounded-[32px] p-8">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
               <Users className="text-primary" size={24} /> Employee Performance
             </h3>
          </div>
          <div className="space-y-6">
            {metrics?.employeePerformance.slice(0, 5).map((emp, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                     {emp.name[0]}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">{emp.name}</p>
                     <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">{emp.completed} Jobs Closed</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-bold text-foreground">
                     {new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(emp.revenue)}
                   </p>
                   <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">High Impact</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profitability by Service Category */}
        <div className="bg-card border border-border rounded-[32px] p-8">
           <div className="flex items-center justify-between mb-8">
             <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
               <BarChart3 className="text-primary" size={24} /> Profit by Category
             </h3>
           </div>
           
           <div className="space-y-6">
              {metrics?.profitabilityByService.map((s, i) => (
                <div key={i}>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{s.name}</span>
                      <span className="text-xs font-bold text-foreground">
                        {new Intl.NumberFormat('en-OM', { style: 'currency', currency: 'OMR' }).format(s.value)}
                      </span>
                   </div>
                   <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.value / metrics.totalRevenue) * 100, 100)}%` }}
                        className="h-full bg-primary shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                      />
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;
