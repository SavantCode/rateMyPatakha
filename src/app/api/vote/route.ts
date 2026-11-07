import { NextResponse } from "next/server";
import crypto from "crypto";
import { voteForProfile, sanitizeHandle } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordApiTelemetry, recordSystemError } from "@/lib/telemetry";

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const rl = checkRateLimit(`vote:${ipPart}`, 35, 60_000);
    if (!rl.allowed) {
      recordApiTelemetry("/api/vote", Date.now() - start, false);
      return NextResponse.json(
        { error: "Too many vote requests. Please wait a moment!" },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawHandle = typeof body?.handle === "string" ? body.handle : "";
    const handle = sanitizeHandle(rawHandle);
    const clientVoterId =
      typeof body?.voterId === "string"
        ? body.voterId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
        : "";
    const voterHandle =
      typeof body?.voterHandle === "string"
        ? sanitizeHandle(body.voterHandle)
        : "";

    if (!handle) {
      return NextResponse.json(
        { error: "Valid username is required" },
        { status: 400 }
      );
    }

    // Server-enforced SHA-256 fingerprint combining IP + User-Agent + Client ID
    const ipUaFingerprint = crypto
      .createHash("sha256")
      .update(`v1:${ipPart}:${userAgent.slice(0, 120)}:${clientVoterId}`)
      .digest("hex")
      .slice(0, 24);

    const result = await voteForProfile(handle, ipUaFingerprint, voterHandle);
    if (!result.profile) {
      recordApiTelemetry("/api/vote", Date.now() - start, false);
      return NextResponse.json(
        { error: "Profile not found in Arena" },
        { status: 404 }
      );
    }

    recordApiTelemetry("/api/vote", Date.now() - start, false, "vote");
    return NextResponse.json(result);
  } catch (err) {
    recordApiTelemetry("/api/vote", Date.now() - start, true, "vote");
    await recordSystemError({
      source: "server",
      route: "/api/vote",
      message: err instanceof Error ? err.message : "Failed to record vote",
      stack: err instanceof Error ? err.stack : undefined,
    });
    console.error("Vote error:", err);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}