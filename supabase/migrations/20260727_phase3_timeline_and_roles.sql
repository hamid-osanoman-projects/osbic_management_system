-- =============================================================================
-- Migration: Phase 3 — Timeline Tracking + Role Fields + Deadline Support
-- Run this in Supabase SQL Editor after: 20260726_restructured_job_services.sql
-- =============================================================================

-- ─── 1. Add is_pro flag to profiles ─────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

-- ─── 2. Add deadline + delay tracking fields to job_services ────────────────
ALTER TABLE public.job_services
  ADD COLUMN IF NOT EXISTS estimated_days INTEGER,
  ADD COLUMN IF NOT EXISTS target_completion_date DATE,
  ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS delay_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delay_updated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'direct' 
    CHECK (entry_type IN ('direct', 'lead', 'walkin', 'renewal'));

-- ─── 3. Create job_service_timeline (status history) ────────────────────────
CREATE TABLE IF NOT EXISTS public.job_service_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which item this belongs to
  job_service_id UUID NOT NULL REFERENCES public.job_services(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Status transition
  from_status TEXT,
  to_status TEXT NOT NULL,

  -- Who changed it
  changed_by UUID REFERENCES public.profiles(id),
  changed_by_name TEXT,              -- snapshot of name at time of change
  changed_by_role TEXT CHECK (changed_by_role IN ('ops', 'pro', 'sales', 'admin', 'manager')),

  -- Time tracking
  days_in_previous_stage NUMERIC(8,2), -- auto-calculated days spent in from_status
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  reason TEXT,                        -- delay reason / rejection reason / note
  government_ref TEXT,                -- captured if gov_approved/rejected
  is_delay_event BOOLEAN DEFAULT false,
  is_client_caused BOOLEAN DEFAULT false  -- flag if delay was client's fault
);

-- ─── 4. Indexes for performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_service_timeline_job_service_id
  ON public.job_service_timeline(job_service_id);

CREATE INDEX IF NOT EXISTS idx_job_service_timeline_job_id
  ON public.job_service_timeline(job_id);

CREATE INDEX IF NOT EXISTS idx_job_service_timeline_changed_by
  ON public.job_service_timeline(changed_by);

CREATE INDEX IF NOT EXISTS idx_job_service_timeline_changed_at
  ON public.job_service_timeline(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_services_ops_employee
  ON public.job_services(ops_employee_id);

CREATE INDEX IF NOT EXISTS idx_job_services_pro_id
  ON public.job_services(pro_id);

CREATE INDEX IF NOT EXISTS idx_job_services_status
  ON public.job_services(status);

-- ─── 5. RLS Policies ─────────────────────────────────────────────────────────
ALTER TABLE public.job_service_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Timeline viewable by authenticated users" ON public.job_service_timeline;
CREATE POLICY "Timeline viewable by authenticated users"
  ON public.job_service_timeline FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Timeline insertable by authenticated users" ON public.job_service_timeline;
CREATE POLICY "Timeline insertable by authenticated users"
  ON public.job_service_timeline FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── 6. Helper function: auto-calculate deadline from service estimated_days ──
-- Called by application code when assigning a job_service to an ops employee.
-- Returns the target completion date: assigned_at + estimated_days working days.
CREATE OR REPLACE FUNCTION public.calculate_target_date(
  start_date DATE,
  days INTEGER
) RETURNS DATE AS $$
BEGIN
  -- Simple calendar days (not working days — can upgrade to business days later)
  RETURN start_date + (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
