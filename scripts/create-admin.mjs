// Run this script once to create the admin user in Supabase
// Usage: node scripts/create-admin.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wyzwpmwspvksgkmesaah.supabase.co';
// You need the SERVICE ROLE KEY (not the anon key) to create users via Admin API
// Get it from: Supabase Dashboard → Project Settings → API → service_role key
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.');
  console.error('   Run: $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" (PowerShell)');
  console.error('   Then retry: node scripts/create-admin.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
  console.log('🔑 Creating admin user in Supabase Auth...');

  // Step 1: Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@gmail.com',
    password: 'admin123',
    email_confirm: true, // Skip email confirmation
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('⚠️  User admin@gmail.com already exists in Auth. Getting their ID...');
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users.find(u => u.email === 'admin@gmail.com');
      if (existing) {
        await upsertProfile(existing.id);
        return;
      }
    }
    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  console.log('✅ Auth user created! ID:', authData.user.id);
  await upsertProfile(authData.user.id);
}

async function upsertProfile(userId) {
  console.log('📝 Inserting admin profile in public.profiles...');

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'Master Admin',
      email: 'admin@gmail.com',
      role: 'admin',
      is_active: true,
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('❌ Profile error:', profileError.message);
    console.error('   You may need to manually insert in Supabase SQL Editor.');
    console.error(`   INSERT INTO public.profiles (id, full_name, email, role, is_active)`);
    console.error(`   VALUES ('${userId}', 'Master Admin', 'admin@gmail.com', 'admin', true)`);
    console.error(`   ON CONFLICT (id) DO UPDATE SET role = 'admin';`);
    process.exit(1);
  }

  console.log('');
  console.log('🎉 SUCCESS! Admin user is ready.');
  console.log('   Email:    admin@gmail.com');
  console.log('   Password: admin123');
  console.log('   Role:     admin');
  console.log('');
  console.log('Now login at: http://localhost:5174/login');
}

createAdmin();
