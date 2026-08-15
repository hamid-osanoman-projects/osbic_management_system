-- ==============================================================================
-- Migration: 20260803_phase18_automated_finance.sql
-- Description: Adds tables and columns for the Milestone-Based Finance System
-- ==============================================================================

-- 1. Update profiles table for KYC and Trust (for role = 'client')
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;

-- 2. Update job_services for detailed financial tracking
ALTER TABLE public.job_services
ADD COLUMN IF NOT EXISTS ministry_fee_allocated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee_allocated NUMERIC DEFAULT 0;

-- 3. Create payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id UUID REFERENCES public.job_payments(id) ON DELETE CASCADE NOT NULL,
    job_service_id UUID REFERENCES public.job_services(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN ('ministry_fee', 'service_fee')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_job_service_id ON public.payment_allocations(job_service_id);

-- Enable RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (authenticated users can read and write)
CREATE POLICY "Enable read access for all authenticated users" ON public.payment_allocations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.payment_allocations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.payment_allocations
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.payment_allocations
    FOR DELETE TO authenticated USING (true);
