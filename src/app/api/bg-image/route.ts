import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set([
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".avif",
]);

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
  const cwd = process.cwd();
  const exactCandidates = [
    path.join(cwd, "background img", "diwali backround.webp"),
    path.join(cwd, "background img", "diwali background.webp"),
    path.join(cwd, "public", "background img", "diwali backround.webp"),
  ];

  for (const candidate of exactCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const buf = fs.readFileSync(candidate);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": getMimeType(candidate),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // Fallback: scan `background img` folder for any image file
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
        return new NextResponse(buf, {
          headers: {
            "Content-Type": getMimeType(chosen),
            "Cache-Control": "no-store",
          },
        });
      }
    }
  }

  return new NextResponse("Not found", { status: 404 });
}