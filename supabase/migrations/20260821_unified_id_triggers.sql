-- ─── UNIFIED ID SYSTEM TRIGGERS ─────────────────────────────────────────────

-- 1. PROFILE CODE GENERATOR (Employees & Clients)
CREATE OR REPLACE FUNCTION public.generate_profile_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    seq_number INT;
BEGIN
    -- For Employees: EMP-[BRANCH]-[000]
    IF NEW.role = 'employee' AND (NEW.employee_code IS NULL OR NEW.employee_code = '' OR NEW.employee_code = 'EMP-NEW') THEN
        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('profile_emp_' || b_code));
        
        -- Get next sequence
        SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_code, '^EMP-' || b_code || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'employee' AND branch_id = NEW.branch_id AND employee_code LIKE 'EMP-' || b_code || '-%';
        
        NEW.employee_code := 'EMP-' || b_code || '-' || lpad(seq_number::TEXT, 3, '0');
        
    -- For Clients: CLT-[BRANCH]-[0000]
    ELSIF NEW.role = 'client' AND (NEW.client_code IS NULL OR NEW.client_code = '') THEN
        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('profile_clt_' || b_code));
        
        -- Get next sequence
        SELECT COALESCE(MAX(NULLIF(regexp_replace(client_code, '^CLT-' || b_code || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'client' AND branch_id = NEW.branch_id AND client_code LIKE 'CLT-' || b_code || '-%';
        
        NEW.client_code := 'CLT-' || b_code || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Profile Trigger
DROP TRIGGER IF EXISTS trg_generate_profile_code ON public.profiles;
CREATE TRIGGER trg_generate_profile_code
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_profile_code();


-- 2. LEAD CODE GENERATOR: LD-[BRANCH]-[YY]-[0000]
CREATE OR REPLACE FUNCTION public.generate_lead_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    year_tag TEXT;
    seq_number INT;
BEGIN
    IF NEW.lead_code IS NULL OR NEW.lead_code = '' THEN
        -- Resolve branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        year_tag := to_char(NOW(), 'YY');
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('leads_' || b_code || '_' || year_tag));
        
        -- Get next sequence (annual reset per branch)
        SELECT COALESCE(MAX(NULLIF(regexp_replace(lead_code, '^LD-' || b_code || '-' || year_tag || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.leads
        WHERE branch_id = NEW.branch_id AND lead_code LIKE 'LD-' || b_code || '-' || year_tag || '-%';
        
        NEW.lead_code := 'LD-' || b_code || '-' || year_tag || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove old triggers on leads if they exist
DROP TRIGGER IF EXISTS trg_set_next_lead_code ON public.leads;
DROP TRIGGER IF EXISTS trg_generate_lead_code ON public.leads;

-- Attach Lead Trigger
CREATE TRIGGER trg_generate_lead_code
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_lead_code();


-- 3. JOB CODE GENERATOR: JOB-[BRANCH]-[YY]-[0000]
CREATE OR REPLACE FUNCTION public.generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
    b_code TEXT;
    year_tag TEXT;
    seq_number INT;
BEGIN
    -- We only override if it's empty, or matches the old random format (e.g. JOB-1234, WI-5678)
    IF NEW.job_code IS NULL OR NEW.job_code = '' OR NEW.job_code NOT LIKE 'JOB-%-%-%' THEN
        -- Resolve branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        year_tag := to_char(NOW(), 'YY');
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('jobs_' || b_code || '_' || year_tag));
        
        -- Get next sequence (annual reset per branch)
        SELECT COALESCE(MAX(NULLIF(regexp_replace(job_code, '^JOB-' || b_code || '-' || year_tag || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.jobs
        WHERE branch_id = NEW.branch_id AND job_code LIKE 'JOB-' || b_code || '-' || year_tag || '-%';
        
        NEW.job_code := 'JOB-' || b_code || '-' || year_tag || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Job Trigger
DROP TRIGGER IF EXISTS trg_generate_job_code ON public.jobs;
CREATE TRIGGER trg_generate_job_code
    BEFORE INSERT ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_job_code();


-- 4. INVOICES & QUOTATIONS CODE GENERATOR (QT-[Client Suffix]-[00] & INV-[Client Suffix]-[00])
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    c_code TEXT;
    c_seq TEXT;
    prefix TEXT;
    seq_number INT;
BEGIN
    -- Select client code
    SELECT client_code INTO c_code FROM public.profiles WHERE id = NEW.client_id;
    
    -- Extract digits from client code (usually suffix sequence from CLT-GHL-0001 -> 0001)
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
    
    -- Calculate next sequence for this client
    SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '^' || prefix, ''), '')::INT), 0) + 1 INTO seq_number
    FROM public.invoices
    WHERE client_id = NEW.client_id AND type = NEW.type AND invoice_number LIKE prefix || '%';
    
    NEW.invoice_number := prefix || lpad(seq_number::TEXT, 2, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
