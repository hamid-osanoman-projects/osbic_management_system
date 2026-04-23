import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// KPI Stats Hook
export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      // 1. Total Revenue (all jobs)
      const { data: revenueData } = await supabase
        .from('jobs')
        .select('total_fee');
      
      const totalRevenue = (revenueData as { total_fee: number }[] | null)?.reduce((acc, job) => acc + Number(job.total_fee), 0) || 0;

      // 2. Active Jobs
      const { count: activeJobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 3. Total Clients
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      // 4. Pending Actions (from employee_requests)
      const { count: pendingRequestsCount } = await supabase
        .from('employee_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalRevenue,
        activeJobs: activeJobsCount || 0,
        totalClients: clientsCount || 0,
        pendingActions: pendingRequestsCount || 0,
        revenueChange: 0, // In a real app, you would compute this by comparing vs previous month
        jobsChange: 0,
        clientsChange: 0,
        actionsChange: 0,
      };
    },
    refetchInterval: 30000, 
  });
};

// Revenue Chart Hook (aggregated from actual jobs with 6-month padding)
export const useRevenueChart = () => {
  return useQuery({
    queryKey: ['admin', 'revenue-chart'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('total_fee, ministry_fee, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const monthlyData: Record<string, { service: number, ministry: number }> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Ensure we have at least the last 6 months represented (padding)
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData[monthNames[d.getMonth()]] = { service: 0, ministry: 0 };
      }

      (data as any[] || []).forEach(job => {
        const date = new Date(job.created_at);
        const monthKey = monthNames[date.getMonth()];
        
        // Only sum if it falls within our tracked/padded months
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
export const useJobDistribution = () => {
  return useQuery({
    queryKey: ['admin', 'job-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('status');
      
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
export const useTopEmployees = () => {
  return useQuery({
    queryKey: ['admin', 'top-employees'],
    queryFn: async () => {
      // 1. Get all employees
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, employee_code')
        .eq('role', 'employee');
      
      if (empError) throw empError;

      // 2. Count completed jobs for each
      const { data: jobCounts, error: jobError } = await (supabase as any)
        .from('jobs')
        .select('employee_id, id')
        .eq('status', 'completed');

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
export const useRecentJobs = () => {
  return useQuery({
    queryKey: ['admin', 'recent-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:client_id(full_name),
          employee:employee_id(full_name),
          service:service_id(name_en, name_ar)
        `)
        .order('updated_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data;
    },
  });
};

// Expiry Alerts Hook
export const useExpiryAlerts = () => {
  return useQuery({
    queryKey: ['admin', 'expiry-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:client_id(full_name),
          service:service_id(name_en, name_ar)
        `)
        .not('service_expiry_date', 'is', null)
        .order('service_expiry_date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });
};

// Pending Requests Hook
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

// Activity Feed Hook
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
