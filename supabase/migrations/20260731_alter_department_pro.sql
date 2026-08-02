-- Drop the existing check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;

-- Add updated check constraint to support 'pro' department
ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_check CHECK (department IN ('sales', 'operations', 'pro'));
