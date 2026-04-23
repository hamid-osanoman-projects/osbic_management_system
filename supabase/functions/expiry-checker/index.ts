import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch expiring jobs targeting 60 days
    const { data: jobs60, error: err60 } = await supabaseClient
      .rpc('get_expiring_jobs_60'); // Assuming an RPC or direct SQL filter exists
      // Fallback manual query for prototyping:
    const { data: rawJobs } = await supabaseClient
      .from('jobs')
      .select('id, job_code, client_id, employee_id, service_name, service_expiry_date, expiry_reminder_60_sent')
      .eq('status', 'completed')
      .not('service_expiry_date', 'is', null)
      .eq('expiry_reminder_60_sent', false);

    let remindersSent = 0;

    // VERY simplified date logic for serverless prototype
    const now = new Date();
    const plus60 = new Date();
    plus60.setDate(now.getDate() + 60);

    const expiringToProcess = (rawJobs || []).filter(j => {
      const expDate = new Date(j.service_expiry_date);
      return expDate <= plus60;
    });

    for (const job of expiringToProcess) {
       // A. Notify Client
       await supabaseClient.from('notifications').insert({
         recipient_id: job.client_id,
         type: 'action_required',
         job_id: job.id,
         title: `Urgent: ${job.service_name} Expiring`,
         body: `Your service document will expire within 60 days on ${new Date(job.service_expiry_date).toLocaleDateString()}. Please contact us to renew.`
       });
       
       // B. Notify Employee/Admin logic here
       await supabaseClient.from('notifications').insert({
         recipient_id: job.employee_id,
         type: 'system',
         job_id: job.id,
         title: `Client Expiry Alert: ${job.job_code}`,
         body: `System generated 60-day expiry warning for client.`
       });

       // C. Toggle boolean flag
       await supabaseClient.from('jobs').update({ expiry_reminder_60_sent: true }).eq('id', job.id);
       remindersSent++;
    }

    // Identical logic loops for 30-day thresholds would follow here.

    return new Response(JSON.stringify({ success: true, remindersSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
