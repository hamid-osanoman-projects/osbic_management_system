-- ==============================================================================
-- Migration: 20260804_phase20_automated_auditing.sql
-- Description: Adds automated generic audit trigger for key operational tables
-- ==============================================================================

-- 1. Create the generic audit trigger function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_entity_type TEXT;
    v_entity_id UUID;
    v_action TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    -- Attempt to get the user ID from Supabase auth context
    v_actor_id := auth.uid();
    
    v_entity_type := TG_TABLE_NAME;
    v_action := TG_OP; -- 'INSERT', 'UPDATE', 'DELETE'
    
    IF TG_OP = 'INSERT' THEN
        v_entity_id := NEW.id;
        v_new_values := row_to_json(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := NEW.id;
        v_old_values := row_to_json(OLD);
        v_new_values := row_to_json(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id;
        v_old_values := row_to_json(OLD);
    END IF;

    -- Special case for table names to make action more readable
    IF TG_TABLE_NAME = 'job_services' THEN
        IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
            v_action := 'TASK_STATUS_UPDATED';
        ELSE
            v_action := 'TASK_' || TG_OP;
        END IF;
    ELSIF TG_TABLE_NAME = 'jobs' THEN
        v_action := 'JOB_' || TG_OP;
    ELSIF TG_TABLE_NAME = 'job_payments' THEN
        IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
            v_action := 'PAYMENT_STATUS_UPDATED';
        ELSE
            v_action := 'PAYMENT_' || TG_OP;
        END IF;
    ELSIF TG_TABLE_NAME = 'job_expenses' THEN
        IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
            v_action := 'EXPENSE_STATUS_UPDATED';
        ELSE
            v_action := 'EXPENSE_' || TG_OP;
        END IF;
    END IF;

    INSERT INTO public.audit_logs(
        actor_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        v_actor_id,
        v_action,
        v_entity_type,
        v_entity_id,
        v_old_values,
        v_new_values
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to tables
DROP TRIGGER IF EXISTS audit_jobs ON public.jobs;
CREATE TRIGGER audit_jobs
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_job_services ON public.job_services;
CREATE TRIGGER audit_job_services
AFTER INSERT OR UPDATE OR DELETE ON public.job_services
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_job_payments ON public.job_payments;
CREATE TRIGGER audit_job_payments
AFTER INSERT OR UPDATE OR DELETE ON public.job_payments
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_job_expenses ON public.job_expenses;
CREATE TRIGGER audit_job_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.job_expenses
FOR EACH ROW EXECUTE FUNCTION log_audit_event();
