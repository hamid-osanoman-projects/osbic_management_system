-- Add sub_task_id to job_additional_charges to link automated fees
ALTER TABLE job_additional_charges
ADD COLUMN IF NOT EXISTS sub_task_id UUID REFERENCES job_sub_tasks(id) ON DELETE CASCADE;
