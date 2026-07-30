-- Add interested_services JSONB column to public.leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS interested_services JSONB DEFAULT '[]'::jsonb;
