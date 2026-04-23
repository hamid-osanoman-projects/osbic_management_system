import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type AuditLog = {
  id: string;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  old_values: any;
  new_values: any;
  profiles?: {
    full_name: string | null;
  };
};

export const useAdminAudit = () => {
  return useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:actor_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
  });
};
