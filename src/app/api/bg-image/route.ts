import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGE_EXTENSIONS = new Set([
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".avif",
]);

interface CachedBg {
  buffer: Buffer;
  mimeType: string;
}

const globalForBg = globalThis as unknown as {
  cachedBgImage?: CachedBg;
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  if (globalForBg.cachedBgImage) {
    return new NextResponse(new Uint8Array(globalForBg.cachedBgImage.buffer), {
      headers: {
        "Content-Type": globalForBg.cachedBgImage.mimeType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  }

  const cwd = process.cwd();
  const exactCandidates = [
    path.join(cwd, "background img", "diwali backround.webp"),
    path.join(cwd, "background img", "diwali background.webp"),
    path.join(cwd, "public", "background img", "diwali backround.webp"),
  ];

  for (const candidate of exactCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const buf = fs.readFileSync(candidate);
      const mimeType = getMimeType(candidate);
      globalForBg.cachedBgImage = { buffer: buf, mimeType };
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control":
            "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        },
      });
    }
  }

  const dirCandidates = [
    path.join(cwd, "background img"),
    path.join(cwd, "public", "background img"),
  ];

  for (const dir of dirCandidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
      if (files.length > 0) {
        const chosen = path.join(dir, files[0]);
        const buf = fs.readFileSync(chosen);
        const mimeType = getMimeType(chosen);
        globalForBg.cachedBgImage = { buffer: buf, mimeType };
        return new NextResponse(new Uint8Array(buf), {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control":
              "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        });
      }
    }
  }

  return new NextResponse("Not found", { status: 404 });
}