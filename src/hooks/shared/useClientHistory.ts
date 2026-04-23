import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface ClientTimelineJob {
  id: string;
  job_code: string;
  service_name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_fee: number;
}

export const useClientHistory = (clientId?: string) => {
  return useQuery({
    queryKey: ['client', 'history', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientTimelineJob[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          job_code,
          status,
          created_at,
          completed_at,
          total_fee,
          service:service_id(name_en)
        `)
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((j: any) => ({
        id: j.id,
        job_code: j.job_code,
        service_name: j.service?.name_en || 'Unknown Service',
        status: j.status,
        created_at: j.created_at,
        completed_at: j.completed_at,
        total_fee: j.total_fee,
      }));
    },
  });
};
