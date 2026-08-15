-- ==============================================================================
-- Migration: 20260804_phase22_accounts_rls_fix.sql
-- Description: Fix RLS policies to allow accountants to verify payments/expenses
-- ==============================================================================

-- 1. Fix job_payments RLS
-- Let's just add a new policy for accountants.
CREATE POLICY "Accountants can update payments"
  ON public.job_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_do_accounts = true
    )
  );

-- 2. Add RLS for job_expenses if missing, or at least the policy.
ALTER TABLE public.job_expenses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view expenses
DROP POLICY IF EXISTS "Anyone can view expenses" ON public.job_expenses;
CREATE POLICY "Anyone can view expenses"
  ON public.job_expenses FOR SELECT
  USING (true);

-- Allow Employees and Admins to insert expenses
DROP POLICY IF EXISTS "Employees can insert expenses" ON public.job_expenses;
CREATE POLICY "Employees can insert expenses"
  ON public.job_expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Allow Accountants and Admins to update expenses
DROP POLICY IF EXISTS "Accountants and Admins can update expenses" ON public.job_expenses;
CREATE POLICY "Accountants and Admins can update expenses"
  ON public.job_expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.can_do_accounts = true)
    )
  );

-- Allow Admins to delete expenses
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.job_expenses;
CREATE POLICY "Admins can delete expenses"
  ON public.job_expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
