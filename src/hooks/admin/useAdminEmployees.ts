import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Isolate the employee registration client to avoid logging out the admin
const guestClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-employee-reg'
    }
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;


// ─── Types ──────────────────────────────────────────────────────────────────
export interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  // Computed stats from jobs table
  total_jobs: number;
  active_jobs: number;
  completed_month: number;
  avg_completion_days: number;
  // Associated data
  jobs?: any[];
}

// ─── List All Employees ──────────────────────────────────────────────────────
export const useAdminEmployees = () => {
  return useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        full_name: p.full_name ?? 'Unknown',
        email: p.email ?? '',
        active_jobs: 0,
        completed_month: 0,
      }));
    },
  });
};

// ─── Single Employee + Performance Intelligence ─────────────────────────────
export const useAdminEmployee = (id?: string) => {
  return useQuery({
    queryKey: ['admin', 'employee', id],
    // Only enable if id is present and looks like a valid UUID
    enabled: !!id && id.length > 20, 
    queryFn: async (): Promise<Employee> => {
      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single();

      if (profileError) throw profileError;

      // 2. Fetch Associated Jobs (Simplified join to reduce payload)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*, client:profiles!jobs_client_id_fkey(full_name), service:services(name_en, name_ar)')
        .eq('employee_id', id!)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // 3. Calculate Stats
      const totalJobs = jobs?.length || 0;
      const activeJobs = jobs?.filter((j: any) => j.status === 'active').length || 0;
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const completedMonth = jobs?.filter((j: any) => {
        if (j.status !== 'completed' || !j.completed_at) return false;
        const d = new Date(j.completed_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length || 0;

      const completedJobs = jobs?.filter((j: any) => j.status === 'completed' && j.completed_at && j.created_at) || [];
      const totalDays = completedJobs.reduce((acc: number, j: any) => {
        const start = new Date(j.created_at).getTime();
        const end = new Date(j.completed_at).getTime();
        return acc + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      const avgCompletionDays = completedJobs.length > 0 ? Math.round(totalDays / completedJobs.length) : 0;

      return {
        ...profile,
        full_name: profile.full_name ?? 'Unknown',
        email: profile.email ?? '',
        total_jobs: totalJobs,
        active_jobs: activeJobs,
        completed_month: completedMonth,
        avg_completion_days: avgCompletionDays,
        jobs: jobs || []
      };
    },
  });
};

// ─── Activity Log Hook ──────────────────────────────────────────────────────
export const useEmployeeActivity = (id?: string) => {
  return useQuery({
    queryKey: ['admin', 'employee-activity', id],
    enabled: !!id && id.length > 20,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    }
  });
};

// ─── Create Employee ─────────────────────────────────────────────────────────
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEmployee: {
      full_name: string;
      email: string;
      phone?: string;
      password: string;
      avatar_file?: File | null;
    }) => {
      // Step B: Create the auth user
      const { data: authData, error: authError } = await guestClient.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
        options: {
          data: {
            full_name: newEmployee.full_name,
            role: 'employee',
          }
        }
      });

      if (authError) {
        console.error('Supabase SignUp Error Details:', {
          code: authError.status,
          message: authError.message,
          error: authError
        });
        throw new Error(authError.message || 'Supabase authentication failed');
      }
      if (!authData.user) throw new Error('User creation failed');

      const userId = authData.user.id;
      const empCode = `EMP-${Date.now().toString().slice(-6)}`;
      let avatarUrl = null;

      // New Step: Upload avatar if provided
      if (newEmployee.avatar_file) {
        const fileExt = newEmployee.avatar_file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, newEmployee.avatar_file);
        
        if (uploadError) {
          console.error('Avatar Upload Failed:', uploadError);
          // We don't throw here to avoid failing the whole employee creation 
          // Just because a photo upload failed.
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // Step C: Insert the profile record using the main authenticated client (db)
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .upsert({
          id: userId,
          full_name: newEmployee.full_name,
          email: newEmployee.email,
          phone: newEmployee.phone ?? null,
          role: 'employee',
          employee_code: empCode,
          avatar_url: avatarUrl,
          is_active: true,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }
      
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
    },
  });
};

// ─── Update Employee ─────────────────────────────────────────────────────────
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Employee> }) => {
      const { data, error } = await db
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'employee', id] });
    },
  });
};

// ─── Toggle Employee Active Status ───────────────────────────────────────────
export const useToggleEmployeeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db
        .from('profiles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
    },
  });
};
// ─── Reset Employee Password ───────────────────────────────────────────────
export const useResetEmployeePassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset email sent successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send reset email');
    }
  });
};
// ─── Delete Employee ────────────────────────────────────────────────────────
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Call the Master Purge RPC to remove from both Profiles and Auth.users
      const { error } = await supabase.rpc('delete_user_identity', { target_user_id: id });

      if (error) {
        console.error('Purge error:', error);
        throw new Error(error.message || 'Operation failed. Check permissions.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'employees'] });
      toast.success('Employee successfully removed from the system');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove employee');
    }
  });
};
