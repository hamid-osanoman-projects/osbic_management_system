-- ==============================================================================
-- OSBIC OS - Employee Portal Overhaul (Dynamic Workflows & Ledgers)
-- ==============================================================================

-- 1. ADD 'draft' STATUS TO JOBS
-- We need to update the check constraint for jobs status.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check 
  CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled'));

-- 2. ADD ASSIGNED_TO FIELD TO JOB_STEPS FOR PEER DELEGATION
ALTER TABLE public.job_steps ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. ADD IS_MANAGER TO PROFILES (To handle Sales/Pipeline roles easily)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- 4. CREATE JOB_SUB_TASKS TABLE (Level 3 Hierarchy)
CREATE TABLE IF NOT EXISTS public.job_sub_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_step_id UUID NOT NULL REFERENCES public.job_steps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "John Doe Passport"
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'approved', 'rejected', 'expired')),
    notes TEXT,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger for updated_at on job_sub_tasks
CREATE OR REPLACE FUNCTION update_sub_task_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_job_sub_tasks_updated_at ON public.job_sub_tasks;
CREATE TRIGGER update_job_sub_tasks_updated_at
    BEFORE UPDATE ON public.job_sub_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_sub_task_updated_at_column();

-- Enable RLS for job_sub_tasks
ALTER TABLE public.job_sub_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON public.job_sub_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.job_sub_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON public.job_sub_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
    ON public.job_sub_tasks FOR DELETE TO authenticated USING (true);


-- 5. CREATE JOB_ADDITIONAL_CHARGES TABLE (Dynamic Financial Ledger)
CREATE TABLE IF NOT EXISTS public.job_additional_charges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL, -- e.g., "Visa Resubmission Fee"
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for job_additional_charges
ALTER TABLE public.job_additional_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON public.job_additional_charges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.job_additional_charges FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON public.job_additional_charges FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
    ON public.job_additional_charges FOR DELETE TO authenticated USING (true);
