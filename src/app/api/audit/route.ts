import { NextResponse } from "next/server";
import { getArenaSnapshot } from "@/lib/store";
import {
  getAuditTelemetrySnapshot,
  recordApiTelemetry,
  recordSystemError,
} from "@/lib/telemetry";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    const [arena, telemetry] = await Promise.all([
      getArenaSnapshot(),
      getAuditTelemetrySnapshot(),
    ]);

    recordApiTelemetry("/api/audit", Date.now() - start, false);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      arena: {
        visitorCount: arena.visitorCount,
        totalCreators: arena.totalCreators,
        totalVotes: arena.totalVotes,
        dbConnected: arena.dbConnected,
        clans: arena.clans,
        topProfiles: arena.profiles.slice(0, 15),
        recentEvents: arena.recentEvents,
      },
      telemetry,
    });
  } catch (err) {
    recordApiTelemetry("/api/audit", Date.now() - start, true);
    await recordSystemError({
      source: "server",
      route: "/api/audit",
      message: err instanceof Error ? err.message : "Audit snapshot error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { status: "error", error: "Failed to load audit snapshot" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit
 * Receives client-side `window.onerror` / `unhandledrejection` crash reports
 * or developer test crash events and persists them for `/audit` inspection.
 */
export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const rl = checkRateLimit(`audit-err:${ipPart}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ recorded: false }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "Unknown client error";
    const route =
      typeof body?.route === "string" ? body.route.trim() : "client";
    const stack = typeof body?.stack === "string" ? body.stack : undefined;
    const source =
      body?.source === "server" || body?.source === "mongodb"
        ? body.source
        : "client";

    await recordSystemError({
      source,
      route,
      message,
      stack,
      userAgent,
    });

    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}