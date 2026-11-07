import { getAvailablePatakhas, PatakhaArchetype, PatakhaId } from "./patakhas";

export interface RawSubstackMetadata {
  handle: string;
  name: string;
  profileUrl: string;
}

export interface ClassificationResult {
  patakhaId: PatakhaId;
  patakha: PatakhaArchetype;
}

function deterministicHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function cleanValidHandle(rawCandidate: string): string {
  const stripped = rawCandidate
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 32);

  // Must contain at least one letter or number
  if (!/[a-z0-9]/.test(stripped)) {
    return "";
  }
  return stripped;
}

/**
 * Extracts a clean, validated username from any profile URL or @handle input.
 * Returns `handle: ""` if the input contains no valid alphanumeric characters.
 */
export function normalizeSubstackInput(input: string): {
  handle: string;
  inferredUrl: string;
} {
  const raw = input.trim().toLowerCase();
  if (!raw) {
    return { handle: "", inferredUrl: "" };
  }

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const url = new URL(raw);
      if (url.hostname.endsWith(".substack.com")) {
        const sub = url.hostname.replace(".substack.com", "");
        if (sub && sub !== "www" && sub !== "open") {
          const h = cleanValidHandle(sub);
          if (h) {
            return {
              handle: h,
              inferredUrl: `https://${h}.substack.com`,
            };
          }
        }
      }
      const atMatch = url.pathname.match(/\/@([a-z0-9_.-]+)/i);
      if (atMatch?.[1]) {
        const h = cleanValidHandle(atMatch[1]);
        if (h) {
          return {
            handle: h,
            inferredUrl: `https://substack.com/@${h}`,
          };
        }
      }
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] !== "p") {
        const h = cleanValidHandle(pathParts[0]);
        if (h) {
          return {
            handle: h,
            inferredUrl: `https://${h}.substack.com`,
          };
        }
      }
    }
  } catch {
    // Fallback to string cleanup
  }

  const cleaned = cleanValidHandle(
    raw
      .replace(/^https?:\/\//, "")
      .replace(/\.substack\.com.*$/, "")
      .replace(/^substack\.com\/@?/, "")
      .split("/")[0] || ""
  );

  if (!cleaned) {
    return { handle: "", inferredUrl: "" };
  }

  return {
    handle: cleaned,
    inferredUrl: `https://${cleaned}.substack.com`,
  };
}

/**
 * Deterministically assigns one of the available Patakha cards from `./cards`.
 */
export function classifyProfileToPatakha(
  meta: RawSubstackMetadata
): ClassificationResult {
  const available = getAvailablePatakhas();
  const hash = deterministicHash(meta.handle.toLowerCase());
  const chosen = available[hash % available.length];

  return {
    patakhaId: chosen.id,
    patakha: chosen,
  };
}