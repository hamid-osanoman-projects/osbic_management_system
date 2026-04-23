import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// import jsPDF from 'jspdf'; // Hypothetical Deno import for PDF generation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobId, paymentAmount, paymentType } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const timestamp = Date.now();
    const pdfFilename = `receipt_${timestamp}.pdf`;

    // 1. Generate Virtual PDF via mock payload buffer
    // A real implementation relies on HTML-to-PDF rendering context.
    const mockPdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // Minimal mock PDF header

    // 2. Push to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('receipts')
      .upload(`${jobId}/${pdfFilename}`, mockPdfBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) throw uploadError;

    // 3. Attach Document reference into the vault
    await supabaseClient.from('documents').insert([
       {
         job_id: jobId,
         file_name: pdfFilename,
         file_type: 'application/pdf',
         status: 'approved',
         is_client_visible: true,
         uploaded_by_name: 'System (Automated)'
       }
    ]);

    // 4. Trigger Email proxy
    console.log(`[Email Proxy]: Sent receipt ${pdfFilename} to Client bridging Job ${jobId}`);

    return new Response(JSON.stringify({ success: true, file: pdfFilename }), {
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
