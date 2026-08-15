-- ==============================================================================
-- Migration: 20260804_phase19_accounts_erp_part2.sql
-- Description: Adds pending allocation tracking for Accounts Verification
-- ==============================================================================

-- 1. Add pending allocation tracking to job_services
ALTER TABLE public.job_services
ADD COLUMN IF NOT EXISTS ministry_fee_pending NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee_pending NUMERIC DEFAULT 0;

-- 2. Create trigger function to move pending funds to allocated upon verification
CREATE OR REPLACE FUNCTION verify_payment_allocations()
RETURNS TRIGGER AS $$
DECLARE
    alloc RECORD;
BEGIN
    -- Only act when status changes to 'verified'
    IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
        -- Loop through all allocations for this payment
        FOR alloc IN SELECT * FROM public.payment_allocations WHERE payment_id = NEW.id
        LOOP
            IF alloc.allocation_type = 'ministry_fee' THEN
                UPDATE public.job_services
                SET ministry_fee_pending = ministry_fee_pending - alloc.amount,
                    ministry_fee_allocated = ministry_fee_allocated + alloc.amount
                WHERE id = alloc.job_service_id;
            ELSIF alloc.allocation_type = 'service_fee' THEN
                UPDATE public.job_services
                SET service_fee_pending = service_fee_pending - alloc.amount,
                    service_fee_allocated = service_fee_allocated + alloc.amount
                WHERE id = alloc.job_service_id;
            END IF;
        END LOOP;
    END IF;
    
    -- If a payment gets rejected, clear the pending amounts
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        FOR alloc IN SELECT * FROM public.payment_allocations WHERE payment_id = NEW.id
        LOOP
            IF alloc.allocation_type = 'ministry_fee' THEN
                UPDATE public.job_services
                SET ministry_fee_pending = ministry_fee_pending - alloc.amount
                WHERE id = alloc.job_service_id;
            ELSIF alloc.allocation_type = 'service_fee' THEN
                UPDATE public.job_services
                SET service_fee_pending = service_fee_pending - alloc.amount
                WHERE id = alloc.job_service_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to job_payments
DROP TRIGGER IF EXISTS trigger_verify_payment_allocations ON public.job_payments;
CREATE TRIGGER trigger_verify_payment_allocations
AFTER UPDATE ON public.job_payments
FOR EACH ROW
EXECUTE FUNCTION verify_payment_allocations();
