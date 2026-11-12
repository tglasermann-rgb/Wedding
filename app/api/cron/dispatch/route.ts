import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchQueued, runSchedules } from "@/lib/messaging/dispatcher";

export const maxDuration = 60;

/** Vercel Cron (see vercel.json) calls this with Authorization: Bearer CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("forbidden", { status: 403 });
  const sb = createAdminClient();
  const schedules = await runSchedules(sb);
  const dispatch = await dispatchQueued(sb, 100);
  return NextResponse.json({ schedules, dispatch });
}
