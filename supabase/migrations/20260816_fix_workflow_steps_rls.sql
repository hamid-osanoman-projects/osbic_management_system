-- ==============================================================================
-- Migration: 20260816_fix_workflow_steps_rls.sql
-- Description: Fix RLS policies to allow authenticated users to view workflow_steps
-- ==============================================================================

-- Enable select for authenticated users on workflow_steps
DROP POLICY IF EXISTS "workflow_steps viewable by authenticated users" ON public.workflow_steps;
CREATE POLICY "workflow_steps viewable by authenticated users" ON public.workflow_steps
  FOR SELECT USING (auth.role() = 'authenticated');
