import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const db = supabase as any;

export interface ClientActionRequest {
  id: string;
  client_id: string;
  client_name: string;
  requested_by_id: string;
  requested_by_name: string;
  reason: string;
  type: 'DELETE' | 'ARCHIVE';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const useClientRequests = () => {
  const queryClient = useQueryClient();

  // ─── List Requests (Admin) ────────────────────────────────────────────────
  const useRequestsList = () => {
    return useQuery({
      queryKey: ['admin', 'client-requests'],
      queryFn: async (): Promise<ClientActionRequest[]> => {
        const { data, error } = await db
          .from('employee_requests')
          .select(`
            id,
            client_id:job_id,
            description,
            status,
            created_at,
            employee:profiles!employee_requests_employee_id_fkey(full_name)
          `)
          .eq('type', 'other')
          .or('description.ilike.DELETION_REQUEST:%,description.ilike.ARCHIVE_REQUEST:%')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((r: any) => {
          const isArchive = r.description.startsWith('ARCHIVE_REQUEST');
          return {
            id: r.id,
            client_id: r.client_id,
            client_name: r.description.split('::')[1] || 'Unknown Client',
            requested_by_id: r.employee_id,
            requested_by_name: r.employee?.full_name ?? 'Unknown',
            reason: r.description.split('::')[2] || r.description,
            type: isArchive ? 'ARCHIVE' : 'DELETE',
            status: r.status,
            created_at: r.created_at,
          };
        });
      },
      refetchInterval: 10000, // Poll every 10s for live updates
    });
  };

  // ─── Create Request (Employee) ────────────────────────────────────────────
  const useCreateRequest = () => {
    return useMutation({
      mutationFn: async (payload: {
        clientId: string;
        clientName: string;
        employeeId: string;
        reason: string;
        type: 'DELETE' | 'ARCHIVE';
      }) => {
        const prefix = payload.type === 'DELETE' ? 'DELETION_REQUEST' : 'ARCHIVE_REQUEST';
        const description = `${prefix}::${payload.clientName}::${payload.reason}`;

        // 1. Clean Insert (Constraints have been removed via SQL)
        const { data: request, error: insertError } = await db
          .from('employee_requests')
          .insert({
            employee_id: payload.employeeId,
            job_id: payload.clientId as any, 
            type: 'other',
            description,
            status: 'pending'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // 2. DISCOVER REAL ADMINS
        const { data: admins } = await db
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        // 3. Notify ALL administrators
        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            recipient_id: admin.id,
            sender_id: payload.employeeId,
            type: 'action_required',
            action_required: true,
            action_url: `request://${request.id}|${payload.clientId}|${payload.type}`,
            title_en: payload.type === 'DELETE' ? 'Client Deletion Request' : 'Client Deactivation Request',
            title_ar: payload.type === 'DELETE' ? 'طلب حذف عميل' : 'طلب إلغاء تفعيل عميل',
            body_en: `Employee requested ${payload.type.toLowerCase()} of ${payload.clientName}: "${payload.reason}"`,
            body_ar: `طلب الموظف ${payload.type === 'DELETE' ? 'حذف' : 'إلغاء تفعيل'} العميل ${payload.clientName}: "${payload.reason}"`,
          }));

          await db.from('notifications').insert(notifications as any);
        }

        return request;
      },
      onSuccess: (_, variables) => {
        const action = variables.type === 'DELETE' ? 'deletion' : 'deactivation';
        toast.success(`Client ${action} request sent to admin for approval.`, {
          duration: 5000,
          icon: '✉️'
        });
        queryClient.invalidateQueries({ queryKey: ['admin', 'client-requests'] });
      },
    });
  };

  // ─── Resolve Request (Admin) ──────────────────────────────────────────────
  const useResolveRequest = () => {
    return useMutation({
      mutationFn: async (payload: {
        requestId: string;
        clientId: string;
        action: 'approve' | 'reject';
        type: 'DELETE' | 'ARCHIVE';
        adminId: string;
      }) => {
        const { error: resolveError } = await db
          .from('employee_requests')
          .update({
            status: payload.action === 'approve' ? 'approved' : 'rejected',
            reviewed_by: payload.adminId,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', payload.requestId);

        if (resolveError) throw resolveError;

        if (payload.action === 'approve') {
          // Perform ACTUAL removal or status update
          if (payload.type === 'DELETE') {
            const { error: deleteError } = await db
              .from('profiles')
              .delete()
              .eq('id', payload.clientId);
            if (deleteError) throw deleteError;
          } else {
            const { error: archiveError } = await db
              .from('profiles')
              .update({ 
                is_active: false,
                status: 'archived' 
              } as any)
              .eq('id', payload.clientId);
            if (archiveError) throw archiveError;
          }
          
          toast.success(`Client successfully ${payload.type === 'DELETE' ? 'removed from system' : 'archived'}.`);
        } else {
          toast(`Request rejected. Client remains unchanged.`, { icon: 'ℹ️' });
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['shared', 'clients'] });
      },
    });
  };

  return { useRequestsList, useCreateRequest, useResolveRequest };
};
