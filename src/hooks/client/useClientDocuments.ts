import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface ClientDocument {
  id: string;
  job_id: string;
  job_code: string;
  service_name_en: string;
  service_name_ar: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  document_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  expiry_date: string | null;
  created_at: string;
}

export const useClientDocuments = (clientId?: string) => {
  return useQuery({
    queryKey: ['client', 'documents', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientDocument[]> => {
      if (!clientId) return [];

      // 1. Fetch jobs associated with this client to match documents
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_code,
          service:services(name_en, name_ar)
        `)
        .eq('client_id', clientId);

      if (jobsError) throw jobsError;
      if (!jobsData || jobsData.length === 0) return [];

      const jobIds = jobsData.map(j => j.id);
      const jobMap = new Map(jobsData.map(j => [j.id, j]));

      // 2. Fetch documents uploaded to these jobs that are visible to the client
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .in('job_id', jobIds)
        .eq('is_client_visible', true)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      return (docsData || []).map((d: any) => {
        const job = jobMap.get(d.job_id);
        return {
          id: d.id,
          job_id: d.job_id,
          job_code: job?.job_code || 'N/A',
          service_name_en: (job?.service as any)?.name_en || 'Unknown Service',
          service_name_ar: (job?.service as any)?.name_ar || 'خدمة غير معروفة',
          file_name: d.file_name,
          file_path: d.file_path,
          file_size: d.file_size,
          file_type: d.file_type,
          document_type: d.document_type,
          status: d.status || 'pending',
          rejection_reason: d.rejection_reason,
          expiry_date: d.expiry_date,
          created_at: d.created_at,
        };
      });
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};
