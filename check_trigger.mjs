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

async function check() {
  const { data, error } = await supabase.rpc('get_triggers');
  // Wait, I can just query information_schema if I had postgres access, but anon key can't read information_schema usually.
  // Instead, let's just insert 50 using this script and see what happens!
  const { data: insData, error: insErr } = await supabase.from('job_payments').insert({
    job_id: 'da1a1ce0-e0ed-4d97-b886-d9a7770935c1', // The job id from previous output
    amount: 50,
    payment_method: 'bank_transfer',
    recorded_by: 'a015fea1-418d-4814-abde-c3664f745168'
  }).select();
  console.log("Insert result:");
  console.log(insData || insErr);
}
check();
