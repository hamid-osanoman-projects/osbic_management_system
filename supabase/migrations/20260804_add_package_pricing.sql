ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS fixed_price NUMERIC;
