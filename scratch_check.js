import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyzwpmwspvksgkmesaah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5endwbXdzcHZrc2drbWVzYWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQ0MjYsImV4cCI6MjA5MDU0MDQyNn0.QIKNZLRM7MwGUk8VWaTAem7VCU1cS9m6GGTfmBzqB8Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const sql = `
    SELECT 
      tgname AS trigger_name,
      proname AS function_name
    FROM pg_trigger 
    JOIN pg_proc ON pg_proc.oid = tgfoid 
    WHERE tgrelid = 'public.leads'::regclass;
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  console.log('--- TRIGGERS ON LEADS ---');
  if (error) console.error(error);
  else console.log(data);
}

check();
