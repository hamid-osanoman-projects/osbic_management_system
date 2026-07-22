-- Migration: Add conversation_scope to messages for thread privacy
-- Run this in your Supabase Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_scope TEXT DEFAULT 'staff_client' 
CHECK (conversation_scope IN ('staff_client', 'admin_client'));

-- Backfill existing messages as staff_client (employee↔client thread)
UPDATE public.messages 
SET conversation_scope = 'staff_client' 
WHERE conversation_scope IS NULL;

-- Create index for performance when filtering by scope
CREATE INDEX IF NOT EXISTS idx_messages_job_scope 
ON public.messages(job_id, conversation_scope);
