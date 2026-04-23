import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Service } from '../admin/useAdminServices';

export interface ClientPackage {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  discount_percentage: number;
  services: Service[];
}

export const useClientPackages = () => {
  return useQuery({
    queryKey: ['client', 'packages'],
    queryFn: async (): Promise<ClientPackage[]> => {
      const { data, error } = await supabase
        .from('service_packages')
        .select(`
          *,
          package_services (
            services (*)
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        services: p.package_services?.map((ps: any) => ps.services) || []
      }));
    },
  });
};

export const useRequestPackage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ packageId, clientId }: { packageId: string; clientId: string }) => {
      // 1. Get package details
      const { data: pkg, error: pError } = await supabase
        .from('service_packages')
        .select('*, package_services(service_id)')
        .eq('id', packageId)
        .single();
      
      if (pError) throw pError;
      
      const serviceIds = pkg.package_services.map((ps: any) => ps.service_id);
      
      // 2. For each service, create a job
      // Note: In a production app, this should be a DB function/RPC to ensure atomicity.
      for (const serviceId of serviceIds) {
        const { error: jError } = await supabase
          .from('jobs')
          .insert({
            client_id: clientId,
            service_id: serviceId,
            status: 'pending',
            started_date: new Date().toISOString()
          } as any);
        
        if (jError) throw jError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'jobs'] });
    }
  });
};
