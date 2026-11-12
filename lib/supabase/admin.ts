import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/** Service-role client. Bypasses RLS: only for public guest flows, webhooks and cron after validating input. */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceKey(), { auth: { persistSession: false } });
}
