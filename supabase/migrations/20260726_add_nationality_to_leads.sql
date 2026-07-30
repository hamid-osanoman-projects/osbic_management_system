-- Add nationality column to public.leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nationality TEXT;
