-- Create Service Interests (Leads) table
CREATE TABLE IF NOT EXISTS public.service_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id),
    service_id UUID REFERENCES public.services(id),
    notes TEXT,
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'converted', 'ignored'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_interests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clients can create their own interests" 
ON public.service_interests FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admin and Employee can view all interests" 
ON public.service_interests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'employee')
    )
);

CREATE POLICY "Admin and Employee can update interests" 
ON public.service_interests FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'employee')
    )
);
