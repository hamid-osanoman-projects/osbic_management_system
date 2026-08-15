const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wyzwpmwspvksgkmesaah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5endwbXdzcHZrc2drbWVzYWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQ0MjYsImV4cCI6MjA5MDU0MDQyNn0.QIKNZLRM7MwGUk8VWaTAem7VCU1cS9m6GGTfmBzqB8Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: jobs, error: jobErr } = await supabase.from('jobs').select('id, job_number').order('created_at', { ascending: false }).limit(3);
  if (jobErr) return console.error('Job error:', jobErr);
  console.log('Recent jobs:', jobs);
  
  for (const job of jobs) {
    const { data: svcs, error: svcErr } = await supabase.from('job_services').select('id, service_name, total_fee, work_fee, ministry_fee, is_funded').eq('job_id', job.id);
    if (svcErr) {
      console.error('Svc error:', svcErr);
    } else {
      console.log(`Services for ${job.job_number} (${job.id}):`, svcs);
    }
  }
}

check();
