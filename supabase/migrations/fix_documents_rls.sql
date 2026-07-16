-- ==========================================
-- Fix RLS policies for documents
-- ==========================================

-- Drop the overly restrictive employee policy
DROP POLICY IF EXISTS "Employees access docs for assigned jobs" ON public.documents;

-- Recreate it to allow employees to access ALL documents 
-- (since coworkers need to see docs even if they are not the lead officer of the job)
CREATE POLICY "Employees have full access to documents"
ON public.documents
FOR ALL
USING (auth.jwt() ->> 'role_app' = 'employee')
WITH CHECK (auth.jwt() ->> 'role_app' = 'employee');

-- Also, ensure Storage policies allow authenticated uploads to the documents bucket
-- (This fixes the 400 Bad Request on the storage side if it's an RLS issue)
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Give authenticated users full access to documents bucket" ON storage.objects;

CREATE POLICY "Give authenticated users full access to documents bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'documents' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
