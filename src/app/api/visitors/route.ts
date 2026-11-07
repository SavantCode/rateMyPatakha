import { NextResponse } from "next/server";
import { recordWebsiteVisit, getArenaSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const visitorId =
      typeof body?.visitorId === "string" ? body.visitorId.trim() : "";

    const result = await recordWebsiteVisit(visitorId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Visitors API error:", err);
    return NextResponse.json(
      { visitorCount: 1240, dbConnected: false },
      { status: 200 }
    );
  }
}

export async function GET() {
  const snapshot = await getArenaSnapshot();
  return NextResponse.json({
    visitorCount: snapshot.visitorCount,
    dbConnected: snapshot.dbConnected,
  });
}