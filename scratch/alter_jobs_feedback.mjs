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
  console.log("Running migration to add client_rating and client_feedback to jobs table...");
  
  const sqlCommand = `
    ALTER TABLE public.jobs 
    ADD COLUMN IF NOT EXISTS client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
    ADD COLUMN IF NOT EXISTS client_feedback TEXT;
  `;
  
  const { data, error } = await supabase.rpc('execute_sql', { sql: sqlCommand });
  
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration executed successfully. Result:", data);
  }
}

run();
