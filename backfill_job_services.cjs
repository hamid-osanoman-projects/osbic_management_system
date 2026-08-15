const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wyzwpmwspvksgkmesaah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5endwbXdzcHZrc2drbWVzYWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjQ0MjYsImV4cCI6MjA5MDU0MDQyNn0.QIKNZLRM7MwGUk8VWaTAem7VCU1cS9m6GGTfmBzqB8Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching all services from catalog...');
  const { data: services, error: sErr } = await supabase.from('services').select('id, work_fee, ministry_fee');
  if (sErr) return console.error('Error fetching services:', sErr);

  const servicesMap = services.reduce((acc, s) => {
    acc[s.id] = {
      work_fee: Number(s.work_fee) || 0,
      ministry_fee: Number(s.ministry_fee) || 0
    };
    return acc;
  }, {});

  console.log('Fetching all job_services where total_fee is 0 or null...');
  const { data: jobServices, error: jsErr } = await supabase
    .from('job_services')
    .select('id, service_id, service_name, total_fee, work_fee, ministry_fee');
    
  if (jsErr) return console.error('Error fetching job services:', jsErr);

  console.log(`Found ${jobServices.length} total job services. Inspecting...`);
  
  let updatedCount = 0;
  for (const js of jobServices) {
    // If the fees are not set or are 0, let's restore them from the catalog (if the catalog service matches)
    const currentTotal = Number(js.total_fee) || 0;
    const currentWork = Number(js.work_fee) || 0;
    const currentMin = Number(js.ministry_fee) || 0;
    
    // We only update if it is currently 0 or null AND the template service has a non-zero fee
    const template = servicesMap[js.service_id];
    if (template && (currentTotal === 0 || currentWork === 0 || currentMin === 0)) {
      const templateTotal = template.work_fee + template.ministry_fee;
      if (templateTotal > 0) {
        console.log(`Updating "${js.service_name}" (ID: ${js.id}): setting work_fee=${template.work_fee}, ministry_fee=${template.ministry_fee}, total_fee=${templateTotal}`);
        
        const { error: updateErr } = await supabase
          .from('job_services')
          .update({
            work_fee: template.work_fee,
            ministry_fee: template.ministry_fee,
            total_fee: templateTotal
          })
          .eq('id', js.id);
          
        if (updateErr) {
          console.error(`Failed to update ${js.id}:`, updateErr);
        } else {
          updatedCount++;
        }
      }
    }
  }

  console.log(`Successfully backfilled fees for ${updatedCount} job services!`);
}

run();
