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
    const { recipientId, type, jobId, metadata, title, body } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Insert DB Notification (Triggers Realtime subscription to frontends automatically)
    const { error: dbError } = await supabaseClient.from('notifications').insert([
      {
        recipient_id: recipientId,
        type: type, // 'alert', 'action_required', 'system', 'payment'
        job_id: jobId,
        title: title,
        body: body,
        metadata: metadata,
        is_read: false
      }
    ]);

    if (dbError) throw dbError;

    // 2. Resolve external comms if critical
    // Retrieve recipient phone/email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, phone')
      .eq('id', recipientId)
      .single();

    if (profile) {
      if (type === 'payment' || type === 'action_required') {
        console.log(`[Resend]: Emailing Critical Alert to ${profile.email}`);
        
        if (profile.phone) {
          // Trigger WhatsApp
          console.log(`[Twilio/WhatsApp Proxy]: Sending WhatsApp template to ${profile.phone}. Message: ${body}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
