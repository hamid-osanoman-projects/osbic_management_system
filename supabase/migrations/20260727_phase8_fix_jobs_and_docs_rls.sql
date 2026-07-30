-- =============================================================================
-- Migration: Phase 8 — Fix RLS policies for jobs and documents to prevent blank tables
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ─── 1. Security Definer helper functions to query roles without recursion ───
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_employee_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
      AND (role IN ('admin', 'employee', 'pro') OR can_do_ops = true OR can_do_sales = true)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 2. Re-create public.jobs policies using database role functions ─────────
DROP POLICY IF EXISTS "Admins have full access to jobs" ON public.jobs;
CREATE POLICY "Admins have full access to jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Employees access assigned jobs" ON public.jobs;
CREATE POLICY "Employees access assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR public.is_employee_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Employees update assigned jobs" ON public.jobs;
CREATE POLICY "Employees update assigned jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR public.is_employee_or_admin(auth.uid())
  )
  WITH CHECK (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR public.is_employee_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Staff can insert jobs" ON public.jobs;
CREATE POLICY "Staff can insert jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_employee_or_admin(auth.uid())
  );

-- ─── 3. Re-create public.documents policies using database role functions ────
DROP POLICY IF EXISTS "Employees have full access to documents" ON public.documents;
CREATE POLICY "Employees have full access to documents" ON public.documents
  FOR ALL TO authenticated
  USING (public.is_employee_or_admin(auth.uid()))
  WITH CHECK (public.is_employee_or_admin(auth.uid()));
