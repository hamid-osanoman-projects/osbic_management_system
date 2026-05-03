import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface SystemSettings {
  id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_logo_url: string | null;
}

export const useAdminSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system', 'settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await db
        .from('system_settings')
        .select('*')
        .eq('id', 'global')
        .single();
      
      if (error) {
        console.error('Error fetching settings:', error);
        // Return defaults if table or row not found (fallback)
        return {
          id: 'global',
          company_name: 'OSBIC OS',
          company_email: 'operations@osbic.com',
          company_phone: '+968 9000 0000',
          company_address: 'Muscat, Oman',
          company_logo_url: null
        };
      }
      return data;
    },
    // Keep data fresh
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      const { data, error } = await db
        .from('system_settings')
        .update(updates)
        .eq('id', 'global')
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      // 1. Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName; // We are already in the 'branding' bucket context if using from('branding')

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      // 3. Update database
      return updateSettings.mutateAsync({ company_logo_url: publicUrl });
    },
  });

  return {
    settings: query.data,
    logo: query.data?.company_logo_url,
    isLoading: query.isLoading,
    updateSettings,
    uploadLogo,
  };
};
