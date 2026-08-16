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
      const { data, error } = await (supabase
        .from('service_packages')
        .select(`
          *,
          package_services (
            services (*)
          )
        `)
        .eq('is_active', true) as any);

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
      // 1. Get package details along with service metadata
      const { data: pkg, error: pError } = await (supabase
        .from('service_packages')
        .select(`
          *,
          package_services (
            services (*)
          )
        `)
        .eq('id', packageId)
        .single() as any);
      
      if (pError) throw pError;
      
      const pkgAny = pkg as any;

      const services = (pkgAny?.package_services || [])
        .map((ps: any) => ps.services)
        .filter(Boolean);

      if (services.length === 0) {
        throw new Error("No services found inside the requested package");
      }

      // Calculate bundle fees
      const discount = Number(pkgAny?.discount_percentage) || 0;
      const discountFactor = 1 - (discount / 100);

      let totalWorkFee = 0;
      let totalMinistryFee = 0;
      
      services.forEach((s: any) => {
        totalWorkFee += (Number(s.work_fee) || 0);
        totalMinistryFee += (Number(s.ministry_fee) || 0);
      });

      const discountedWorkFee = Math.round(totalWorkFee * discountFactor);
      const totalFee = discountedWorkFee + totalMinistryFee;
      const advanceAmount = (totalFee * 50) / 100;
      const remainingAmount = totalFee - advanceAmount;

      // 2. Create the Single Master Job
      const jobCode = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      const { data: job, error: jError } = await supabase
        .from('jobs')
        .insert({
          job_code: jobCode,
          client_id: clientId,
          service_id: services[0]?.id || null,
          custom_name: pkgAny?.name_en, // Name of the package
          total_fee: totalFee,
          work_fee: discountedWorkFee,
          ministry_fee: totalMinistryFee,
          advance_amount: advanceAmount,
          remaining_amount: remainingAmount,
          status: 'pending',
          advance_paid: false,
          remaining_paid: false,
          notes: `Requested Package Bundle: ${pkgAny?.name_en}`,
          started_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (jError) throw jError;

      // 3. Create job_services rows
      const jobServicesRows = services.map((s: any, idx: number) => ({
        job_id: job.id,
        service_id: s.id,
        service_name: s.name_en,
        display_order: idx + 1,
        quantity: 1,
        status: 'pending',
        work_fee: s.work_fee || 0,
        ministry_fee: s.ministry_fee || 0,
        total_fee: (s.work_fee || 0) + (s.ministry_fee || 0),
        assigned_at: new Date().toISOString()
      }));

      const { error: jsError } = await supabase
        .from('job_services')
        .insert(jobServicesRows as any);

      if (jsError) throw jsError;

      // 4. Create workflow steps roadmap inside job_steps
      const serviceIds = services.map((s: any) => s.id);
      const { data: blueprints } = await supabase
        .from('workflow_steps')
        .select('*')
        .in('service_id', serviceIds)
        .order('service_id', { ascending: true })
        .order('step_order', { ascending: true });

      if (blueprints && blueprints.length > 0) {
        const stepsToInsert = blueprints.map((step: any) => {
          let deadline = null;
          if (step.estimated_hours) {
            const date = new Date();
            date.setHours(date.getHours() + step.estimated_hours);
            deadline = date.toISOString();
          }

          return {
            job_id: job.id,
            workflow_step_id: step.id,
            status: 'pending',
            started_at: null,
            completed_at: null,
            is_client_visible: step.is_client_visible ?? true,
            deadline: deadline
          };
        });

        const { data: insertedSteps, error: stepsErr } = await supabase
          .from('job_steps')
          .insert(stepsToInsert as any)
          .select();

        if (stepsErr) throw stepsErr;

        // Sync first pending step to current_step_id
        const firstActive = insertedSteps.find((s: any) => s.status === 'pending');
        if (firstActive) {
          await supabase
            .from('jobs')
            .update({ current_step_id: firstActive.id })
            .eq('id', job.id);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'jobs'] });
    }
  });
};
