import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// Helper: apply branch filter to a Supabase query builder if branchId is set
function withBranch(query: any, branchId: string | null) {
  return branchId ? query.eq('branch_id', branchId) : query;
}

// KPI Stats Hook
export const useAdminDashboardStats = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'dashboard-stats', branchId],
    queryFn: async () => {
      // 1. Total Revenue (all jobs)
      const revenueQuery = supabase.from('jobs').select('total_fee');
      const { data: revenueData } = await withBranch(revenueQuery, branchId);
      
      const totalRevenue = (revenueData as { total_fee: number }[] | null)?.reduce((acc, job) => acc + Number(job.total_fee), 0) || 0;

      // 2. Active Jobs
      const activeQuery = supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: activeJobsCount } = await withBranch(activeQuery, branchId);

      // 3. Total Clients
      const clientsQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');
      const { count: clientsCount } = await withBranch(clientsQuery, branchId);

      // 4. Pending Actions (from employee_requests — not branch-specific)
      const { count: pendingRequestsCount } = await supabase
        .from('employee_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalRevenue,
        activeJobs: activeJobsCount || 0,
        totalClients: clientsCount || 0,
        pendingActions: pendingRequestsCount || 0,
        revenueChange: 0,
        jobsChange: 0,
        clientsChange: 0,
        actionsChange: 0,
      };
    },
    refetchInterval: 30000, 
  });
};

// Revenue Chart Hook (aggregated from actual jobs with 6-month padding)
export const useRevenueChart = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'revenue-chart', branchId],
    queryFn: async () => {
      const baseQuery = supabase
        .from('jobs')
        .select('total_fee, ministry_fee, created_at')
        .order('created_at', { ascending: true });
      const { data, error } = await withBranch(baseQuery, branchId);

      if (error) throw error;

      const monthlyData: Record<string, { service: number, ministry: number }> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData[monthNames[d.getMonth()]] = { service: 0, ministry: 0 };
      }

      (data as any[] || []).forEach(job => {
        const date = new Date(job.created_at);
        const monthKey = monthNames[date.getMonth()];
        
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey].service += Number(job.total_fee || 0) - Number(job.ministry_fee || 0);
          monthlyData[monthKey].ministry += Number(job.ministry_fee || 0);
        }
      });

      return Object.entries(monthlyData).map(([name, values]) => ({
        name,
        ...values
      }));
    },
  });
};

// Job Distribution Hook (Operations Donut)
export const useJobDistribution = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'job-distribution', branchId],
    queryFn: async () => {
      const baseQuery = supabase.from('jobs').select('status');
      const { data, error } = await withBranch(baseQuery, branchId);
      
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data as any[] || []).forEach(j => {
        counts[j.status] = (counts[j.status] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({
        name: name.replace('_', ' ').toUpperCase(),
        value
      }));
    },
  });
};

// Top Employees Hook (ranked by completed jobs)
export const useTopEmployees = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'top-employees', branchId],
    queryFn: async () => {
      // 1. Get employees (branch-filtered)
      const empQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, employee_code')
        .eq('role', 'employee');
      const { data: employees, error: empError } = await withBranch(empQuery, branchId);
      
      if (empError) throw empError;

      // 2. Count completed jobs for each (also branch-filtered)
      const jobQuery = (supabase as any).from('jobs').select('employee_id, id').eq('status', 'completed');
      const { data: jobCounts, error: jobError } = await withBranch(jobQuery, branchId);

      if (jobError) throw jobError;

      const countsMap = (jobCounts as any[] || []).reduce((acc: any, job: any) => {
        acc[job.employee_id] = (acc[job.employee_id] || 0) + 1;
        return acc;
      }, {});

      return (employees as any[] || []).map(emp => ({
        ...emp,
        completed_month: countsMap[emp.id] || 0,
      })).sort((a: any, b: any) => b.completed_month - a.completed_month);
    },
  });
};

// Recent Jobs Hook
export const useRecentJobs = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'recent-jobs', branchId],
    queryFn: async () => {
      const baseQuery = supabase
        .from('jobs')
        .select(`
          *,
          client:client_id(full_name),
          employee:employee_id(full_name),
          service:service_id(name_en, name_ar)
        `)
        .order('updated_at', { ascending: false })
        .limit(8);
      const { data, error } = await withBranch(baseQuery, branchId);
      
      if (error) throw error;
      return data;
    },
  });
};

// Expiry Alerts Hook
export const useExpiryAlerts = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'expiry-alerts', branchId],
    queryFn: async () => {
      const baseQuery = supabase
        .from('jobs')
        .select(`
          *,
          client:client_id(full_name),
          service:service_id(name_en, name_ar)
        `)
        .not('service_expiry_date', 'is', null)
        .order('service_expiry_date', { ascending: true })
        .limit(10);
      const { data, error } = await withBranch(baseQuery, branchId);
      
      if (error) throw error;
      return data;
    },
  });
};

// Pending Requests Hook (not branch-specific — all requests are global)
export const usePendingRequests = () => {
  return useQuery({
    queryKey: ['admin', 'pending-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_requests')
        .select(`
          *,
          employee:employee_id(full_name, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

// Activity Feed Hook (global)
export const useActivityFeed = () => {
  return useQuery({
    queryKey: ['admin', 'activity-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:actor_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (error) throw error;
      return data;
    },
  });
};

// Sales Leaderboard Hook
export const useSalesLeaderboard = (branchId: string | null = null) => {
  return useQuery({
    queryKey: ['admin', 'sales-leaderboard', branchId],
    queryFn: async () => {
      // 1. Get all employees with sales permissions (branch-filtered)
      const salesQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, employee_code')
        .eq('can_do_sales', true);
      const { data: salesStaff, error: salesError } = await withBranch(salesQuery, branchId);
      
      if (salesError) throw salesError;

      // 2. Get completed jobs' total fees (branch-filtered)
      const jobsQuery = supabase.from('jobs').select('sales_employee_id, total_fee').eq('status', 'completed');
      const { data: jobsData, error: jobsError } = await withBranch(jobsQuery, branchId);

      if (jobsError) throw jobsError;

      const revenueMap = (jobsData || []).reduce((acc: Record<string, number>, j: any) => {
        if (j.sales_employee_id) {
          acc[j.sales_employee_id] = (acc[j.sales_employee_id] || 0) + Number(j.total_fee || 0);
        }
        return acc;
      }, {});

      return (salesStaff || []).map(emp => ({
        id: emp.id,
        full_name: emp.full_name ?? 'Unknown',
        avatar_url: emp.avatar_url,
        employee_code: emp.employee_code,
        total_revenue: revenueMap[emp.id] || 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    }
  });
};

