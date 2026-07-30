-- Seed Lead Sources table with common options safely (avoids duplicates)
INSERT INTO public.lead_sources (name, is_active)
SELECT name, is_active FROM (VALUES
  ('Social Media', true),
  ('Referral', true),
  ('Walk-in', true),
  ('WhatsApp', true),
  ('Website', true),
  ('Phone Call', true),
  ('Google / Search', true),
  ('Other', true)
) AS new_sources(name, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources WHERE public.lead_sources.name = new_sources.name
);
