import { NextResponse } from "next/server";
import crypto from "crypto";
import { voteForProfile, sanitizeHandle } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const rl = checkRateLimit(`vote:${ipPart}`, 25, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many vote requests. Please wait a moment!" },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawHandle = typeof body?.handle === "string" ? body.handle : "";
    const handle = sanitizeHandle(rawHandle);
    const clientVoterId =
      typeof body?.voterId === "string" ? body.voterId.trim().slice(0, 64) : "";

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

    const result = await voteForProfile(handle, ipUaFingerprint);
    if (!result.profile) {
      return NextResponse.json(
        { error: "Profile not found in Arena" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}