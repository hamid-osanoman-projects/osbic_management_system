-- ==============================================================================
-- SQL Recovery Script: Recreate Deleted Catalog Tables
-- Run this in your Supabase Dashboard SQL Editor to restore schema & policies.
-- ==============================================================================

-- 1. RECREATE public.workflow_steps TABLE
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  required_documents TEXT[],
  is_client_visible BOOLEAN DEFAULT true,
  is_blocking BOOLEAN DEFAULT true,
  estimated_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on workflow_steps
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_steps
DROP POLICY IF EXISTS "workflow_steps viewable by authenticated users" ON public.workflow_steps;
CREATE POLICY "workflow_steps viewable by authenticated users" ON public.workflow_steps
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage workflow steps" ON public.workflow_steps;
CREATE POLICY "Admins can manage workflow steps" ON public.workflow_steps
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


-- 2. RECREATE public.service_document_requirements TABLE
CREATE TABLE IF NOT EXISTS public.service_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_name_ar TEXT,
  is_required BOOLEAN DEFAULT true,
  is_client_upload BOOLEAN DEFAULT true,
  is_employee_upload BOOLEAN DEFAULT true,
  notes TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on service_document_requirements
ALTER TABLE public.service_document_requirements ENABLE ROW LEVEL SECURITY;

-- Policies for service_document_requirements
DROP POLICY IF EXISTS "Document templates are viewable by authenticated users" ON public.service_document_requirements;
CREATE POLICY "Document templates are viewable by authenticated users" ON public.service_document_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage document templates" ON public.service_document_requirements;
CREATE POLICY "Admins can manage document templates" ON public.service_document_requirements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Re-index for speed
CREATE INDEX IF NOT EXISTS idx_workflow_steps_service_id ON public.workflow_steps(service_id);
CREATE INDEX IF NOT EXISTS idx_doc_reqs_service_id ON public.service_document_requirements(service_id);
