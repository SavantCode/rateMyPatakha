import fs from "fs";
import path from "path";

export type PatakhaId = string;

export interface PatakhaArchetype {
  id: PatakhaId;
  index: number;
  name: string;
  fileName: string;
  emoji: string;
  accentHex: string;
  imageUrl: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
]);

const EMOJI_PALETTE = ["🧨", "💣", "🚀", "✨", "🧧", "🌀", "🌋", "🔥", "🪔", "⚡"];
const COLOR_PALETTE = [
  "#FF3B30",
  "#F59E0B",
  "#38BDF8",
  "#F472B6",
  "#34D399",
  "#C084FC",
  "#FB923C",
  "#FACC15",
  "#EF4444",
  "#A855F7",
];

function toSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "patakha"
  );
}

function toDisplayName(baseName: string): string {
  return baseName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// High-traffic cache for `./cards` directory scan so disk I/O never blocks requests
const globalForCardsCache = globalThis as unknown as {
  cachedPatakhas?: PatakhaArchetype[];
  cachedAt?: number;
  resolvedFileCache?: Map<
    string,
    { filePath: string | null; archetype: PatakhaArchetype }
  >;
};

const CARDS_CACHE_TTL_MS = 300_000; // 5 minutes in production

export function getAvailablePatakhas(): PatakhaArchetype[] {
  const now = Date.now();
  if (
    globalForCardsCache.cachedPatakhas &&
    globalForCardsCache.cachedAt &&
    now - globalForCardsCache.cachedAt < CARDS_CACHE_TTL_MS
  ) {
    return globalForCardsCache.cachedPatakhas;
  }

  const cwd = process.cwd();
  const candidateDirs = [
    path.join(cwd, "cards"),
    path.join(cwd, "public", "cards"),
    path.join(cwd, "images"),
    path.join(cwd, "public", "images"),
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (files.length > 0) {
        const seenIds = new Set<string>();
        const list = files.map((fileName, idx) => {
          const rawBase = path.basename(fileName, path.extname(fileName));
          let id = toSlug(rawBase);
          if (seenIds.has(id)) {
            id = `${id}-${idx + 1}`;
          }
          seenIds.add(id);

          const name = toDisplayName(rawBase);
          return {
            id,
            index: idx,
            name,
            fileName,
            emoji: EMOJI_PALETTE[idx % EMOJI_PALETTE.length],
            accentHex: COLOR_PALETTE[idx % COLOR_PALETTE.length],
            imageUrl: `/api/patakha-image/${encodeURIComponent(id)}`,
          };
        });

        globalForCardsCache.cachedPatakhas = list;
        globalForCardsCache.cachedAt = now;
        return list;
      }
    }
  }

  const fallback: PatakhaArchetype[] = [
    {
      id: "murga-bomb",
      index: 0,
      name: "Murga Bomb",
      fileName: "murga bomb.png",
      emoji: "🧨",
      accentHex: "#FF3B30",
      imageUrl: "/api/patakha-image/murga-bomb",
    },
  ];
  globalForCardsCache.cachedPatakhas = fallback;
  globalForCardsCache.cachedAt = now;
  return fallback;
}

export function resolveCardFileById(patakhaId: string): {
  filePath: string | null;
  archetype: PatakhaArchetype;
} {
  const key = patakhaId.toLowerCase();
  if (!globalForCardsCache.resolvedFileCache) {
    globalForCardsCache.resolvedFileCache = new Map();
  }
  const cached = globalForCardsCache.resolvedFileCache.get(key);
  if (cached) {
    return cached;
  }

  const patakhas = getAvailablePatakhas();
  const matched = patakhas.find((p) => p.id === key) || patakhas[0];

  const cwd = process.cwd();
  const candidateDirs = [
    path.join(cwd, "cards"),
    path.join(cwd, "public", "cards"),
    path.join(cwd, "images"),
    path.join(cwd, "public", "images"),
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, matched.fileName);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const result = { filePath: fullPath, archetype: matched };
      globalForCardsCache.resolvedFileCache.set(key, result);
      return result;
    }
  }

  const fallbackResult = { filePath: null, archetype: matched };
  globalForCardsCache.resolvedFileCache.set(key, fallbackResult);
  return fallbackResult;
}