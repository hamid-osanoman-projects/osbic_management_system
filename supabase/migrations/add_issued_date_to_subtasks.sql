-- ==========================================
-- Add issued_date to job_sub_tasks
-- ==========================================

ALTER TABLE job_sub_tasks
ADD COLUMN IF NOT EXISTS issued_date DATE;
