export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? '';
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!projectId || !publicAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in the values.',
  );
}
