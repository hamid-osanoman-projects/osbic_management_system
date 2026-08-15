-- ==============================================================================
-- Migration: 20260804_phase23_accounts_invoice_sync_fix.sql
-- Description: Fix column name in sync_invoice_on_payment trigger
-- ==============================================================================

-- 1. Replace the trigger function to use 'advance_amount' instead of 'paid_amount'
CREATE OR REPLACE FUNCTION sync_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    job_invoice_id UUID;
    invoice_total NUMERIC;
    total_verified_payments NUMERIC;
    job_total_fee NUMERIC;
BEGIN
    -- Only trigger if status just changed to 'verified'
    IF NEW.status = 'verified' AND (TG_OP = 'INSERT' OR OLD.status != 'verified') THEN
        
        -- Find the invoice associated with this job
        SELECT id, total_amount INTO job_invoice_id, invoice_total
        FROM public.invoices
        WHERE job_id = NEW.job_id AND type = 'invoice'
        LIMIT 1;
        
        -- If an invoice exists for this job
        IF job_invoice_id IS NOT NULL THEN
            -- Calculate the total of all VERIFIED payments for this job
            SELECT COALESCE(SUM(amount), 0) INTO total_verified_payments
            FROM public.job_payments
            WHERE job_id = NEW.job_id AND status = 'verified';
            
            -- If the total verified payments cover the entire invoice amount
            IF total_verified_payments >= invoice_total THEN
                -- Update invoice status to 'paid' and set paid_date
                UPDATE public.invoices
                SET status = 'paid',
                    paid_date = timezone('utc'::text, now())
                WHERE id = job_invoice_id AND status != 'paid';
            END IF;
        END IF;

        -- Get the total fee for the job
        SELECT total_fee INTO job_total_fee
        FROM public.jobs
        WHERE id = NEW.job_id;

        -- Dynamically update the job's total advance_amount, remaining_amount, and financial_status
        UPDATE public.jobs
        SET advance_amount = (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.job_payments
                WHERE job_id = NEW.job_id AND status = 'verified'
            ),
            remaining_amount = GREATEST(0, COALESCE(job_total_fee, 0) - (
                SELECT COALESCE(SUM(amount), 0)
                FROM public.job_payments
                WHERE job_id = NEW.job_id AND status = 'verified'
            )),
            financial_status = CASE
                WHEN GREATEST(0, COALESCE(job_total_fee, 0) - (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM public.job_payments
                    WHERE job_id = NEW.job_id AND status = 'verified'
                )) <= 0 THEN 'fully_paid'
                WHEN (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM public.job_payments
                    WHERE job_id = NEW.job_id AND status = 'verified'
                ) > 0 THEN 'partially_paid'
                ELSE 'unpaid'
            END
        WHERE id = NEW.job_id;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
