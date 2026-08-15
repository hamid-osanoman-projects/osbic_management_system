import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface AccountsJobOverview {
  id: string;
  job_code: string;
  status: string;
  total_fee: number;
  advance_amount: number;
  remaining_amount: number;
  created_at: string;
  client: { full_name: string; phone: string | null; company_name: string | null; } | null;
  sales: { full_name: string } | null;
  ops: { full_name: string } | null;
  total_spent: number;
}

export const useAccountsOverview = () => {
  return useQuery({
    queryKey: ['accounts_overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          job_code,
          status,
          total_fee,
          advance_amount,
          remaining_amount,
          created_at,
          client:profiles!client_id(full_name, phone, company_name),
          sales:profiles!sales_employee_id(full_name),
          ops:profiles!ops_employee_id(full_name),
          expenses:job_expenses(amount, status),
          payments:job_payments(amount, status, payment_method, created_at, reference_number, notes),
          services:job_services(service_name, quantity, total_fee, ministry_fee, work_fee)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to calculate total_spent and total_paid from related tables
      return (data || []).map((job: any) => {
        const approvedExpenses = job.expenses?.filter((e: any) => e.status === 'approved') || [];
        const totalSpent = approvedExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
        
        const verifiedPayments = job.payments?.filter((p: any) => p.status === 'verified') || [];
        const totalPaid = verifiedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        
        return {
          id: job.id,
          job_code: job.job_code,
          status: job.status,
          total_fee: Number(job.total_fee) || 0,
          advance_amount: totalPaid > 0 ? totalPaid : (Number(job.advance_amount) || 0),
          remaining_amount: (Number(job.total_fee) || 0) - (totalPaid > 0 ? totalPaid : (Number(job.advance_amount) || 0)),
          created_at: job.created_at,
          client: job.client,
          sales: job.sales,
          ops: job.ops,
          total_spent: totalSpent,
          payments: job.payments || [],
          services: job.services || []
        } as AccountsJobOverview & { payments: any[], services: any[] };
      });
    }
  });
};
