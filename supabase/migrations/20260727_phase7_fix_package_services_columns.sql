-- =============================================================================
-- Migration: Phase 7 — Patch package_services table with missing template columns
-- Run this in Supabase SQL Editor to resolve 400 Bad Request error
-- =============================================================================

ALTER TABLE public.package_services
  ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_parallel BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_days_min INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_days_max INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;
