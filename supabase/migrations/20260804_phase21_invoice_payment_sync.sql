-- ==============================================================================
-- Migration: 20260804_phase21_invoice_payment_sync.sql
-- Description: Automates updating Invoice status when a Payment is verified
-- ==============================================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION sync_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    job_invoice_id UUID;
    invoice_total NUMERIC;
    total_verified_payments NUMERIC;
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

        -- Also dynamically update the job's total paid_amount
        UPDATE public.jobs
        SET paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM public.job_payments
            WHERE job_id = NEW.job_id AND status = 'verified'
        )
        WHERE id = NEW.job_id;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger to job_payments
DROP TRIGGER IF EXISTS trigger_sync_invoice_on_payment ON public.job_payments;
CREATE TRIGGER trigger_sync_invoice_on_payment
AFTER INSERT OR UPDATE ON public.job_payments
FOR EACH ROW
EXECUTE FUNCTION sync_invoice_on_payment();
