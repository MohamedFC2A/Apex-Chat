import { createClient } from "@supabase/supabase-js";

// Clean non-ISO-8859-1 characters (such as Arabic letters, smart quotes, zero-width spaces, RTL/LTR markers)
const cleanEnvValue = (val: string | undefined): string => {
  if (!val) return "";
  // Strip any character outside the ISO-8859-1 range (ASCII and basic Latin-1, code points 0-255)
  return val.replace(/[^\x00-\xFF]/g, "").trim();
};

const isPlaceholder = (val: string): boolean => {
  const v = val.toLowerCase();
  return v.includes("placeholder") || v.includes("your_supabase_") || v.includes("your_api_");
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = cleanEnvValue(rawUrl) || "https://placeholder-project.supabase.co";
const supabaseAnonKey = cleanEnvValue(rawAnonKey) || "placeholder-anon-key";

export const isSupabaseConfigured = !!(
  cleanEnvValue(rawUrl) && !isPlaceholder(cleanEnvValue(rawUrl)) &&
  cleanEnvValue(rawAnonKey) && !isPlaceholder(cleanEnvValue(rawAnonKey))
);

if (!isSupabaseConfigured) {
  console.warn("[Supabase] Missing environment variables. Running in local storage mock mode.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

