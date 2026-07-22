-- Migration: Add Client Feedback and Rating to Jobs
-- Run this in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- Enable public/authenticated profiles to update their own job feedback
-- (This satisfies standard client feedback operations)
DROP POLICY IF EXISTS "Clients can update feedback on their own jobs" ON public.jobs;

CREATE POLICY "Clients can update feedback on their own jobs" ON public.jobs
  FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());
