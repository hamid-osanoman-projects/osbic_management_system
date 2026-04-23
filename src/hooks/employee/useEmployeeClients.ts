import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateSecurePassword, generateUsername } from '../../lib/credentialUtils';

// We can reuse the utils logic but client code is CLT
export const generateClientCode = (sequence: number): string => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `CLT-${yy}${mm}${String(sequence).padStart(3, '0')}`;
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientData: any) => {
      // Simulate API call to create client and auth user
      console.log('Creating client record:', clientData);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const username = generateUsername(clientData.fullNameEn);
      const password = generateSecurePassword();
      const code = generateClientCode(Math.floor(Math.random() * 999));
      
      return { 
        ...clientData, 
        id: Math.random().toString(), 
        client_code: code,
        username,
        password
      };
    },
    onSuccess: () => {
      // In a real app we'd target employee client lists
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] }); 
    },
  });
};
