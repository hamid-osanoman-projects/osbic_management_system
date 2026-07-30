-- =============================================================================
-- Migration: Phase 9 — Auto-seed Steps and Documents per Job Service Applicant
-- Run this in Supabase SQL Editor
-- =============================================================================

-- Drop the old document-only trigger
DROP TRIGGER IF EXISTS trg_seed_job_service_documents ON public.job_services;
DROP FUNCTION IF EXISTS public.seed_job_service_documents_trigger();

-- ─── 1. Create Unified Seeder Trigger Function ────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_job_service_details_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Auto-seed required documents checklist from catalog service requirements
  INSERT INTO public.job_service_documents (
    job_service_id,
    job_id,
    document_name,
    status,
    is_client_visible,
    notes
  )
  SELECT 
    NEW.id,
    NEW.job_id,
    r.document_name,
    'pending',
    COALESCE(r.is_client_upload, false),
    r.notes
  FROM public.service_document_requirements r
  WHERE r.service_id = NEW.service_id;

  -- 2. Auto-seed required steps checklist from catalog service workflow steps
  INSERT INTO public.job_service_steps (
    job_service_id,
    step_name,
    step_name_ar,
    display_order,
    status,
    is_client_visible,
    estimated_days_min,
    estimated_days_max
  )
  SELECT
    NEW.id,
    w.name_en,
    w.name_ar,
    w.step_order,
    'pending',
    COALESCE(w.is_client_visible, true),
    0,
    CASE WHEN w.estimated_hours IS NOT NULL THEN CEIL(w.estimated_hours::numeric / 24.0)::integer ELSE NULL END
  FROM public.workflow_steps w
  WHERE w.service_id = NEW.service_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Create the Trigger ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_seed_job_service_details ON public.job_services;
CREATE TRIGGER trg_seed_job_service_details
  AFTER INSERT ON public.job_services
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_job_service_details_trigger();
