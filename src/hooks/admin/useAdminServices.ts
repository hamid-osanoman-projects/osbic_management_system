import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

export interface WorkflowStep {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  required_docs: string[];
  estimated_hours: number;
  is_client_visible: boolean;
  is_blocking: boolean;
  order_index: number;
  estimated_gov_fee?: number;
}

export interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  category: string;
  icon: string;
  description_en: string;
  description_ar: string;
  estimated_days: number;
  work_fee: number;
  ministry_fee: number;
  expiry_months: number | null;
  is_active: boolean;
  active_jobs: number;
  steps_count: number;
  steps: WorkflowStep[];
}

export const useAdminServices = () => {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: async (): Promise<Service[]> => {
      const { data: services, error: sError } = await (supabase
        .from('services')
        .select('*, steps_count:workflow_steps(count)')
        .order('name_en', { ascending: true }) as any);

      if (sError) throw sError;

      const { data: jobStats, error: jError } = await (supabase
        .from('jobs')
        .select('service_id, status')
        .eq('status', 'active') as any);

      if (jError) throw jError;

      const statsMap = (jobStats || []).reduce((acc: Record<string, number>, job: any) => {
        acc[job.service_id] = (acc[job.service_id] || 0) + 1;
        return acc;
      }, {});

      return (services || []).map((s: any) => ({
        id: s.id,
        name_en: s.name_en,
        name_ar: s.name_ar,
        category: s.category || 'other',
        icon: s.icon || 'Building2',
        description_en: s.description_en || '',
        description_ar: s.description_ar || '',
        estimated_days: s.estimated_days || 7,
        work_fee: s.work_fee || 0,
        ministry_fee: s.ministry_fee || 0,
        expiry_months: null,
        is_active: s.is_active ?? true,
        active_jobs: statsMap[s.id] || 0,
        steps_count: s.steps_count?.[0]?.count || 0,
        steps: [],
      }));
    },
  });
};

export const useAdminService = (id?: string) => {
  return useQuery({
    queryKey: ['admin', 'service', id],
    enabled: !!id,
    queryFn: async (): Promise<Service> => {
      if (id === 'template' || !id) {
        return {
          id: '',
          name_en: '',
          name_ar: '',
          category: 'company_formation',
          icon: 'Building2',
          description_en: '',
          description_ar: '',
          estimated_days: 7,
          work_fee: 30,
          ministry_fee: 20,
          expiry_months: null,
          is_active: true,
          active_jobs: 0,
          steps_count: 0,
          steps: []
        };
      }

      const { data: service, error: sError } = await (supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single() as any);

      if (sError) throw sError;

      const { data: steps, error: stError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('service_id', id)
        .order('step_order', { ascending: true });

      if (stError) throw stError;

      return {
        id: service.id,
        name_en: service.name_en,
        name_ar: service.name_ar,
        category: service.category,
        icon: service.icon || 'Building2',
        description_en: service.description_en || '',
        description_ar: service.description_ar || '',
        estimated_days: service.estimated_days || 7,
        work_fee: service.work_fee || 0,
        ministry_fee: service.ministry_fee || 0,
        expiry_months: null,
        is_active: service.is_active,
        active_jobs: 0,
        steps_count: steps?.length || 0,
        steps: (steps || []).map((st: any) => ({
          id: st.id,
          name_en: st.name_en,
          name_ar: st.name_ar,
          description_en: st.description_en || '',
          description_ar: st.description_ar || '',
          required_docs: st.required_documents || [],
          estimated_hours: st.estimated_hours || 0,
          is_client_visible: st.is_client_visible,
          is_blocking: st.is_blocking,
          order_index: st.step_order,
          estimated_gov_fee: st.estimated_gov_fee || 0,
        })),
      };
    },
  });
};

export const useSaveService = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (serviceData: Service) => {
      const { steps, id } = serviceData;
      
      const servicePayload = {
        name_en: serviceData.name_en,
        name_ar: serviceData.name_ar,
        description_en: serviceData.description_en,
        description_ar: serviceData.description_ar,
        category: serviceData.category as any,
        icon: serviceData.icon,
        estimated_days: serviceData.estimated_days,
        work_fee: serviceData.work_fee,
        ministry_fee: serviceData.ministry_fee,
        is_active: serviceData.is_active,
      };

      let currentServiceId = id;

      if (!currentServiceId) {
        const { data, error } = await (supabase
          .from('services')
          .insert(servicePayload as any)
          .select()
          .single() as any);
        if (error) throw error;
        currentServiceId = data.id;
      } else {
        const { error } = await (supabase
          .from('services')
          .update(servicePayload as any)
          .eq('id', currentServiceId) as any);
        if (error) throw error;
      }

      // Step synchronization
      await supabase
        .from('workflow_steps')
        .delete()
        .eq('service_id', currentServiceId);

      if (steps.length > 0) {
        const stepsPayload = steps.map((st, index) => ({
          service_id: currentServiceId,
          step_order: st.order_index ?? index,
          name_en: st.name_en,
          name_ar: st.name_ar,
          description_en: st.description_en,
          description_ar: st.description_ar,
          required_documents: st.required_docs,
          is_client_visible: st.is_client_visible,
          is_blocking: st.is_blocking,
          estimated_hours: st.estimated_hours,
          estimated_gov_fee: st.estimated_gov_fee || 0,
        }));

        const { error: insError } = await supabase
          .from('workflow_steps')
          .insert(stepsPayload as any);
        
        if (insError) throw insError;
      }

      return { ...serviceData, id: currentServiceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'service', data.id] });
    },
  });
};

export const useToggleServiceActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase
        .from('services')
        .update({ is_active } as any)
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Check for any existing jobs (active or historical)
      const { data: existingJobs, error: jError } = await supabase
        .from('jobs')
        .select('id')
        .eq('service_id', id)
        .limit(1);
      
      if (jError) throw jError;
      if (existingJobs && existingJobs.length > 0) {
        throw new Error('This service cannot be deleted because it is linked to existing jobs. Please mark it as inactive instead.');
      }

      // 2. Clear out any lightweight dependencies (leads, packages)
      await supabase.from('service_interests').delete().eq('service_id', id);
      await supabase.from('package_services').delete().eq('service_id', id);

      // 3. Delete workflow steps (dependency)
      const { error: stError } = await supabase
        .from('workflow_steps')
        .delete()
        .eq('service_id', id);
      if (stError) throw stError;

      // 4. Delete service
      const { error: sError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      if (sError) throw sError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
  });
};
