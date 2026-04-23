-- Create Service Packages table
CREATE TABLE IF NOT EXISTS service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    icon TEXT DEFAULT 'Package',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Junction table for Package Services
CREATE TABLE IF NOT EXISTS package_services (
    package_id UUID REFERENCES service_packages(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (package_id, service_id)
);

-- Enable RLS
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;

-- Add Public Read Policies
DROP POLICY IF EXISTS "Public can view active packages" ON service_packages;
CREATE POLICY "Public can view active packages" ON service_packages
    FOR SELECT TO authenticated 
    USING (
        is_active = true OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'employee')
        )
    );

DROP POLICY IF EXISTS "Public can view package services" ON package_services;
CREATE POLICY "Public can view package services" ON package_services
    FOR SELECT TO authenticated USING (true);

-- Add Admin Full Access Policies
DROP POLICY IF EXISTS "Admins have full access to packages" ON service_packages;
CREATE POLICY "Admins have full access to packages" ON service_packages
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins have full access to package_services" ON package_services;
CREATE POLICY "Admins have full access to package_services" ON package_services
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
