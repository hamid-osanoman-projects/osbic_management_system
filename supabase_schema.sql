-- ═══════════════════════════════════════════════════════════════════
-- OSBIC OS — COMPLETE DATABASE SETUP
-- Run this entire script in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Drop tables if they exist (clean slate)
-- WARNING: This will delete all existing data in these tables!
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.employee_requests CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.job_steps CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.workflow_steps CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 2: Drop any existing trigger that might conflict
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────
-- Step 3: Create the profiles table (nullable full_name for trigger)
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,                     -- Made nullable for auto-creation
  email TEXT UNIQUE,                  -- Made nullable for auto-creation
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'employee', 'client')),
  avatar_url TEXT,
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'ar')),
  is_active BOOLEAN DEFAULT true,
  employee_code TEXT UNIQUE,
  client_code TEXT UNIQUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- Step 4: Create a trigger function that auto-creates a minimal profile
-- This runs every time a user is created in auth.users
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────
-- Step 5: Create remaining tables
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  estimated_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  icon TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  required_documents TEXT[],
  is_client_visible BOOLEAN DEFAULT true,
  is_blocking BOOLEAN DEFAULT true,
  estimated_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  current_step_id UUID REFERENCES public.workflow_steps(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  total_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  work_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  ministry_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  ministry_fee_type TEXT DEFAULT 'fixed' CHECK (ministry_fee_type IN ('fixed', 'percentage')),
  ministry_fee_percentage DECIMAL(5,2),
  advance_percentage DECIMAL(5,2) DEFAULT 50.00,
  advance_amount DECIMAL(10,2),
  advance_paid BOOLEAN DEFAULT false,
  advance_paid_at TIMESTAMPTZ,
  advance_receipt_url TEXT,           -- New: Receipt/Invoice for advance
  remaining_amount DECIMAL(10,2),
  remaining_paid BOOLEAN DEFAULT false,
  remaining_paid_at TIMESTAMPTZ,
  remaining_receipt_url TEXT,         -- New: Receipt/Invoice for final balance
  service_expiry_date DATE,
  expiry_reminder_60_sent BOOLEAN DEFAULT false,
  expiry_reminder_30_sent BOOLEAN DEFAULT false,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,              -- New: SLA Deadline
  completed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  rejection_reason TEXT,
  extension_reason TEXT,              -- New: Reason for deadline extension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_step_id UUID REFERENCES public.job_steps(id),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  expiry_date DATE,
  is_client_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_id UUID REFERENCES public.profiles(id),
  job_id UUID REFERENCES public.jobs(id),
  type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  body_en TEXT,
  body_ar TEXT,
  is_read BOOLEAN DEFAULT false,
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.employee_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  job_id UUID REFERENCES public.jobs(id),
  type TEXT NOT NULL CHECK (type IN ('price_adjustment', 'step_skip', 'deadline_extension', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  metadata JSONB,                      -- New: Structured request data (e.g., proposed_deadline)
  admin_response TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- Step 6: Enable Row Level Security
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────
-- Step 7: RLS Policies
-- ───────────────────────────────────────────────────────────────────

-- Profiles: Everyone can read, users can update their own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Services: All authenticated users can read
CREATE POLICY "Services viewable by authenticated users" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Jobs: Role-based access
CREATE POLICY "Admins can see all jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Employees can see their assigned jobs" ON public.jobs
  FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "Clients can see their own jobs" ON public.jobs
  FOR SELECT USING (client_id = auth.uid());

-- Notifications: Users see their own
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Messages: Job participants
CREATE POLICY "Job participants can see messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_id
      AND (jobs.client_id = auth.uid() OR jobs.employee_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Audit logs: Admins only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ───────────────────────────────────────────────────────────────────
-- Step 8: Create the admin user profile
-- Run THIS SEPARATELY after creating the user in Authentication → Users
-- Replace the UUID below with the actual user ID from the Auth table
-- ───────────────────────────────────────────────────────────────────

-- AFTER creating user in Auth dashboard, run:
-- UPDATE public.profiles
-- SET full_name = 'Master Admin', role = 'admin'
-- WHERE email = 'admin@gmail.com';
