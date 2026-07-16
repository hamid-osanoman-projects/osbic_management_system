-- ==========================================
-- Fix Infinite Recursion in Chat RLS Policies
-- ==========================================

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view participants of their rooms" ON chat_participants;

-- 2. Create a SECURITY DEFINER function to check membership safely bypassing RLS
CREATE OR REPLACE FUNCTION public.is_chat_member(check_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = check_chat_id AND user_id = auth.uid()
  );
$$;

-- 3. Create the new non-recursive policy
CREATE POLICY "Users can view participants of their rooms" ON chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR is_chat_member(chat_id)
  );
