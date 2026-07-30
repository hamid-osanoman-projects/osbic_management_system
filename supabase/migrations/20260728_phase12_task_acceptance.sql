-- =============================================================================
-- Migration: Phase 12 — Task Acceptance status and tracking
-- =============================================================================

-- 1. Add columns to job_services
ALTER TABLE public.job_services
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT 
    CHECK (acceptance_status IN ('pending_acceptance', 'accepted', 'declined', 'auto_accepted')) 
    DEFAULT 'accepted';

ALTER TABLE public.job_services
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- 2. Update existing rows to accepted state
UPDATE public.job_services
SET acceptance_status = 'accepted'
WHERE acceptance_status IS NULL;
