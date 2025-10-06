// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// ✅ Ensure consistent variable names (defined in frontend/.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ Safety check and helpful console warning
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Missing Supabase environment variables. Please add the following to your frontend/.env file:\n" +
    "VITE_SUPABASE_URL=your-project-url\n" +
    "VITE_SUPABASE_ANON_KEY=your-anon-key\n"
  );
}

// ✅ Create the Supabase client safely
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, // keeps user logged in across refreshes
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});

// ✅ Optional: log successful connection in development
if (import.meta.env.DEV) {
  console.log("✅ Supabase client initialized successfully:", SUPABASE_URL);
}

// ✅ Export default for flexibility in imports
export default supabase;
