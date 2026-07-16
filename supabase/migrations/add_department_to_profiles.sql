-- Add department column to profiles table to support Sales vs Operations roles
-- while keeping the base permission role the same.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department text DEFAULT 'operations';

-- Ensure the department is either 'sales' or 'operations'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_department_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_department_check 
    CHECK (department IN ('sales', 'operations'));
  END IF;
END $$;
