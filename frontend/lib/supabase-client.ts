import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ugncwmbksjmmrchamuhu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbmN3bWJrc2ptbXJjaGFtdWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTg0NjMsImV4cCI6MjA2NjQzNDQ2M30.1PIdSsOzjU2k8F3Eejw73rhFCFH_bwUy6E4svC_lUyU";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
