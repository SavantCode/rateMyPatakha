import { NextResponse } from "next/server";
import { findRegisteredProfile, sanitizeHandle } from "@/lib/store";

export const dynamic = "force-dynamic";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Dynamic Social OpenGraph Image Generator (`GET /api/og?u=user` or `GET /api/og?vs=user1,user2&days=3`):
 * Renders a crisp 1200x630 festive SVG social card for both individual voting links
 * and custom-duration 1v1 Head-to-Head Rivalry Battle links!
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vsParam = searchParams.get("vs") || "";
  const daysParam = Math.min(
    90,
    Math.max(1, parseInt(searchParams.get("days") || "3", 10) || 3)
  );

  if (vsParam.includes(",")) {
    const [rawA, rawB] = vsParam.split(",");
    const cleanA = sanitizeHandle(rawA || "pragmaticengineer");
    const cleanB = sanitizeHandle(rawB || "aarav");
    const [profA, profB] = await Promise.all([
      findRegisteredProfile(cleanA),
      findRegisteredProfile(cleanB),
    ]);

    const handleA = profA ? `@${profA.handle}` : `@${cleanA}`;
    const handleB = profB ? `@${profB.handle}` : `@${cleanB}`;
    const votesA = profA ? `${profA.votes} VOTES` : "10 VOTES";
    const votesB = profB ? `${profB.votes} VOTES` : "10 VOTES";
    const cardA = profA
      ? `${profA.patakhaEmoji} ${profA.patakhaName}`
      : "🧨 Patakha";
    const cardB = profB
      ? `${profB.patakhaEmoji} ${profB.patakhaName}`
      : "💣 Patakha";

    const vsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#1F0314"/>
      <rect x="20" y="20" width="1160" height="590" rx="32" fill="none" stroke="#FFE600" stroke-width="6"/>
      <text x="600" y="88" text-anchor="middle" fill="#FFE600" font-family="system-ui, sans-serif" font-weight="900" font-size="30" letter-spacing="3">
        ⚔️ ${daysParam}-DAY DIWALI PATAKHA 1v1 BATTLE ⚔️
      </text>

      <rect x="60" y="130" width="460" height="360" rx="28" fill="#FFF6E3" stroke="#D97706" stroke-width="5"/>
      <text x="290" y="230" text-anchor="middle" fill="#853A12" font-family="Georgia, serif" font-weight="700" font-size="34">${escapeXml(cardA)}</text>
      <text x="290" y="320" text-anchor="middle" fill="#1E0B02" font-family="system-ui, sans-serif" font-weight="900" font-size="48">${escapeXml(handleA)}</text>
      <text x="290" y="410" text-anchor="middle" fill="#D97706" font-family="system-ui, sans-serif" font-weight="900" font-size="32">🔥 ${escapeXml(votesA)}</text>

      <circle cx="600" cy="310" r="48" fill="#FFE600" stroke="#3B0828" stroke-width="6"/>
      <text x="600" y="324" text-anchor="middle" fill="#3B0828" font-family="system-ui, sans-serif" font-weight="900" font-size="38">VS</text>

      <rect x="680" y="130" width="460" height="360" rx="28" fill="#FFF6E3" stroke="#0EA5E9" stroke-width="5"/>
      <text x="910" y="230" text-anchor="middle" fill="#853A12" font-family="Georgia, serif" font-weight="700" font-size="34">${escapeXml(cardB)}</text>
      <text x="910" y="320" text-anchor="middle" fill="#1E0B02" font-family="system-ui, sans-serif" font-weight="900" font-size="48">${escapeXml(handleB)}</text>
      <text x="910" y="410" text-anchor="middle" fill="#0284C7" font-family="system-ui, sans-serif" font-weight="900" font-size="32">🔥 ${escapeXml(votesB)}</text>

      <text x="600" y="560" text-anchor="middle" fill="#FFFBEB" font-family="system-ui, sans-serif" font-weight="900" font-size="28">
        TAP LINK TO CAST YOUR UPVOTE &amp; CROWN THE WINNER!
      </text>
    </svg>`;

    return new NextResponse(vsSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  }

  const rawUser = searchParams.get("u") || "";
  const clean = sanitizeHandle(rawUser);

  const profile = clean ? await findRegisteredProfile(clean) : null;

  const displayHandle = profile ? `@${profile.handle}` : "@RateMyPatakha";
  const patakhaTitle = profile
    ? `${profile.patakhaEmoji} ${profile.patakhaName}`
    : "🧨 7 Patakha Clans & Live Voting Arena";
  const rankBadge = profile
    ? `CLAN RANK #${profile.clanRank} OF ${profile.clanTotalCount}  •  OVERALL #${profile.globalRank}  •  🔥 ${profile.votes} VOTES`
    : "CREATE YOUR DIWALI CRACKER CARD & WOODEN FRAME";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#3B0828"/>
        <stop offset="50%" stop-color="#220316"/>
        <stop offset="100%" stop-color="#12010B"/>
      </linearGradient>
      <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFFDF9"/>
        <stop offset="60%" stop-color="#FFF6E3"/>
        <stop offset="100%" stop-color="#FDE68A"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="24" y="24" width="1152" height="582" rx="36" fill="none" stroke="#FFE600" stroke-width="6"/>
    <rect x="48" y="48" width="1104" height="534" rx="28" fill="url(#cream)" stroke="#D97706" stroke-width="4"/>

    <text x="600" y="135" text-anchor="middle" fill="#B45309" font-family="system-ui, sans-serif" font-weight="900" font-size="24" letter-spacing="2">
      ${escapeXml(rankBadge)}
    </text>

    <text x="600" y="265" text-anchor="middle" fill="#853A12" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="48">
      ${escapeXml(patakhaTitle)}
    </text>

    <text x="600" y="375" text-anchor="middle" fill="#1E0B02" font-family="system-ui, sans-serif" font-weight="900" font-size="86">
      ${escapeXml(displayHandle)}
    </text>

    <rect x="290" y="435" width="620" height="84" rx="42" fill="#3B0828" stroke="#FFE600" stroke-width="4"/>
    <text x="600" y="487" text-anchor="middle" fill="#FFE600" font-family="system-ui, sans-serif" font-weight="900" font-size="30">
      🔥 TAP TO UPVOTE &amp; BOOST RANK #1
    </text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}