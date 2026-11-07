import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveCardFileById } from "@/lib/patakhas";

interface CachedImageEntry {
  buffer: Buffer;
  mimeType: string;
  etag: string;
}

const globalForImageBuffers = globalThis as unknown as {
  patakhaImageCache?: Map<string, CachedImageEntry>;
};

function getImageMemoryCache(): Map<string, CachedImageEntry> {
  if (!globalForImageBuffers.patakhaImageCache) {
    globalForImageBuffers.patakhaImageCache = new Map<
      string,
      CachedImageEntry
    >();
  }
  return globalForImageBuffers.patakhaImageCache;
}

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
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestedId = decodeURIComponent(params.id || "").toLowerCase();
  const cache = getImageMemoryCache();

  let entry = cache.get(requestedId);

  if (!entry) {
    const { filePath, archetype } = resolveCardFileById(requestedId);

    if (filePath && fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = getMimeType(filePath);
      const etag = `"card-${archetype.id}-${fileBuffer.length}"`;
      entry = { buffer: fileBuffer, mimeType, etag };
      cache.set(requestedId, entry);
      cache.set(archetype.id, entry);
    } else {
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
        <rect width="800" height="800" fill="#14030A"/>
        <rect x="28" y="28" width="744" height="744" rx="28" fill="none" stroke="#FFD166" stroke-width="8"/>
        <text x="400" y="360" text-anchor="middle" font-size="160">${archetype.emoji}</text>
        <text x="400" y="480" text-anchor="middle" fill="#FFD166" font-family="sans-serif" font-weight="900" font-size="52">${archetype.name.toUpperCase()}</text>
      </svg>`;

      return new NextResponse(fallbackSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: entry.etag,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  }

  return new NextResponse(new Uint8Array(entry.buffer), {
    headers: {
      "Content-Type": entry.mimeType,
      ETag: entry.etag,
      "Cache-Control":
        "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}