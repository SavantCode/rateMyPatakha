import { NextResponse } from "next/server";
import { findRegisteredProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile?u=username
 * Checks in real time if a username has ALREADY created their Patakha Card in the DB,
 * returning their registered card, live vote count, clan rank, and overall rank.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUser = searchParams.get("u") || "";

    if (!rawUser.trim()) {
      return NextResponse.json({ exists: false, profile: null });
    }

    const existingProfile = await findRegisteredProfile(rawUser);
    if (!existingProfile) {
      return NextResponse.json({ exists: false, profile: null });
    }

    return NextResponse.json({
      exists: true,
      profile: existingProfile,
    });
  } catch (err) {
    console.error("Profile lookup error:", err);
    return NextResponse.json({ exists: false, profile: null }, { status: 200 });
  }
}