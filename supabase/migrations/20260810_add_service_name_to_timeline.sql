-- Add service_name snapshot column to job_service_timeline
-- This stores a human-readable name of the service at the time of the status change
-- so the Execution Timeline can display "which service" changed without a join.

ALTER TABLE public.job_service_timeline
  ADD COLUMN IF NOT EXISTS service_name TEXT;

COMMENT ON COLUMN public.job_service_timeline.service_name IS 
  'Snapshot of the service name at the time of the status change, for display in the Execution Timeline.';
