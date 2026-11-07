import { NextResponse } from "next/server";
import { getArenaSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getArenaSnapshot();
  return NextResponse.json(snapshot);
}