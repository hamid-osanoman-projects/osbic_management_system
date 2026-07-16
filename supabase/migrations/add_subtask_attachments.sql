-- ==========================================
-- Add sub-task document support
-- ==========================================

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS job_sub_task_id UUID REFERENCES job_sub_tasks(id) ON DELETE CASCADE;
