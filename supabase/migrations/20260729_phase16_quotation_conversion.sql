-- SQL Migration to link Quotations (invoices table) and Client Jobs
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS converted_job_ids UUID[],
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
