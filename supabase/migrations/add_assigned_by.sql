-- Add assigned_by column to jobs table
ALTER TABLE jobs ADD COLUMN assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add assigned_by column to job_steps table
ALTER TABLE job_steps ADD COLUMN assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
