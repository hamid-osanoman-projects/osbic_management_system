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

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260808_update_service_ministry_fees.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: migrationSql });
  if (error) console.error("Migration failed:", error);
  else console.log("Migration applied successfully!", data);
}
run();
