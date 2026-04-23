import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import toast from 'react-hot-toast';

export type ServiceInterest = Database['public']['Tables']['service_interests']['Row'] & {
  client_name?: string;
  service_name?: string;
};

export type EmployeeRequest = Database['public']['Tables']['employee_requests']['Row'];

export const useSupport = () => {
  const queryClient = useQueryClient();

  // —— LEADS / INTERESTS ——
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['service_interests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_interests')
        .select(`
          *,
          client:client_id(full_name),
          service:service_id(name_en)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any[]).map(item => ({
        id: item.id,
        client_id: item.client_id,
        service_id: item.service_id,
        notes: item.notes,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
        client_name: item.client?.full_name,
        service_name: item.service?.name_en
      })) as ServiceInterest[];
    }
  });

  const createInterest = useMutation({
    mutationFn: async (payload: Database['public']['Tables']['service_interests']['Insert']) => {
      const { error } = await (supabase as any)
        .from('service_interests')
        .insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_interests'] });
    }
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ServiceInterest['status'] }) => {
      const { error } = await (supabase as any)
        .from('service_interests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_interests'] });
      toast.success('Lead status updated');
    }
  });

  // —— EMPLOYEE REQUESTS (SOS) ——
  const { data: myRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['employee_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeRequest[];
    }
  });

  const submitRequest = useMutation({
    mutationFn: async (payload: Database['public']['Tables']['employee_requests']['Insert']) => {
      const { error } = await (supabase as any)
        .from('employee_requests')
        .insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_requests'] });
      toast.success('Emergency alert sent to Admin');
    }
  });

  return {
    leads,
    leadsLoading,
    createInterest,
    updateLeadStatus,
    myRequests,
    requestsLoading,
    submitRequest
  };
};
