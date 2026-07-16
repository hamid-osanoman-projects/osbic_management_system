import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf8');

let VITE_SUPABASE_URL = '';
let VITE_SUPABASE_ANON_KEY = '';

env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) VITE_SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) VITE_SUPABASE_ANON_KEY = line.split('=')[1].trim();
});

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function run() {
  // Use postgres function or direct query if possible. Since we only have REST API, we can't run raw SQL.
  // Wait, I can't run raw SQL using supabase-js. 
  // Do I have an RPC for raw SQL?
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE job_additional_charges ADD COLUMN IF NOT EXISTS sub_task_id UUID REFERENCES job_sub_tasks(id) ON DELETE CASCADE;' });
  console.log("RPC Error:", error);
}
run();
