import { createAdminClient } from "@/lib/supabase/admin";
import { applyStatus } from "@/lib/messaging/dispatcher";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  if (UUID.test(messageId)) await applyStatus(createAdminClient(), { id: messageId }, "opened").catch(() => null);
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
