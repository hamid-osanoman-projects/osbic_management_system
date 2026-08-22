-- Migration: Fix leads unique constraint violation for lead_code
-- This migration sets up a database-side trigger that automatically assigns
-- the next sequential lead_code (bypassing RLS) before a lead is inserted.

-- 1. Helper function running with SECURITY DEFINER to get the absolute latest lead code
CREATE OR REPLACE FUNCTION public.get_latest_lead_code(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_code TEXT;
BEGIN
  SELECT lead_code INTO latest_code
  FROM public.leads
  WHERE lead_code LIKE prefix || '%'
  ORDER BY lead_code DESC
  LIMIT 1;
  
  RETURN latest_code;
END;
$$;

COMMENT ON FUNCTION public.get_latest_lead_code IS 'Bypasses RLS to query the absolute latest lead_code for sequence calculation.';

-- 2. Trigger function to compute and set the lead_code automatically
CREATE OR REPLACE FUNCTION public.set_next_lead_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  year_prefix TEXT;
  latest_code TEXT;
  next_seq INT;
BEGIN
  year_prefix := 'LEAD-' || to_char(CURRENT_DATE, 'YYYY') || '-';
  
  -- Get the absolute latest lead code using the security-definer helper
  latest_code := public.get_latest_lead_code(year_prefix);

  IF latest_code IS NULL THEN
    next_seq := 1;
  ELSE
    -- Extract sequence number (the 3rd part after split)
    next_seq := (split_part(latest_code, '-', 3)::INT) + 1;
  END IF;

  -- Assign the safe, non-duplicate lead code to the row
  NEW.lead_code := year_prefix || lpad(next_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- 3. Trigger binding
DROP TRIGGER IF EXISTS trg_set_next_lead_code ON public.leads;
CREATE TRIGGER trg_set_next_lead_code
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_next_lead_code();
