-- Recreate the create_quick_task function to set the job's branch_id based on the creator employee's branch_id
CREATE OR REPLACE FUNCTION create_quick_task(
  p_employee_id UUID,
  p_task_description TEXT,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_service_id UUID;
  v_job_id UUID;
  v_payment_id UUID;
  v_branch_id UUID;
BEGIN
  -- 1. Get the employee's branch ID
  SELECT branch_id INTO v_branch_id FROM public.profiles WHERE id = p_employee_id LIMIT 1;

  -- 2. Get the Walk-in Customer ID
  SELECT id INTO v_client_id FROM public.profiles WHERE full_name = 'Walk-in Customer' AND role = 'client' LIMIT 1;
  
  -- 3. If missing, dynamically create the user and profile
  IF v_client_id IS NULL THEN
    v_client_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_client_id, 
      '00000000-0000-0000-0000-000000000000', 
      'authenticated', 
      'authenticated', 
      'walkin_' || floor(random() * 9000000 + 1000000)::text || '@osbic.local', 
      crypt('QuickTask123!', gen_salt('bf')), 
      now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"full_name":"Walk-in Customer", "role_app":"client"}', 
      now(), 
      now()
    );
    
    INSERT INTO public.profiles (id, full_name, role, is_active, branch_id)
    VALUES (v_client_id, 'Walk-in Customer', 'client', true, v_branch_id);
  END IF;
  
  -- 4. Get the Quick Task Service ID
  SELECT id INTO v_service_id FROM public.services WHERE name_en = 'Quick Task (POS)' LIMIT 1;

  -- 5. Create the service if missing
  IF v_service_id IS NULL THEN
    INSERT INTO public.services (name_en, name_ar, category, is_active, work_fee, ministry_fee)
    VALUES ('Quick Task (POS)', 'مهمة سريعة', 'other', true, 0, 0)
    RETURNING id INTO v_service_id;
  END IF;

  -- 6. Insert the Job
  INSERT INTO public.jobs (
    job_code,
    client_id,
    employee_id,
    assigned_by,
    service_id,
    status,
    total_fee,
    work_fee,
    notes,
    started_at,
    completed_at,
    branch_id
  ) VALUES (
    'QT-' || floor(random() * 900000 + 100000)::text,
    v_client_id,
    p_employee_id,
    p_employee_id,
    v_service_id,
    p_status,
    p_amount,
    p_amount,
    'Walk-in Name: ' || COALESCE(p_customer_name, 'Anonymous') || CASE WHEN p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN ' (' || p_customer_phone || ')' ELSE '' END || ' | Task: ' || p_task_description,
    NOW(),
    CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END,
    v_branch_id
  ) RETURNING id INTO v_job_id;

  -- 7. Insert transaction
  INSERT INTO public.job_payments (
    job_id,
    payment_type,
    amount,
    payment_method,
    status,
    received_by,
    created_at
  ) VALUES (
    v_job_id,
    'advance',
    p_amount,
    p_payment_method,
    'verified',
    p_employee_id,
    NOW()
  ) RETURNING id INTO v_payment_id;

  -- 8. Auto-create workflow steps
  INSERT INTO public.job_services (
    job_id,
    service_id,
    service_name,
    display_order,
    status,
    work_fee,
    ministry_fee,
    total_fee,
    ministry_fee_allocated,
    is_funded,
    quantity,
    item_number
  ) VALUES (
    v_job_id,
    v_service_id,
    'Quick Task (POS)',
    1,
    'completed',
    p_amount,
    0,
    p_amount,
    0,
    true,
    1,
    1
  );

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'client_id', v_client_id,
    'payment_id', v_payment_id
  );
END;
$$;

-- Clean up existing jobs that have no branch_id by mapping them to their creator/employee's branch
UPDATE public.jobs j
SET branch_id = p.branch_id
FROM public.profiles p
WHERE j.employee_id = p.id
  AND j.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

-- Clean up existing client profiles that have no branch_id by mapping them to their creator employee's branch
UPDATE public.profiles c
SET branch_id = p.branch_id
FROM public.profiles p
WHERE c.created_by = p.id
  AND c.role = 'client'
  AND c.branch_id IS NULL
  AND p.branch_id IS NOT NULL;

