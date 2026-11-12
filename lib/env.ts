/** Centralised env access. Functions (not constants) so builds work without secrets. */
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}
export const env = {
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => req("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  cronSecret: () => process.env.CRON_SECRET ?? "",
  sender: () =>
    process.env.SENDER_API_KEY
      ? { apiKey: process.env.SENDER_API_KEY, fromEmail: req("EMAIL_FROM"), fromName: process.env.EMAIL_FROM_NAME ?? "Invitaciones" }
      : null,
  whatsapp: () =>
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      ? { token: process.env.WHATSAPP_TOKEN, phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID }
      : null,
  whatsappAppSecret: () => process.env.WHATSAPP_APP_SECRET ?? "",
  whatsappVerifyToken: () => process.env.WHATSAPP_VERIFY_TOKEN ?? "",
};
