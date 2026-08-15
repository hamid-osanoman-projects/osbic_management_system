-- ==============================================================================
-- Migration: 20260807_automated_finance_sync.sql
-- Description: Auto-calculate and update job financial statuses on payment INSERT/UPDATE/DELETE
-- ==============================================================================

CREATE OR REPLACE FUNCTION sync_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    target_job_id UUID;
    job_invoice_id UUID;
    invoice_total NUMERIC;
    total_verified_payments NUMERIC;
    job_total_fee NUMERIC;
    is_advance_met BOOLEAN;
    is_final_met BOOLEAN;
BEGIN
    -- Determine target job_id
    IF TG_OP = 'DELETE' THEN
        target_job_id := OLD.job_id;
    ELSE
        target_job_id := NEW.job_id;
    END IF;

    -- 1. Get the total fee for the job
    SELECT total_fee INTO job_total_fee
    FROM public.jobs
    WHERE id = target_job_id;

    -- 2. Calculate the total of all VERIFIED payments for this job
    SELECT COALESCE(SUM(amount), 0) INTO total_verified_payments
    FROM public.job_payments
    WHERE job_id = target_job_id AND status = 'verified';

    -- 3. Sync Invoice Paid Status
    SELECT id, total_amount INTO job_invoice_id, invoice_total
    FROM public.invoices
    WHERE job_id = target_job_id AND type = 'invoice'
    LIMIT 1;
    
    IF job_invoice_id IS NOT NULL THEN
        IF total_verified_payments >= invoice_total THEN
            UPDATE public.invoices
            SET status = 'paid',
                paid_date = COALESCE(paid_date, timezone('utc'::text, now()))
            WHERE id = job_invoice_id AND status != 'paid';
        ELSE
            -- Revert invoice to unpaid if verified payments drop below total
            UPDATE public.invoices
            SET status = 'unpaid',
                paid_date = NULL
            WHERE id = job_invoice_id AND status = 'paid';
        END IF;
    END IF;

    is_advance_met := total_verified_payments >= (COALESCE(job_total_fee, 0) * 0.5);
    is_final_met := total_verified_payments >= COALESCE(job_total_fee, 0);

    -- 4. Dynamically update the job's financial state
    UPDATE public.jobs
    SET advance_paid = is_advance_met,
        advance_paid_at = CASE 
            WHEN is_advance_met THEN COALESCE(advance_paid_at, timezone('utc'::text, now()))
            ELSE NULL
        END,
        remaining_paid = is_final_met,
        remaining_paid_at = CASE 
            WHEN is_final_met THEN COALESCE(remaining_paid_at, timezone('utc'::text, now()))
            ELSE NULL
        END,
        advance_amount = total_verified_payments,
        remaining_amount = GREATEST(0, COALESCE(job_total_fee, 0) - total_verified_payments),
        financial_status = CASE
            WHEN is_final_met THEN 'fully_paid'
            WHEN total_verified_payments > 0 THEN 'partially_paid'
            ELSE 'unpaid'
        END
    WHERE id = target_job_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Re-attach trigger for INSERT, UPDATE, and DELETE
DROP TRIGGER IF EXISTS trigger_sync_invoice_on_payment ON public.job_payments;
CREATE TRIGGER trigger_sync_invoice_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.job_payments
FOR EACH ROW EXECUTE FUNCTION sync_invoice_on_payment();
