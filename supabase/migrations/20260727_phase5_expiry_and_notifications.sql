-- =============================================================================
-- Migration: Phase 5 — Service Expiry Tracking & Automated Renewal Reminders
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ─── 1. Add expiry tracking columns to job_services ─────────────────────────
ALTER TABLE public.job_services
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ─── 2. Create index on expiry_date for reminder checks ──────────────────────
CREATE INDEX IF NOT EXISTS idx_job_services_expiry_date
  ON public.job_services(expiry_date);

-- ─── 3. Expiry check scan function ──────────────────────────────────────────
-- Scans completed services and writes in-app notifications to both Sales & Ops
-- when a document/license has exactly 30, 15, or 5 days remaining.
CREATE OR REPLACE FUNCTION public.check_expiring_services()
RETURNS VOID AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      js.id as service_id,
      js.job_id,
      js.service_name,
      js.applicant_name,
      js.item_number,
      js.expiry_date,
      j.job_code,
      js.ops_employee_id,
      j.employee_id as creator_id,
      (js.expiry_date - CURRENT_DATE) as days_remaining
    FROM public.job_services js
    JOIN public.jobs j ON js.job_id = j.id
    WHERE js.expiry_date IS NOT NULL
      AND js.status = 'completed'
      AND (js.expiry_date - CURRENT_DATE) IN (30, 15, 5)
  LOOP
    -- 1. Notify Assigned Ops Employee
    IF r.ops_employee_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        recipient_id,
        job_id,
        type,
        title_en,
        title_ar,
        body_en,
        body_ar,
        action_url
      ) VALUES (
        r.ops_employee_id,
        r.job_id,
        'alert',
        'Service Renewal Due Soon',
        'موعد تجديد الخدمة قريب',
        'Service ' || r.service_name || ' (Applicant: ' || COALESCE(r.applicant_name, '#' || r.item_number::text) || ') is expiring in ' || r.days_remaining || ' days.',
        'الخدمة ' || r.service_name || ' للمتقدم ' || COALESCE(r.applicant_name, '#' || r.item_number::text) || ' ستنتهي صلاحيتها خلال ' || r.days_remaining || ' يوم.',
        '/employee/tasks?jobId=' || r.job_id
      );
    END IF;

    -- 2. Notify Sales/Manager who initiated the job
    IF r.creator_id IS NOT NULL AND r.creator_id != COALESCE(r.ops_employee_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (
        recipient_id,
        job_id,
        type,
        title_en,
        title_ar,
        body_en,
        body_ar,
        action_url
      ) VALUES (
        r.creator_id,
        r.job_id,
        'alert',
        'Service Renewal Due Soon',
        'موعد تجديد الخدمة قريب',
        'Service ' || r.service_name || ' (Applicant: ' || COALESCE(r.applicant_name, '#' || r.item_number::text) || ') is expiring in ' || r.days_remaining || ' days.',
        'الخدمة ' || r.service_name || ' للمتقدم ' || COALESCE(r.applicant_name, '#' || r.item_number::text) || ' ستنتهي صلاحيتها خلال ' || r.days_remaining || ' يوم.',
        '/employee/tasks?jobId=' || r.job_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
