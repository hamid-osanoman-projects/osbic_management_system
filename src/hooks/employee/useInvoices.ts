import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoice_number?: string;
  client_id: string;
  job_id?: string | null;
  employee_id?: string;
  type: 'quotation' | 'invoice';
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled';
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  issue_date?: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  terms?: string;
  metadata?: any;
  items?: InvoiceItem[];
  client?: any;
  job?: any;
}

export const useInvoices = (clientId?: string) => {
  return useQuery({
    queryKey: ['invoices', clientId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:profiles!client_id(*),
          job:jobs!job_id(job_code, service:services(name_en)),
          items:invoice_items(*)
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    }
  });
};

export const useNextInvoiceNumber = () => {
  return useQuery({
    queryKey: ['next_invoice_number'],
    queryFn: async () => {
      const yearPrefix = `INV-${new Date().getFullYear()}-`;
      const { data, error } = await (supabase.from('invoices') as any)
        .select('invoice_number')
        .like('invoice_number', `${yearPrefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      let nextSeq = 1000; // Starting sequence
      if (data && data.invoice_number) {
        const parts = data.invoice_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }

      return `${yearPrefix}${nextSeq.toString().padStart(4, '0')}`;
    }
  });
};

export const useInvoice = (id?: string) => {
  return useQuery({
    queryKey: ['invoices', id],
    enabled: !!id && id !== 'new',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:profiles!client_id(*),
          job:jobs!job_id(job_code, service:services(name_en)),
          items:invoice_items(*)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Invoice;
    }
  });
};

export const useSaveInvoice = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      const { items, client, job, ...invoiceData } = invoice;

      invoiceData.employee_id = profile?.id;

      if (!invoiceData.job_id) invoiceData.job_id = null;
      if (!invoiceData.invoice_number) delete invoiceData.invoice_number;
      if (!invoiceData.issue_date) delete invoiceData.issue_date;

      let invoiceId = invoice.id;

      if (!invoiceId) {
        // Create new
        const { data, error } = await (supabase.from('invoices') as any)
          .insert([invoiceData])
          .select('id')
          .single();
        if (error) throw error;
        invoiceId = data.id;
      } else {
        // Update existing
        const { error } = await (supabase.from('invoices') as any)
          .update(invoiceData)
          .eq('id', invoiceId);
        if (error) throw error;
      }

      // Handle items
      if (items && invoiceId) {
        // Delete old items
        await (supabase.from('invoice_items') as any).delete().eq('invoice_id', invoiceId);

        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map(item => ({
            invoice_id: invoiceId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total
          }));
          const { error: itemsError } = await (supabase.from('invoice_items') as any).insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }
      }

      return invoiceId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

export const useUpdateInvoiceStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'paid') {
        updateData.paid_date = new Date().toISOString();
      }

      const { error } = await (supabase.from('invoices') as any)
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('invoices') as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
};
