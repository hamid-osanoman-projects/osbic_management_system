-- Migration: Add client_pays_ministry_fee flag to jobs table
-- Run this once in the Supabase SQL Editor before deploying

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS client_pays_ministry_fee BOOLEAN NOT NULL DEFAULT FALSE;

-- Add a comment for documentation
COMMENT ON COLUMN public.jobs.client_pays_ministry_fee IS 
  'When TRUE the client is paying the ministry fee directly via their own card. This bypasses the fund allocation lock and Accounts only needs to verify the service charge.';
