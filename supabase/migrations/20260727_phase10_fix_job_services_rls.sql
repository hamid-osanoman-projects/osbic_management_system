-- =============================================================================
-- Migration: Phase 10 — Fix job_services UPDATE RLS to allow all staff
-- Problem: The old UPDATE policy only allowed update when ops_employee_id = auth.uid()
--          This means if a row had a different ops_employee or null, the update was
--          silently rejected by RLS. The frontend showed "success" but 0 rows changed.
-- Fix: Broaden the policy to allow any authenticated employee/admin to update.
-- Run this in Supabase SQL Editor
-- =============================================================================

-- --- Fix job_services UPDATE policy ------------------------------------------
DROP POLICY IF EXISTS "Employees can update their job services" ON public.job_services;

CREATE POLICY "Employees can update their job services" ON public.job_services
  FOR UPDATE TO authenticated
  USING (
    public.is_employee_or_admin(auth.uid())
  )
  WITH CHECK (
    public.is_employee_or_admin(auth.uid())
  );

-- --- Fix SELECT policy to allow all staff (not just assigned ops employee) ---
DROP POLICY IF EXISTS "Job services are viewable by participants" ON public.job_services;

CREATE POLICY "Job services are viewable by participants" ON public.job_services
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
      AND j.client_id = auth.uid()
    )
    OR public.is_employee_or_admin(auth.uid())
  );

-- --- Add DELETE policy for admin ----------------------------------------------
DROP POLICY IF EXISTS "Admins can delete job services" ON public.job_services;

CREATE POLICY "Admins can delete job services" ON public.job_services
  FOR DELETE TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );
