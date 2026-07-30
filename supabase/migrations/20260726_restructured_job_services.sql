-- RESTRENGTHENED SERVICE & JOB REST_STRUCTURE MODEL

-- Profiles column modifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_do_sales BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_do_ops BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_target NUMERIC DEFAULT 0;

-- Services column modifications
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS default_work_fee NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS default_ministry_fee NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS requires_pro BOOLEAN DEFAULT false;

-- Jobs column modifications
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'lead' CHECK (entry_type IN ('lead', 'walkin', 'direct', 'renewal'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS sales_employee_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ops_employee_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS package_group_id UUID;

-- Service Packages table
CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Services Template table
CREATE TABLE IF NOT EXISTS public.package_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  default_quantity INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  is_parallel BOOLEAN DEFAULT false,
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document requirements template per service
CREATE TABLE IF NOT EXISTS public.service_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_name_ar TEXT,
  is_required BOOLEAN DEFAULT true,
  is_client_upload BOOLEAN DEFAULT true,
  is_employee_upload BOOLEAN DEFAULT true,
  notes TEXT,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Package Job groups
CREATE TABLE IF NOT EXISTS public.package_job_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  sales_employee_id UUID REFERENCES public.profiles(id),
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Services Table (Primary operational unit)
CREATE TABLE IF NOT EXISTS public.job_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  service_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  quantity INTEGER DEFAULT 1,
  item_number INTEGER DEFAULT 1,
  applicant_name TEXT,
  applicant_details JSONB,
  
  -- Assignment
  ops_employee_id UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'applied', 'assigned_to_pro',
    'gov_approved', 'gov_rejected', 'completed', 'on_hold', 'cancelled'
  )),
  pending_reason TEXT,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  
  -- PRO Assignment
  pro_id UUID REFERENCES public.profiles(id),
  pro_shared_at TIMESTAMPTZ,
  pro_status TEXT CHECK (pro_status IN ('submitted', 'approved', 'rejected')),
  pro_notes TEXT,
  government_ref TEXT,
  government_approved_at TIMESTAMPTZ,
  
  -- Finance
  work_fee NUMERIC DEFAULT 0,
  ministry_fee NUMERIC DEFAULT 0,
  total_fee NUMERIC DEFAULT 0,
  
  -- Tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Service Steps table
CREATE TABLE IF NOT EXISTS public.job_service_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_service_id UUID NOT NULL REFERENCES public.job_services(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_name_ar TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'applied', 'assigned_to_pro',
    'gov_approved', 'gov_rejected', 'completed', 'skipped', 'on_hold', 'cancelled'
  )),
  pending_reason TEXT,
  rejection_reason TEXT,
  
  -- PRO
  pro_id UUID REFERENCES public.profiles(id),
  pro_shared_at TIMESTAMPTZ,
  pro_status TEXT,
  government_ref TEXT,
  
  -- Timeline
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_client_visible BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Service Documents table
CREATE TABLE IF NOT EXISTS public.job_service_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_service_id UUID NOT NULL REFERENCES public.job_services(id) ON DELETE CASCADE,
  job_service_step_id UUID REFERENCES public.job_service_steps(id) ON DELETE SET NULL,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  
  document_name TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  document_category TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  upload_source TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  rejection_reason TEXT,
  is_client_visible BOOLEAN DEFAULT false,
  issue_date DATE,
  expiry_date DATE,
  version INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional Services table
CREATE TABLE IF NOT EXISTS public.job_additional_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  custom_name TEXT,
  quantity INTEGER DEFAULT 1,
  work_fee NUMERIC DEFAULT 0,
  ministry_fee NUMERIC DEFAULT 0,
  reason TEXT,
  added_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional Fees table
CREATE TABLE IF NOT EXISTS public.job_additional_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  fee_type TEXT DEFAULT 'work' CHECK (fee_type IN ('work', 'ministry', 'other')),
  reason TEXT,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_job_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_service_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_service_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_additional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_additional_fees ENABLE ROW LEVEL SECURITY;

-- Dynamic permissions
DROP POLICY IF EXISTS "Packages are viewable by authenticated users" ON public.service_packages;
CREATE POLICY "Packages are viewable by authenticated users" ON public.service_packages
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage packages" ON public.service_packages;
CREATE POLICY "Admins can manage packages" ON public.service_packages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Package services are viewable by authenticated users" ON public.package_services;
CREATE POLICY "Package services are viewable by authenticated users" ON public.package_services
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage package services" ON public.package_services;
CREATE POLICY "Admins can manage package services" ON public.package_services
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Document templates are viewable by authenticated users" ON public.service_document_requirements;
CREATE POLICY "Document templates are viewable by authenticated users" ON public.service_document_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage document templates" ON public.service_document_requirements;
CREATE POLICY "Admins can manage document templates" ON public.service_document_requirements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Job services are viewable by participants" ON public.job_services;
CREATE POLICY "Job services are viewable by participants" ON public.job_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = job_id 
      AND (j.client_id = auth.uid() OR j.employee_id = auth.uid() OR ops_employee_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Employees can update their job services" ON public.job_services;
CREATE POLICY "Employees can update their job services" ON public.job_services
  FOR UPDATE USING (
    ops_employee_id = auth.uid() OR pro_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Employees can insert job services" ON public.job_services;
CREATE POLICY "Employees can insert job services" ON public.job_services
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Job steps are viewable by participants" ON public.job_service_steps;
CREATE POLICY "Job steps are viewable by participants" ON public.job_service_steps
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Employees can manage job steps" ON public.job_service_steps;
CREATE POLICY "Employees can manage job steps" ON public.job_service_steps
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Job documents are viewable by participants" ON public.job_service_documents;
CREATE POLICY "Job documents are viewable by participants" ON public.job_service_documents
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Employees can manage job documents" ON public.job_service_documents;
CREATE POLICY "Employees can manage job documents" ON public.job_service_documents
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Additional services viewable by participants" ON public.job_additional_services;
CREATE POLICY "Additional services viewable by participants" ON public.job_additional_services
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Employees can manage additional services" ON public.job_additional_services;
CREATE POLICY "Employees can manage additional services" ON public.job_additional_services
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Additional fees viewable by participants" ON public.job_additional_fees;
CREATE POLICY "Additional fees viewable by participants" ON public.job_additional_fees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Employees can manage additional fees" ON public.job_additional_fees;
CREATE POLICY "Employees can manage additional fees" ON public.job_additional_fees
  FOR ALL USING (true);
