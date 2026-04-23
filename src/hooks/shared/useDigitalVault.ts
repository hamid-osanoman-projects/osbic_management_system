import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface VaultDocument {
  id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  expiry_date: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export const useDigitalVault = (clientId?: string) => {
  return useQuery({
    queryKey: ['client', 'vault', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<VaultDocument[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          document_type,
          file_path,
          file_name,
          expiry_date,
          status
        `)
        // This is a bit tricky: documents are linked to jobs, so we need to join or filter
        // Actually, documents record 'uploaded_by' but we need docs FOR a client
        // Let's check jobs for this client first
        .in('job_id', (
          await supabase
            .from('jobs')
            .select('id')
            .eq('client_id', clientId!)
        ).data?.map(j => j.id) || [])
        .eq('status', 'approved')
        .gt('expiry_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Deduplicate by document_type (keep latest)
      const uniqueDocs: Record<string, VaultDocument> = {};
      (data || []).forEach(doc => {
        if (!uniqueDocs[doc.document_type]) {
          uniqueDocs[doc.document_type] = doc as VaultDocument;
        }
      });

      return Object.values(uniqueDocs);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
