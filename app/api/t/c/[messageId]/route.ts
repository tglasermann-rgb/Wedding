import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStatus } from "@/lib/messaging/dispatcher";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const app = env.appUrl();
  const target = req.nextUrl.searchParams.get("u") ?? app;
  let dest: URL;
  try {
    dest = new URL(target);
  } catch {
    dest = new URL(app);
  }
  // Only redirect to http(s). Third-party links are allowed because they come from the couple's own templates.
  if (!["http:", "https:"].includes(dest.protocol)) dest = new URL(app);
  if (UUID.test(messageId)) await applyStatus(createAdminClient(), { id: messageId }, "clicked").catch(() => null);
  return NextResponse.redirect(dest, 302);
}
