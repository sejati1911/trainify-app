import { createClient } from '@supabase/supabase-js';

// URL dan anon key diambil dari environment variable, bukan hard-coded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lakukan pengecekan ketat sebelum instansi client dibuat
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Kritis: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diset di file .env!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});