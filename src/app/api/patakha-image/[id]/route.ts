import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveCardFileById } from "@/lib/patakhas";

export const dynamic = "force-dynamic";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const requestedId = decodeURIComponent(params.id || "");
  const { filePath, archetype } = resolveCardFileById(requestedId);

  if (filePath && fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": getMimeType(filePath),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#14030A"/>
    <rect x="28" y="28" width="744" height="744" rx="28" fill="none" stroke="#FFD166" stroke-width="8"/>
    <text x="400" y="360" text-anchor="middle" font-size="160">${archetype.emoji}</text>
    <text x="400" y="480" text-anchor="middle" fill="#FFD166" font-family="sans-serif" font-weight="900" font-size="52">${archetype.name.toUpperCase()}</text>
  </svg>`;

  return new NextResponse(fallbackSvg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=600",
    },
  });
}