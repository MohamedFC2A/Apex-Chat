import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ikthgedomasbnzqmjziu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrdGhnZWRvbWFzYm56cW1qeml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MTQ1MzIsImV4cCI6MjA5ODE5MDUzMn0.1tVIk623zLy6spd5yk4jdZ95GKZuumLr43UcTojceHI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
