-- ==========================================
-- Add custom step support to job_steps
-- ==========================================

ALTER TABLE job_steps ALTER COLUMN workflow_step_id DROP NOT NULL;
ALTER TABLE job_steps ADD COLUMN IF NOT EXISTS custom_name TEXT;
