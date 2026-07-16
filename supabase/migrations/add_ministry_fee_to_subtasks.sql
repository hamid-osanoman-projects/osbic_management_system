-- ==========================================
-- Add ministry_fee to job_sub_tasks
-- ==========================================

ALTER TABLE job_sub_tasks
ADD COLUMN IF NOT EXISTS ministry_fee NUMERIC(10,3) DEFAULT 0;
