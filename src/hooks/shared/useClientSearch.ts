import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface ClientSearchResult {
  id: string;
  full_name: string;
  client_code: string;
  phone: string;
  avatar_url: string | null;
  last_service_date?: string;
  last_service_name?: string;
}

export const useClientSearch = (query: string) => {
  return useQuery({
    queryKey: ['clients', 'search', query],
    enabled: query.length >= 2,
    queryFn: async (): Promise<ClientSearchResult[]> => {
      // 1. Search for profiles via RPC (Bypasses Hub RLS filtering)
      const { data: profiles, error: profileError } = await (supabase as any)
        .rpc('search_all_clients', { search_term: query });

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      // 2. Fetch last service for each found client
      const results = await Promise.all(
        profiles.map(async (p) => {
          const { data: lastJob } = await supabase
            .from('jobs')
            .select('created_at, service_id, services(name_en)')
            .eq('client_id', p.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: p.id,
            full_name: p.full_name || 'Unnamed Client',
            client_code: p.client_code || 'N/A',
            phone: p.phone || 'N/A',
            avatar_url: p.avatar_url,
            last_service_date: lastJob?.created_at,
            last_service_name: (lastJob?.services as any)?.name_en
          };
        })
      );

      return results;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};
