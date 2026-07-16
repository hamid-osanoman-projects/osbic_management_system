-- Add availability status to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'on-work';

-- Ensure the status is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_availability_check'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_availability_check 
    CHECK (availability_status IN ('available', 'on-work', 'offline'));
  END IF;
END $$;
