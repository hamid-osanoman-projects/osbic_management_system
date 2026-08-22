-- ─── REFINE EMPLOYEE ID SEQUENCE FUNCTION ───────────────────────────────────

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
        
        -- Get next sequence (start at 011 -> 11)
        -- We filter using SIMILAR TO 'EMP-' || b_code || '-[0-9]+' to avoid type-casting crashes with legacy format codes
        SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_code, '^EMP-' || b_code || '-', ''), '')::INT), 10) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'employee' 
          AND branch_id = NEW.branch_id 
          AND employee_code SIMILAR TO 'EMP-' || b_code || '-[0-9]+';
        
        NEW.employee_code := 'EMP-' || b_code || '-' || lpad(seq_number::TEXT, 3, '0');
        
    -- For Clients: CLT-[BRANCH]-[0000]
    ELSIF NEW.role = 'client' AND (NEW.client_code IS NULL OR NEW.client_code = '') THEN
        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = NEW.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Lock to prevent race condition
        PERFORM pg_advisory_xact_lock(hashtext('profile_clt_' || b_code));
        
        -- Get next sequence
        -- We filter using SIMILAR TO to prevent any legacy CLT format crashes
        SELECT COALESCE(MAX(NULLIF(regexp_replace(client_code, '^CLT-' || b_code || '-', ''), '')::INT), 0) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'client' 
          AND branch_id = NEW.branch_id 
          AND client_code SIMILAR TO 'CLT-' || b_code || '-[0-9]+';
        
        NEW.client_code := 'CLT-' || b_code || '-' || lpad(seq_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── RETROACTIVE BACKFILL FOR EXISTING EMPLOYEES ─────────────────────────────
-- Run this block once in your Supabase SQL Editor to update legacy codes (like EMP-393061) to the new branch format
DO $$
DECLARE
    emp RECORD;
    b_code TEXT;
    seq_number INT;
BEGIN
    FOR emp IN 
        SELECT id, branch_id, created_at 
        FROM public.profiles 
        WHERE role = 'employee' 
          AND (employee_code IS NULL OR employee_code NOT SIMILAR TO 'EMP-%-[0-9]+')
        ORDER BY created_at ASC
    LOOP
        -- Get branch code
        SELECT COALESCE(code, 'GHL') INTO b_code FROM public.branches WHERE id = emp.branch_id;
        IF b_code IS NULL THEN b_code := 'GHL'; END IF;
        
        -- Get next sequence starting at 011
        SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_code, '^EMP-' || b_code || '-', ''), '')::INT), 10) + 1 INTO seq_number
        FROM public.profiles
        WHERE role = 'employee' 
          AND branch_id = emp.branch_id 
          AND employee_code SIMILAR TO 'EMP-' || b_code || '-[0-9]+';
          
        UPDATE public.profiles
        SET employee_code = 'EMP-' || b_code || '-' || lpad(seq_number::TEXT, 3, '0')
        WHERE id = emp.id;
    END LOOP;
END $$;
