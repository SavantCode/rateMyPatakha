import { NextResponse } from "next/server";
import {
  startOrSyncArenaBattle,
  getArenaSnapshot,
  sanitizeHandle,
} from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordApiTelemetry, recordSystemError } from "@/lib/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const snapshot = await getArenaSnapshot();
  recordApiTelemetry("/api/battle", Date.now() - start, false);
  return NextResponse.json({
    activeBattles: snapshot.activeBattles,
  });
}

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";

    const rl = checkRateLimit(`battle:${ipPart}`, 40, 60_000);
    if (!rl.allowed) {
      recordApiTelemetry("/api/battle", Date.now() - start, false);
      return NextResponse.json(
        { error: "Too many battle updates. Please wait a moment!" },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawA = typeof body?.handleA === "string" ? body.handleA : "";
    const rawB = typeof body?.handleB === "string" ? body.handleB : "";
    const handleA = sanitizeHandle(rawA);
    const handleB = sanitizeHandle(rawB);
    const hours =
      typeof body?.hours === "number"
        ? Math.min(48, Math.max(1, Math.round(body.hours)))
        : undefined;
    const startMs =
      typeof body?.startMs === "number" ? body.startMs : undefined;
    const forceUpdate = Boolean(body?.forceUpdate);

    if (!handleA) {
      return NextResponse.json(
        { error: "Valid Challenger 1 username is required" },
        { status: 400 }
      );
    }

    const result = await startOrSyncArenaBattle({
      handleA,
      handleB,
      hours,
      startMs,
      forceUpdate,
    });

    recordApiTelemetry("/api/battle", Date.now() - start, false);
    return NextResponse.json(result);
  } catch (err) {
    recordApiTelemetry("/api/battle", Date.now() - start, true);
    await recordSystemError({
      source: "server",
      route: "/api/battle",
      message: err instanceof Error ? err.message : "Failed to sync 1v1 battle",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to start or sync 1v1 battle" },
      { status: 500 }
    );
  }
}