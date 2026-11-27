import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

/**
 * Client Supabase (clé publique uniquement). Flux PKCE : les liens e-mail
 * reviennent avec `?code=` dans la query string, sans gêner le routeur par hash.
 */
export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "missing-key", {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "outrs-auth",
  },
});
