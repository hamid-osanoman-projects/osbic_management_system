import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env vars from .env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// For admin tasks, it's better to use Service Role Key, but maybe Anon Key works if we sign in?
// Actually, I can just use the Service Role Key if it exists in .env, otherwise I'll just check if the profile exists.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWalkIn() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('full_name', 'Walk-in Customer');
    
  console.log("Walk-in Customer Profiles:", data);
  console.log("Error:", error);
}

checkWalkIn();
