import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface FinanceMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  netProfit: number; // Work Fees
  ministryHeld: number; // Unpaid ministry fees
  advancesUnpaid: number; // Sum of unpaid advances
  remainingUnpaid: number; // Sum of unpaid remaining amounts
  profitabilityByService: { name: string; value: number }[];
  employeePerformance: { name: string; completed: number; revenue: number }[];
}

export const useFinanceMetrics = () => {
  return useQuery({
    queryKey: ['admin', 'finance'],
    queryFn: async (): Promise<FinanceMetrics> => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          services (name_en),
          profiles:employee_id (full_name)
        `);

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let netProfit = 0;
      let ministryHeld = 0;
      let advancesUnpaid = 0;
      let remainingUnpaid = 0;

      const serviceMap: Record<string, number> = {};
      const employeeMap: Record<string, { completed: number; revenue: number }> = {};

      jobs.forEach((job: any) => {
        const jobCreatedDate = new Date(job.created_at);
        
        // Revenue is total expected fee
        totalRevenue += job.total_fee;
        
        if (jobCreatedDate >= firstDayOfMonth) {
          monthlyRevenue += job.total_fee;
        }

        // Profit is work fee
        netProfit += job.work_fee;

        // Liabilities
        if (!job.advance_paid) {
          advancesUnpaid += job.advance_amount || (job.total_fee * job.advance_percentage / 100);
        }
        if (!job.remaining_paid) {
          remainingUnpaid += job.remaining_amount || (job.total_fee - (job.advance_amount || 0));
        }
        
        // Ministry fees held (not paid yet)
        if (job.status !== 'completed') {
          ministryHeld += job.ministry_fee;
        }

        // Service aggregation
        const serviceName = job.services?.name_en || 'Other';
        serviceMap[serviceName] = (serviceMap[serviceName] || 0) + job.total_fee;

        // Employee performance
        const empName = job.profiles?.full_name || 'Unassigned';
        if (!employeeMap[empName]) {
          employeeMap[empName] = { completed: 0, revenue: 0 };
        }
        if (job.status === 'completed') {
          employeeMap[empName].completed += 1;
        }
        employeeMap[empName].revenue += job.total_fee;
      });

      return {
        totalRevenue,
        monthlyRevenue,
        netProfit,
        ministryHeld,
        advancesUnpaid,
        remainingUnpaid,
        profitabilityByService: Object.entries(serviceMap).map(([name, value]) => ({ name, value })),
        employeePerformance: Object.entries(employeeMap).map(([name, stats]) => ({
          name,
          ...stats
        }))
      };
    },
  });
};
