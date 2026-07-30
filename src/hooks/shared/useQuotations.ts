import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface Quotation {
  id: string;
  quotation_number?: string;
  lead_id?: string;
  client_id?: string;
  created_by?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  notes?: string;
  terms?: string;
  subtotal: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  total_amount: number;
  advance_percentage: number;
  advance_amount?: number;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  converted_job_ids?: string[];
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  service_id?: string;
  package_id?: string;
  description: string;
  quantity: number;
  work_fee: number;
  ministry_fee: number;
  unit_price: number;
  total: number;
  display_order: number;
}

export interface PackageJobGroup {
  id: string;
  group_code: string;
  quotation_id: string;
  client_id: string;
  package_id?: string;
  sales_employee_id: string;
  status: string;
  created_at: string;
}

export const useQuotations = () => {
  const useQuotationDetail = (id?: string) => {
    return useQuery({
      queryKey: ['quotation', id],
      enabled: !!id,
      queryFn: async (): Promise<Quotation> => {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, items:quotation_items(*)')
          .eq('id', id!)
          .single();

        if (error) throw error;
        return data as Quotation;
      }
    });
  };

  const useConvertQuotation = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (quotationId: string) => {
        // 1. Fetch quotation and items
        const { data: quotation, error: qError } = await supabase
          .from('quotations')
          .select('*, items:quotation_items(*)')
          .eq('id', quotationId)
          .single();

        if (qError) throw qError;
        if (!quotation) throw new Error('Quotation not found');
        if (quotation.status === 'accepted') throw new Error('Quotation already converted to jobs');

        const items = quotation.items || [];
        if (items.length === 0) throw new Error('Quotation has no line items');

        const client_id = quotation.client_id;
        const sales_employee_id = quotation.created_by;
        const lead_id = quotation.lead_id;

        let packageGroupId: string | null = null;
        let groupCode: string | null = null;

        // 2. If multiple items, create package_job_groups record
        if (items.length > 1) {
          const yearPrefix = `PKG-JOB-${new Date().getFullYear()}-`;
          const { data: latestGroup } = await supabase
            .from('package_job_groups')
            .select('group_code')
            .like('group_code', `${yearPrefix}%`)
            .order('group_code', { ascending: false })
            .limit(1)
            .maybeSingle();

          let nextSeq = 1;
          if (latestGroup && latestGroup.group_code) {
            const parts = latestGroup.group_code.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
          }
          groupCode = `${yearPrefix}${nextSeq.toString().padStart(4, '0')}`;

          // Find package_id from the first item if applicable
          const package_id = items.find((i: any) => i.package_id)?.package_id || null;

          const { data: newGroup, error: groupError } = await supabase
            .from('package_job_groups')
            .insert([{
              group_code: groupCode,
              quotation_id: quotationId,
              client_id,
              package_id,
              sales_employee_id,
              status: 'active'
            }])
            .select()
            .single();

          if (groupError) throw groupError;
          packageGroupId = newGroup.id;
        }

        // 3. Create one job per service line item
        const jobIds: string[] = [];
        for (const item of items) {
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

          const { data: newJob, error: jobError } = await supabase
            .from('jobs')
            .insert([{
              job_code,
              quotation_id: quotationId,
              lead_id,
              client_id,
              sales_employee_id,
              ops_employee_id: null,
              service_id: item.service_id || null,
              package_id: item.package_id || null,
              package_group_id: packageGroupId,
              status: 'draft',
              total_fee: item.total,
              work_fee: item.work_fee,
              ministry_fee: item.ministry_fee,
              advance_percentage: quotation.advance_percentage,
              advance_amount: quotation.advance_amount,
              remaining_amount: item.total - (quotation.advance_amount ? (quotation.advance_amount / items.length) : 0),
              started_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (jobError) throw jobError;
          jobIds.push(newJob.id);
        }

        // 4. Update quotation to 'accepted' and store job ids
        const { error: updateQError } = await supabase
          .from('quotations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            converted_job_ids: jobIds
          })
          .eq('id', quotationId);

        if (updateQError) throw updateQError;

        // 5. Update linked lead status if applicable
        if (lead_id) {
          await supabase
            .from('leads')
            .update({
              status: 'converted',
              converted_at: new Date().toISOString(),
              converted_job_id: jobIds[0]
            })
            .eq('id', lead_id);
        }

        return {
          packageGroupId,
          jobIds
        };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['quotation'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }
    });
  };

  return {
    useQuotationDetail,
    useConvertQuotation
  };
};
