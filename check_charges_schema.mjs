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
  const { data: jobs } = await supabase.from('jobs').select('id').limit(1);
  if (!jobs || jobs.length === 0) return console.log('no jobs');
  
  const { data: ins, error } = await supabase.from('job_additional_charges').insert({
    job_id: jobs[0].id,
    description: 'TEST SCHEMA',
    amount: 1
  }).select();
  
  if (ins) {
    console.log(Object.keys(ins[0]));
    await supabase.from('job_additional_charges').delete().eq('id', ins[0].id);
  } else {
    console.log(error);
  }
}
run();
