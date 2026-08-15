-- ─── Branch Management Migration ──────────────────────────────────────────────
-- Phase 1: Create branches table, add branch_id to profiles & jobs,
--          seed "OSBIC Ghala" as main branch, and migrate all existing records.

-- 1. Create branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  code      TEXT NOT NULL,
  address   TEXT,
  phone     TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT branches_code_unique UNIQUE (code)
);

-- RLS on branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branches viewable by all authenticated users" ON public.branches;
CREATE POLICY "Branches viewable by all authenticated users"
  ON public.branches FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can manage branches" ON public.branches;
CREATE POLICY "Only admins can manage branches"
  ON public.branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Seed the main branch: OSBIC Ghala
INSERT INTO public.branches (name, code, address, phone)
VALUES ('OSBIC Ghala', 'GHL', 'Ghala Industrial Area, Muscat, Oman', NULL)
ON CONFLICT (code) DO NOTHING;

-- 3. Add branch_id column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 4. Add branch_id column to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 5. Migrate all existing employee/client profiles to OSBIC Ghala
UPDATE public.profiles
SET branch_id = (SELECT id FROM public.branches WHERE code = 'GHL' LIMIT 1)
WHERE branch_id IS NULL
  AND role IN ('employee', 'client');

-- 6. Migrate all existing jobs to OSBIC Ghala
UPDATE public.jobs
SET branch_id = (SELECT id FROM public.branches WHERE code = 'GHL' LIMIT 1)
WHERE branch_id IS NULL;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_branch_id ON public.jobs(branch_id);
