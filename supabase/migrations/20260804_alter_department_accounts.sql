-- Add 'accounts' to the allowed department values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_department_check CHECK (department IN ('sales', 'operations', 'pro', 'accounts'));
