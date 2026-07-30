import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface QuotationConversionData {
  quotationId: string;
  clientId: string;
  leadId?: string | null;
  salesEmployeeId?: string | null;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  assignments: {
    serviceId: string;
    serviceName: string;
    opsEmployeeId: string;
  }[];
}

export const useConvertQuotation = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: QuotationConversionData) => {
      const { quotationId, clientId, leadId, salesEmployeeId, totalAmount, subtotal, taxAmount, assignments } = data;

      // 1. Generate unique Job code
      const yearPrefix = `JOB-${new Date().getFullYear()}-`;
      const { data: latestJob } = await supabase
        .from('jobs')
        .select('job_code')
        .like('job_code', `${yearPrefix}%`)
        .order('job_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextJobSeq = 1;
      if (latestJob && latestJob.job_code) {
        const parts = latestJob.job_code.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) nextJobSeq = lastSeq + 1;
      }
      const job_code = `${yearPrefix}${nextJobSeq.toString().padStart(4, '0')}`;

      // 2. Insert master Client Job
      const { data: newJob, error: jobErr } = await supabase
        .from('jobs')
        .insert([{
          job_code,
          quotation_id: quotationId,
          lead_id: leadId || null,
          client_id: clientId,
          employee_id: assignments[0]?.opsEmployeeId || profile?.id || salesEmployeeId || '',
          sales_employee_id: salesEmployeeId || null,
          ops_employee_id: assignments[0]?.opsEmployeeId || null,
          service_id: assignments[0]?.serviceId || null,
          status: 'active',
          total_fee: totalAmount,
          work_fee: subtotal,
          ministry_fee: taxAmount,
          advance_percentage: 100,
          started_at: new Date().toISOString(),
          entry_type: leadId ? 'lead' : 'direct'
        }])
        .select()
        .single();

      if (jobErr) throw jobErr;

      // 3. Insert individual Job Services (pending coworker acceptance)
      const jobServicesRows = assignments.map((asg, idx) => ({
        job_id: newJob.id,
        service_id: asg.serviceId,
        service_name: asg.serviceName,
        display_order: idx + 1,
        quantity: 1,
        ops_employee_id: asg.opsEmployeeId,
        assigned_by: profile?.id || null,
        assigned_at: new Date().toISOString(),
        status: 'pending',
        acceptance_status: 'accepted'
      }));

      const { error: servicesErr } = await supabase
        .from('job_services')
        .insert(jobServicesRows as any);

      if (servicesErr) throw servicesErr;

      // 4. Create workflow steps roadmap inside job_steps
      const serviceIds = assignments.map(a => a.serviceId).filter(Boolean);
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
            job_id: newJob.id,
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
            .eq('id', newJob.id);
        }
      }

      // 5. Set quotation status to accepted
      const { error: quoteErr } = await supabase
        .from('invoices')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          converted_job_ids: [newJob.id]
        })
        .eq('id', quotationId);

      if (quoteErr) throw quoteErr;

      // 6. Set associated Lead to converted (if applicable)
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            status: 'converted',
            converted_at: new Date().toISOString(),
            converted_job_id: newJob.id
          })
          .eq('id', leadId);
      }

      return newJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
};
