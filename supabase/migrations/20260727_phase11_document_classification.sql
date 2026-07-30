-- =============================================================================
-- Migration: Phase 11 — Document Classification and Indexes
-- =============================================================================

-- 1. Set default category for existing records
UPDATE public.job_service_documents
SET document_category = 'input'
WHERE document_category IS NULL;

-- 2. Set default constraint and check constraint
ALTER TABLE public.job_service_documents
  ALTER COLUMN document_category SET DEFAULT 'input';

ALTER TABLE public.job_service_documents
  DROP CONSTRAINT IF EXISTS chk_job_service_docs_category;

ALTER TABLE public.job_service_documents
  ADD CONSTRAINT chk_job_service_docs_category
  CHECK (document_category IN ('input', 'output'));

-- 3. Add indexing for optimized query performance
CREATE INDEX IF NOT EXISTS idx_job_service_docs_category
  ON public.job_service_documents(job_service_id, document_category);
