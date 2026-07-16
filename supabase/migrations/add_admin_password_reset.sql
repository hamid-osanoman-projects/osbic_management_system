-- Extension pgcrypto must be enabled in order to encrypt passwords securely
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create an RPC function that allows an admin to update a user's password directly
CREATE OR REPLACE FUNCTION public.admin_update_user_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- executes as the creator of the function (usually postgres/superuser)
AS $$
BEGIN
  -- 1. Check if the user calling this function is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reset passwords.';
  END IF;

  -- 2. Update the encrypted password for the target user in the auth.users table
  -- We use the crypt function with gen_salt('bf') which matches Supabase's internal bcrypt implementation
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- Verify that a row was actually updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.';
  END IF;
END;
$$;
