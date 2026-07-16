-- 1. Create the Walk-in Customer Profile if it doesn't exist
DO $$ 
DECLARE
  walk_in_client_id UUID;
  quick_task_service_id UUID;
BEGIN
  -- Check for existing walk-in customer profile
  SELECT id INTO walk_in_client_id FROM public.profiles WHERE full_name = 'Walk-in Customer' AND role = 'client' LIMIT 1;
  
  IF walk_in_client_id IS NULL THEN
    -- Generate a new UUID for the user
    walk_in_client_id := gen_random_uuid();
    
    -- Insert into auth.users to satisfy the foreign key constraint
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      walk_in_client_id, 
      '00000000-0000-0000-0000-000000000000', 
      'authenticated', 
      'authenticated', 
      'walkin_' || floor(random() * 900000 + 100000)::text || '@osbic.local', 
      crypt('QuickTask123!', gen_salt('bf')), 
      now(), 
      '{"provider":"email","providers":["email"]}', 
      '{"full_name":"Walk-in Customer", "role_app":"client"}', 
      now(), 
      now()
    );

    -- Check if the trigger already created the profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = walk_in_client_id) THEN
      INSERT INTO public.profiles (id, full_name, role, is_active)
      VALUES (walk_in_client_id, 'Walk-in Customer', 'client', true);
    ELSE
      -- Update it just to be sure it has the right name and role
      UPDATE public.profiles SET full_name = 'Walk-in Customer', role = 'client' WHERE id = walk_in_client_id;
    END IF;
  END IF;

  -- 2. Create the Quick Task Service if it doesn't exist
  SELECT id INTO quick_task_service_id FROM public.services WHERE name_en = 'Quick Task (POS)' LIMIT 1;
  
  IF quick_task_service_id IS NULL THEN
    INSERT INTO public.services (name_en, name_ar, category, is_active, work_fee, ministry_fee)
    VALUES ('Quick Task (POS)', 'مهمة سريعة', 'other', true, 0, 0)
    RETURNING id INTO quick_task_service_id;
  END IF;

END $$;

-- 3. Create a unified RPC function for Quick Tasks so employees can bypass complex RLS and do a single atomic transaction
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
BEGIN
  -- Get the Walk-in Customer ID
  SELECT id INTO v_client_id FROM public.profiles WHERE full_name = 'Walk-in Customer' AND role = 'client' LIMIT 1;
  
  -- Get the Quick Task Service ID
  SELECT id INTO v_service_id FROM public.services WHERE name_en = 'Quick Task (POS)' LIMIT 1;

  -- 1. Insert the Job
  INSERT INTO public.jobs (
    job_code,
    client_id,
    employee_id,
    assigned_by,
    service_id,
    status,
    total_fee,
    work_fee,
    ministry_fee,
    ministry_fee_type,
    advance_percentage,
    notes,
    started_at,
    completed_at
  ) VALUES (
    'QT-' || floor(random() * 900000 + 100000)::text,
    v_client_id,
    p_employee_id,
    p_employee_id,
    v_service_id,
    p_status,
    p_amount,
    p_amount,
    0,
    'fixed',
    0,
    'Walk-in Name: ' || COALESCE(p_customer_name, 'Anonymous') || CASE WHEN p_customer_phone IS NOT NULL AND p_customer_phone != '' THEN ' (' || p_customer_phone || ')' ELSE '' END || ' | Task: ' || p_task_description,
    NOW(),
    CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END
  ) RETURNING id INTO v_job_id;

  -- 2. Insert the Payment ONLY if completed and amount > 0
  IF p_status = 'completed' AND p_amount > 0 THEN
    INSERT INTO public.job_payments (
      job_id,
      amount,
      payment_method,
      notes,
      recorded_by
    ) VALUES (
      v_job_id,
      p_amount,
      p_payment_method,
      'POS Quick Payment',
      p_employee_id
    ) RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'payment_id', v_payment_id
  );
END;
$$;
