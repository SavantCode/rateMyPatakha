import { NextResponse } from "next/server";
import { runHourlyVoteIncrement, getArenaSnapshot } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // If CRON_SECRET is configured on Vercel, enforce Bearer token auth
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "cron";
    const rl = checkRateLimit(`cron:${ipPart}`, 6, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const result = await runHourlyVoteIncrement();
    if (result.incrementedBy > 0) {
      await getArenaSnapshot(true);
    }
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}