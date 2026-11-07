import { NextResponse } from "next/server";
import { recordWebsiteVisit, getArenaSnapshot } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordApiTelemetry, recordSystemError } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";

    // Prevent visitor count inflation spam
    const rl = checkRateLimit(`visitors:${ipPart}`, 20, 60_000);
    if (!rl.allowed) {
      const snapshot = await getArenaSnapshot();
      recordApiTelemetry("/api/visitors", Date.now() - start, false);
      return NextResponse.json({
        visitorCount: snapshot.visitorCount,
        dbConnected: snapshot.dbConnected,
      });
    }

    const body = await request.json().catch(() => ({}));
    const rawVisitorId =
      typeof body?.visitorId === "string" ? body.visitorId.trim() : "";
    const cleanVisitorId = rawVisitorId
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64);

    const result = await recordWebsiteVisit(cleanVisitorId || ipPart);
    recordApiTelemetry("/api/visitors", Date.now() - start, false, "visit");
    return NextResponse.json(result);
  } catch (err) {
    recordApiTelemetry("/api/visitors", Date.now() - start, true, "visit");
    await recordSystemError({
      source: "server",
      route: "/api/visitors",
      message: err instanceof Error ? err.message : "Visitors API error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    console.error("Visitors API error:", err);
    return NextResponse.json(
      { visitorCount: 1240, dbConnected: false },
      { status: 200 }
    );
  }
}

export async function GET() {
  const start = Date.now();
  const snapshot = await getArenaSnapshot();
  recordApiTelemetry("/api/visitors", Date.now() - start, false);
  return NextResponse.json({
    visitorCount: snapshot.visitorCount,
    dbConnected: snapshot.dbConnected,
  });
}