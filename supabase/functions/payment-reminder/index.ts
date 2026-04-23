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
    const { jobId, stepIndex } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: job } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) throw new Error("Job not found");

    // Math calculation determining 2nd to last step proximity
    if ((job.total_steps - stepIndex) <= 2) {
      if (!job.remaining_paid && job.remaining_due_amount > 0) {
        
        // Push notification block
        await supabaseClient.from('notifications').insert([
          {
            recipient_id: job.client_id,
            type: 'payment',
            job_id: job.id,
            title: `Payment Remaining: ${job.remaining_due_amount} OMR`,
            body: `Your service is approaching finalization. Please settle the outstanding balance of ${job.remaining_due_amount} OMR to receive your documentation.`
          }
        ]);

        console.log(`[Email Proxy]: Fired email reminder to Client ID ${job.client_id} for ${job.remaining_due_amount} OMR.`);
        
        return new Response(JSON.stringify({ triggered: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ triggered: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
