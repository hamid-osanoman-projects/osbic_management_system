-- Add finance lock tracking to job_services
ALTER TABLE public.job_services
ADD COLUMN is_funded boolean DEFAULT false,
ADD COLUMN credit_authorized_by uuid REFERENCES public.profiles(id);

-- Add financial status to jobs
ALTER TABLE public.jobs
ADD COLUMN financial_status varchar(50) DEFAULT 'unpaid'
CHECK (financial_status IN ('unpaid', 'partially_paid', 'fully_paid', 'ministry_fee_paid'));

-- Optionally backfill existing data so ops workers aren't locked out of old jobs
-- For a safe rollout, we'll set existing active services to true so they don't get stuck.
UPDATE public.job_services
SET is_funded = true
WHERE created_at < NOW();

-- Also update existing jobs financial_status based on their ledger
UPDATE public.jobs
SET financial_status = CASE 
  WHEN remaining_amount <= 0 THEN 'fully_paid'
  WHEN (advance_amount > 0 OR advance_paid = true) THEN 'partially_paid'
  ELSE 'unpaid'
END;
