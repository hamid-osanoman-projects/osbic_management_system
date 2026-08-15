-- ==============================================================================
-- Migration: 20260804_phase19_accounts_erp.sql
-- Description: Adds tables and columns for the Accounts ERP Portal (Phase 1)
-- ==============================================================================

-- 1. Update profiles table for Accounts permission
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_do_accounts BOOLEAN DEFAULT false;

-- 2. Update job_payments for Verification tracking
ALTER TABLE public.job_payments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Create job_expenses table for Operations to spend the Job Wallet
CREATE TABLE IF NOT EXISTS public.job_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    job_service_id UUID REFERENCES public.job_services(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    expense_type VARCHAR(50) DEFAULT 'ministry_fee',
    receipt_url TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Note: In Phase 1, we will automatically set admin to have can_do_accounts = true
UPDATE public.profiles
SET can_do_accounts = true
WHERE role = 'admin';
