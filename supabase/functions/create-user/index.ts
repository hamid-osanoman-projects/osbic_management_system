import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// import { Resend } from "https://esm.sh/resend"; // Assuming Resend mock usage

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

    const { email, fullName, role, createdBy } = await req.json();

    // 1. Generate Secure Metadata
    const password = crypto.randomUUID().slice(0, 12) + "X@!"; 
    const username = `${fullName.split(' ')[0].toLowerCase()}.${crypto.randomUUID().slice(0, 4)}`;
    
    let userCodePrefix = role === 'employee' ? 'EMP' : 'CLT';
    const userCode = `${userCodePrefix}-${Math.floor(1000 + Math.random() * 9000)}`; // e.g. CLT-4938

    // 2. Create Auth User
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role_app: role,
        username: username,
      }
    });

    if (authError) throw authError;

    // 3. Create Profile Record
    const { error: profileError } = await supabaseClient.from('profiles').insert([
      {
        id: authData.user.id,
        employee_code: userCode,
        full_name: fullName,
        email: email,
        role: role,
        is_active: true,
        created_by: createdBy
      }
    ]);

    if (profileError) {
      // Rollback Auth if Profile fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 4. Send Welcome Email (Placeholder via Resend)
    console.log(`[Resend Email Triggered]: Sending Welcome to ${email}`);
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    // await resend.emails.send({
    //   from: 'OSBIC <noreply@osbic.com>',
    //   to: email,
    //   subject: 'Welcome to OSBIC System',
    //   html: `<p>Welcome ${fullName}, your login is ${email} and temp password is: ${password}</p>`
    // });

    // 5. Return Credentials explicitly exactly once
    return new Response(
      JSON.stringify({
        userId: authData.user.id,
        username,
        password, // RETURNED ONLY ONCE TO INVOKER
        userCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
