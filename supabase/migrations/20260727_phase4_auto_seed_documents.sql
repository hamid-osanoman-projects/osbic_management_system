-- =============================================================================
-- Migration: Phase 4 — Auto-seed Document Checklist + Document Upload Support
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ─── 1. Trigger Function to Seed Documents per Job Service Applicant ───────
CREATE OR REPLACE FUNCTION public.seed_job_service_documents_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a row into job_service_documents for each requirement in the catalog
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. Create the Trigger ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_seed_job_service_documents ON public.job_services;
CREATE TRIGGER trg_seed_job_service_documents
  AFTER INSERT ON public.job_services
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_job_service_documents_trigger();
