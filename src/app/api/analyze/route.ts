import { NextResponse } from "next/server";
import {
  classifyProfileToPatakha,
  normalizeSubstackInput,
} from "@/lib/classifier";
import { getAvailablePatakhas } from "@/lib/patakhas";
import { getOrCreateArenaProfile } from "@/lib/store";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipPart = forwardedFor.split(",")[0]?.trim() || "local";

    const rl = checkRateLimit(`analyze:${ipPart}`, 35, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Slow down! Too many requests in a minute." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawInput = typeof body?.input === "string" ? body.input : "";
    const preferredPatakhaId =
      typeof body?.patakhaId === "string" ? body.patakhaId.trim() : "";
    const allowCardUpdate = Boolean(body?.allowCardUpdate);
    const creatorToken =
      typeof body?.creatorToken === "string" ? body.creatorToken.trim() : "";

    if (!rawInput.trim()) {
      return NextResponse.json(
        { error: "Please enter a profile URL or username" },
        { status: 400 }
      );
    }

    const { handle, inferredUrl } = normalizeSubstackInput(rawInput);

    if (!handle) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid username containing letters or numbers (e.g. @rohan)",
        },
        { status: 400 }
      );
    }

    const available = getAvailablePatakhas();
    const explicitCard = preferredPatakhaId
      ? available.find((p) => p.id === preferredPatakhaId.toLowerCase())
      : undefined;

    const classification = explicitCard
      ? { patakhaId: explicitCard.id, patakha: explicitCard }
      : classifyProfileToPatakha({
          handle,
          name: handle,
          profileUrl: inferredUrl,
        });

    const {
      profile,
      snapshot,
      isNew,
      alreadyExists,
      creatorToken: issuedToken,
    } = await getOrCreateArenaProfile({
      id: handle,
      handle,
      name: handle,
      profileUrl: inferredUrl,
      patakhaId: classification.patakhaId,
      allowCardUpdate,
      creatorToken,
    });

    return NextResponse.json({
      profile,
      patakha: classification.patakha,
      isNew,
      alreadyExists,
      creatorToken: issuedToken,
      snapshot,
    });
  } catch (err) {
    console.error("Error categorizing profile:", err);
    return NextResponse.json(
      { error: "Failed to categorize profile. Try entering your username!" },
      { status: 500 }
    );
  }
}