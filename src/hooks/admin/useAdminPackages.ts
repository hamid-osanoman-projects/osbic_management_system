import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Service } from './useAdminServices';

export interface PackageServiceRelation {
  id?: string;
  service_id: string;
  display_order: number;
  default_quantity: number;
  is_optional: boolean;
  is_parallel: boolean;
  estimated_days_min: number;
  estimated_days_max: number;
  notes: string;
  service: Service;
}

export interface ServicePackage {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  discount_percentage: number;
  is_active: boolean;
  services: PackageServiceRelation[];
  created_at: string;
}

export const useAdminPackages = () => {
  return useQuery({
    queryKey: ['admin', 'packages'],
    queryFn: async (): Promise<ServicePackage[]> => {
      const { data: packages, error } = await supabase
        .from('service_packages')
        .select(`
          *,
          package_services (
            service_id,
            display_order,
            default_quantity,
            is_optional,
            is_parallel,
            estimated_days_min,
            estimated_days_max,
            notes,
            services (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (packages || []).map((p: any) => ({
        ...p,
        services: (p.package_services || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((ps: any) => ({
            id: ps.id,
            service_id: ps.service_id,
            display_order: ps.display_order,
            default_quantity: ps.default_quantity || 1,
            is_optional: ps.is_optional || false,
            is_parallel: ps.is_parallel || false,
            estimated_days_min: ps.estimated_days_min || 0,
            estimated_days_max: ps.estimated_days_max || 0,
            notes: ps.notes || '',
            service: ps.services,
          }))
          .filter((ps: any) => !!ps.service)
      }));
    },
  });
};

export const useAdminPackage = (id?: string) => {
  return useQuery({
    queryKey: ['admin', 'package', id],
    enabled: !!id,
    queryFn: async (): Promise<ServicePackage> => {
      if (id === 'new' || !id) {
        return {
          id: '',
          name_en: '',
          name_ar: '',
          description_en: '',
          description_ar: '',
          icon: 'Package',
          discount_percentage: 0,
          is_active: true,
          services: [],
          created_at: new Date().toISOString()
        };
      }

      const { data: pkg, error } = await supabase
        .from('service_packages')
        .select(`
          *,
          package_services (
            service_id,
            display_order,
            default_quantity,
            is_optional,
            is_parallel,
            estimated_days_min,
            estimated_days_max,
            notes,
            services (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...pkg,
        services: (pkg.package_services || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((ps: any) => ({
            id: ps.id,
            service_id: ps.service_id,
            display_order: ps.display_order,
            default_quantity: ps.default_quantity || 1,
            is_optional: ps.is_optional || false,
            is_parallel: ps.is_parallel || false,
            estimated_days_min: ps.estimated_days_min || 0,
            estimated_days_max: ps.estimated_days_max || 0,
            notes: ps.notes || '',
            service: ps.services,
          }))
          .filter((ps: any) => !!ps.service)
      };
    },
  });
};

export const useSavePackage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (packageData: Partial<ServicePackage> & { services: any[] }) => {
      const { services: inputServices, id, ...rest } = packageData;
      
      // 1. Process services - create new ones if needed
      const finalServiceIds: string[] = [];
      
      for (const s of inputServices) {
        if (s.isNew) {
          // Create the custom service record
          const { data: newS, error: sErr } = await (supabase
            .from('services')
            .insert({
              name_en: s.name_en,
              name_ar: s.name_ar,
              category: s.category || 'other',
              icon: s.icon || 'Package',
              description_en: s.description_en || '',
              description_ar: s.description_ar || '',
              estimated_days: s.estimated_days || 7,
              is_active: false // Default to inactive for custom items
            } as any)
            .select()
            .single() as any);
          
          if (sErr) throw sErr;
          finalServiceIds.push(newS.id);
        } else {
          finalServiceIds.push(s.service_id || s.id);
        }
      }

      const packagePayload = {
        name_en: rest.name_en,
        name_ar: rest.name_ar,
        description_en: rest.description_en,
        description_ar: rest.description_ar,
        icon: rest.icon,
        discount_percentage: rest.discount_percentage,
        is_active: rest.is_active,
        updated_at: new Date().toISOString()
      };

      let currentPackageId = id;

      if (!currentPackageId) {
        const { data, error } = await (supabase
          .from('service_packages')
          .insert(packagePayload as any)
          .select()
          .single() as any);
        if (error) throw error;
        currentPackageId = data.id;
      } else {
        const { error } = await (supabase
          .from('service_packages')
          .update(packagePayload as any)
          .eq('id', currentPackageId) as any);
        if (error) throw error;
      }

      // Sync services
      await supabase
        .from('package_services')
        .delete()
        .eq('package_id', currentPackageId);

      if (finalServiceIds.length > 0) {
        const junctionPayload = finalServiceIds.map((sid, idx) => {
          const s = inputServices[idx];
          return {
            package_id: currentPackageId,
            service_id: sid,
            display_order: idx,
            default_quantity: s.default_quantity || 1,
            is_optional: s.is_optional || false,
            is_parallel: s.is_parallel || false,
            estimated_days_min: s.estimated_days_min || 0,
            estimated_days_max: s.estimated_days_max || 0,
            notes: s.notes || ''
          };
        });

        const { error: insError } = await supabase
          .from('package_services')
          .insert(junctionPayload as any);
        
        if (insError) throw insError;
      }

      return { id: currentPackageId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_packages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
    },
  });
};
