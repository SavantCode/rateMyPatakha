import { NextResponse } from "next/server";
import { runHourlyVoteIncrement, getArenaSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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