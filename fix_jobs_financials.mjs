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

async function fix() {
  const { data: jobs } = await supabase.from('jobs').select('*');
  if (!jobs) return;

  for (const job of jobs) {
    const { data: charges } = await supabase.from('job_additional_charges').select('amount').eq('job_id', job.id);
    const { data: payments } = await supabase.from('job_payments').select('amount').eq('job_id', job.id);
    
    const totalAdditional = (charges || []).reduce((sum, c) => sum + Number(c.amount), 0);
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const totalBilled = Number(job.work_fee) + Number(job.ministry_fee) + totalAdditional;
    const remaining = Math.max(0, totalBilled - totalPaid);
    
    console.log(`Job ${job.job_code}: Billed=${totalBilled}, Paid=${totalPaid}, Remaining=${remaining}`);
    
    await supabase.from('jobs').update({
      total_fee: totalBilled,
      advance_amount: totalPaid,
      remaining_amount: remaining,
      advance_paid: totalPaid > 0,
      remaining_paid: remaining <= 0
    }).eq('id', job.id);
  }
  console.log('Fixed all jobs!');
}
fix();
