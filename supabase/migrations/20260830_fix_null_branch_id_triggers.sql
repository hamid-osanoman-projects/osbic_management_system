-- ─── SAFE ID GENERATION WITH NULL BRANCH GUARDS ─────────────────────────────

-- 1. PROFILE CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_profile_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    seq_number INT;
BEGIN
    -- For Employees: EMP-[BRANCH]-[000] starting at 011
    IF NEW.role = 'employee' AND (NEW.employee_code IS NULL OR NEW.employee_code = '' OR NEW.employee_code = 'EMP-NEW') THEN
        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('profile_emp_' || b_code));
        
        -- Get next sequence (start at 011 -> 11) with safe null branch check
        SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_code, '^EMP-' || b_code || '-', ''), '')::INT), 10) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'employee' 
          AND (branch_id = NEW.branch_id OR (branch_id IS NULL AND NEW.branch_id IS NULL))
          AND employee_code SIMILAR TO 'EMP-' || b_code || '-[0-9]+';
        
        NEW.employee_code := 'EMP-' || b_code || '-' || lpad(seq_number::TEXT, 3, '0');
        
    -- For Clients: CLT-[BRANCH]-[0000]
    ELSIF NEW.role = 'client' AND (NEW.client_code IS NULL OR NEW.client_code = '') THEN
        -- Resolve branch_id from creator profile if null
        IF NEW.branch_id IS NULL AND NEW.created_by IS NOT NULL THEN
            SELECT branch_id INTO NEW.branch_id FROM public.profiles WHERE id = NEW.created_by;
        END IF;

        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('profile_clt_' || b_code));
        
        -- Get next sequence with safe null branch check
        SELECT COALESCE(MAX(NULLIF(regexp_replace(client_code, '^CLT-' || b_code || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'client' 
          AND (branch_id = NEW.branch_id OR (branch_id IS NULL AND NEW.branch_id IS NULL))
          AND client_code SIMILAR TO 'CLT-' || b_code || '-[0-9]+';
        
        NEW.client_code := 'CLT-' || b_code || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. LEAD CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_lead_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    year_tag TEXT;
    seq_number INT;
BEGIN
    IF NEW.lead_code IS NULL OR NEW.lead_code = '' THEN
        -- Resolve branch_id from salesperson profile if null
        IF NEW.branch_id IS NULL AND NEW.assigned_to IS NOT NULL THEN
            SELECT branch_id INTO NEW.branch_id FROM public.profiles WHERE id = NEW.assigned_to;
        END IF;

        -- Resolve branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        year_tag := to_char(NOW(), 'YY');
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('leads_' || b_code || '_' || year_tag));
        
        -- Get next sequence with safe null branch check
        SELECT COALESCE(MAX(NULLIF(regexp_replace(lead_code, '^LD-' || b_code || '-' || year_tag || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.leads
        WHERE (branch_id = NEW.branch_id OR (branch_id IS NULL AND NEW.branch_id IS NULL))
          AND lead_code LIKE 'LD-' || b_code || '-' || year_tag || '-%';
        
        NEW.lead_code := 'LD-' || b_code || '-' || year_tag || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. JOB CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    year_tag TEXT;
    seq_number INT;
BEGIN
    IF NEW.job_code IS NULL OR NEW.job_code = '' OR NEW.job_code NOT LIKE 'JOB-%-%-%' THEN
        -- Resolve branch_id from client profile if null
        IF NEW.branch_id IS NULL AND NEW.client_id IS NOT NULL THEN
            SELECT branch_id INTO NEW.branch_id FROM public.profiles WHERE id = NEW.client_id;
        END IF;

        -- Resolve branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        year_tag := to_char(NOW(), 'YY');
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('jobs_' || b_code || '_' || year_tag));
        
        -- Get next sequence with safe null branch check
        SELECT COALESCE(MAX(NULLIF(regexp_replace(job_code, '^JOB-' || b_code || '-' || year_tag || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.jobs
        WHERE (branch_id = NEW.branch_id OR (branch_id IS NULL AND NEW.branch_id IS NULL))
          AND job_code LIKE 'JOB-' || b_code || '-' || year_tag || '-%';
        
        NEW.job_code := 'JOB-' || b_code || '-' || year_tag || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. INVOICES & QUOTATIONS CODE GENERATOR (QT-[Client Suffix]-[00] & INV-[Client Suffix]-[00])
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    c_code TEXT;
    c_seq TEXT;
    prefix TEXT;
    seq_number INT;
BEGIN
    -- Resolve reference code (from client or lead)
    IF NEW.client_id IS NOT NULL THEN
        SELECT client_code INTO c_code FROM public.profiles WHERE id = NEW.client_id;
    ELSIF NEW.lead_id IS NOT NULL THEN
        SELECT lead_code INTO c_code FROM public.leads WHERE id = NEW.lead_id;
    END IF;
    
    -- Extract digits from reference code (suffix sequence)
    c_seq := right(regexp_replace(coalesce(c_code, ''), '[^0-9]', '', 'g'), 4);
    IF c_seq = '' OR length(c_seq) < 4 THEN
        c_seq := '0000';
    END IF;
    
    -- Set prefix depending on document type
    IF NEW.type = 'quotation' THEN
        prefix := 'QT-' || c_seq || '-';
    ELSE
        prefix := 'INV-' || c_seq || '-';
    END IF;
    
    -- Lock sequence for this client + prefix to prevent collision
    PERFORM pg_advisory_xact_lock(hashtext('invoice_' || prefix));
    
    -- Calculate next sequence for this client/lead with safe null-checks
    SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '^' || prefix, ''), '')::INT), 0) + 1 INTO seq_number
    FROM public.invoices
    WHERE (client_id = NEW.client_id OR (client_id IS NULL AND NEW.client_id IS NULL))
      AND (lead_id = NEW.lead_id OR (lead_id IS NULL AND NEW.lead_id IS NULL))
      AND type = NEW.type 
      AND invoice_number LIKE prefix || '%';
    
    NEW.invoice_number := prefix || lpad(seq_number::TEXT, 2, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
