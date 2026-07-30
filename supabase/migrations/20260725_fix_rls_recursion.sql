-- Migration: Fix Infinite Recursion in Row Level Security (RLS) Policies on jobs table
-- By using Supabase's auth.jwt() metadata claim instead of querying public.profiles table,
-- we completely eliminate all database lookups during policy execution.

-- 1. Drop all existing policies on jobs to clean the slate
DROP POLICY IF EXISTS "Admin view all" ON public.jobs;
DROP POLICY IF EXISTS "Admin view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins have full access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Clients can see their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Clients can read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Clients can update feedback on their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employees can see their assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employees access assigned jobs" ON public.jobs;
DROP POLICY IF EXISTS "Employees view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Staff can insert jobs" ON public.jobs;

-- 2. Create non-recursive policies using auth.jwt() metadata
CREATE POLICY "Admins have full access to jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin')
  WITH CHECK (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin');

CREATE POLICY "Employees access assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'employee')
  );

CREATE POLICY "Employees update assigned jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'employee')
  )
  WITH CHECK (
    employee_id = auth.uid() 
    OR assigned_by = auth.uid() 
    OR ops_employee_id = auth.uid()
    OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'employee')
  );

CREATE POLICY "Clients can read own jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update feedback on their own jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Staff can insert jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) IN ('admin', 'employee')
  );
