-- Make client_id column nullable in public.invoices
ALTER TABLE public.invoices ALTER COLUMN client_id DROP NOT NULL;

-- Add lead_id referencing public.leads
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
