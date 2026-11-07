import { NextResponse } from "next/server";
import { getArenaSnapshot } from "@/lib/store";
import { recordApiTelemetry } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const start = Date.now();
  const snapshot = await getArenaSnapshot();

  const latestEventId = snapshot.recentEvents[0]?.id || "0";
  const battlesSig = snapshot.activeBattles
    .map((b) => `${b.id}:${b.hours}:${b.startMs}:${b.totalBattleVotes}`)
    .join("|");

  const etag = `W/"arena-${snapshot.totalVotes}-${snapshot.totalCreators}-${snapshot.visitorCount}-${latestEventId}-${battlesSig}"`;
  const ifNoneMatch = request.headers.get("if-none-match");

  recordApiTelemetry("/api/leaderboard", Date.now() - start, false);

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  return NextResponse.json(snapshot, {
    headers: {
      ETag: etag,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}