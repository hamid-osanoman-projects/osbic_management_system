import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Skeleton from '../../ui/Skeleton';

export default function FinanceHealthMatrix({ branchId }: { branchId?: string | null }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all active jobs with their financial status and progress
    let query = supabase
      .from('jobs')
      .select('id, job_code, status, financial_status, total_fee, advance_amount, remaining_amount, current_step_id')
      .neq('status', 'cancelled');
    
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data: jobs } = await query;
    
    if (jobs) {
      setData(jobs);
    }
    setLoading(false);
  };

  const getMatrixZone = (job: any) => {
    // Red Zone: Work is active/completed but unpaid (remaining amount equals total fee or advance_amount is 0)
    // Yellow Zone: Partially paid but work is advancing
    // Green Zone: Fully paid (remaining amount is 0)
    const isFullyPaid = job.financial_status === 'fully_paid' || (Number(job.remaining_amount) || 0) <= 0;
    const isUnpaid = job.financial_status === 'unpaid' || (Number(job.advance_amount) || 0) === 0;

    if (isFullyPaid) return 'green';
    if (isUnpaid && job.status !== 'on_hold') return 'red';
    return 'yellow';
  };

  const summary = {
    red: data.filter(j => getMatrixZone(j) === 'red').length,
    yellow: data.filter(j => getMatrixZone(j) === 'yellow').length,
    green: data.filter(j => getMatrixZone(j) === 'green').length,
    totalDebt: data.filter(j => getMatrixZone(j) === 'red' || getMatrixZone(j) === 'yellow').reduce((sum, j) => sum + (j.remaining_amount || 0), 0)
  };

  if (loading) {
    return <Skeleton height={200} />;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-syne font-bold text-foreground">Finance Health Matrix</h4>
          <p className="text-xs text-muted-foreground">Ops Risk vs Debt Exposure</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-muted/50 hover:bg-muted rounded-xl transition-colors">
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* RED ZONE */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <AlertTriangle size={16} />
            <h5 className="font-bold text-xs uppercase tracking-wider">High Risk (Red)</h5>
          </div>
          <p className="text-xs text-muted-foreground">Work progressing, Unpaid</p>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-red-500">{summary.red}</span>
            <span className="text-xs text-muted-foreground ml-1">jobs</span>
          </div>
        </div>

        {/* YELLOW ZONE */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <TrendingDown size={16} />
            <h5 className="font-bold text-xs uppercase tracking-wider">Moderate (Yellow)</h5>
          </div>
          <p className="text-xs text-muted-foreground">Partially Paid</p>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-amber-500">{summary.yellow}</span>
            <span className="text-xs text-muted-foreground ml-1">jobs</span>
          </div>
        </div>

        {/* GREEN ZONE */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <TrendingUp size={16} />
            <h5 className="font-bold text-xs uppercase tracking-wider">Healthy (Green)</h5>
          </div>
          <p className="text-xs text-muted-foreground">Fully Paid</p>
          <div className="mt-4">
            <span className="text-2xl font-bold font-mono text-emerald-500">{summary.green}</span>
            <span className="text-xs text-muted-foreground ml-1">jobs</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Total Active Exposure</span>
        <span className="text-lg font-bold text-foreground font-mono">{summary.totalDebt.toFixed(3)} OMR</span>
      </div>
    </div>
  );
}
