-- OSBIC OS Core Row Level Security (RLS) Policies
-- This assumes standard Supabase usage where auth.uid() resolves to the current authenticated user's ID
-- and roles are queryable (typically securely stored in auth metadata or JWT).
-- For this setup, we assume profile roles dictate broader structural access.

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 1. PROFILES
--------------------------------------------------------------------------------
-- Admin: can read/write all profiles
CREATE POLICY "Admins have full access to profiles"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'role_app' = 'admin')
WITH CHECK (auth.jwt() ->> 'role_app' = 'admin');

-- Employee: can read own profile + all client profiles
CREATE POLICY "Employees can read own and client profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR
  role = 'client'
);

-- Employee: can register new client profiles
CREATE POLICY "Employees can register new clients"
ON public.profiles
FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role_app' = 'employee') AND
  (role = 'client')
);

-- Client: can read/write only their own profile
CREATE POLICY "Clients read/write own profile only"
ON public.profiles
FOR ALL
USING (id = auth.uid() AND auth.jwt() ->> 'role_app' = 'client')
WITH CHECK (id = auth.uid() AND auth.jwt() ->> 'role_app' = 'client');

--------------------------------------------------------------------------------
-- 2. JOBS
--------------------------------------------------------------------------------
-- Admin: full access all jobs
CREATE POLICY "Admins have full access to jobs"
ON public.jobs
FOR ALL
USING (auth.jwt() ->> 'role_app' = 'admin');

-- Employee: read/write jobs WHERE employee_id = auth.uid()
CREATE POLICY "Employees access assigned jobs"
ON public.jobs
FOR ALL
USING (employee_id = auth.uid());

-- Client: read only WHERE client_id = auth.uid()
CREATE POLICY "Clients can read own jobs"
ON public.jobs
FOR SELECT
USING (client_id = auth.uid());

--------------------------------------------------------------------------------
-- 3. DOCUMENTS
--------------------------------------------------------------------------------
-- Admin: full access
CREATE POLICY "Admins have full access to documents"
ON public.documents
FOR ALL
USING (auth.jwt() ->> 'role_app' = 'admin');

-- Employee: access to docs in their assigned jobs
CREATE POLICY "Employees access docs for assigned jobs"
ON public.documents
FOR ALL
USING (
  job_id IN (
    SELECT id FROM public.jobs WHERE employee_id = auth.uid()
  )
);

-- Client: access to own docs WHERE is_client_visible = true
CREATE POLICY "Clients access visible docs for own jobs"
ON public.documents
FOR SELECT
USING (
  is_client_visible = true AND
  job_id IN (
    SELECT id FROM public.jobs WHERE client_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- 4. MESSAGES
--------------------------------------------------------------------------------
-- Admin: read all
CREATE POLICY "Admins read all messages"
ON public.messages
FOR SELECT
USING (auth.jwt() ->> 'role_app' = 'admin');

-- Employee/Client (Parties in the job): read/write
CREATE POLICY "Participants read/write job messages"
ON public.messages
FOR ALL
USING (
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE employee_id = auth.uid() OR client_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- 5. NOTIFICATIONS
--------------------------------------------------------------------------------
-- Each user reads only their own notifications
CREATE POLICY "Users read own notifications"
ON public.notifications
FOR SELECT
USING (recipient_id = auth.uid());

-- Each user can mark their own notifications as read
CREATE POLICY "Users mark own notifications as read"
ON public.notifications
FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- NEW: Allow employees to SEND notifications to admins
CREATE POLICY "Employees can send notifications to admins"
ON public.notifications
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role_app' = 'employee' OR auth.jwt() ->> 'role_app' = 'admin');

--------------------------------------------------------------------------------
-- 6. EMPLOYEE REQUESTS
--------------------------------------------------------------------------------
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins full access to requests"
ON public.employee_requests
FOR ALL
USING (auth.jwt() ->> 'role_app' = 'admin');

-- Employees: can create requests (INSERT)
CREATE POLICY "Employees can create requests"
ON public.employee_requests
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role_app' = 'employee');

-- Employees: can view their own requests (SELECT)
CREATE POLICY "Employees can view own requests"
ON public.employee_requests
FOR SELECT
USING (employee_id = auth.uid());
