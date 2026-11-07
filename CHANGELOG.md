# Changelog — Rate My Patakha 🧨

## [3.8.0] - Final Production Security Audit & Vercel Hosting Readiness
- **What Changed**:
  1. **Eliminated Client-Side Bonus Vote Manipulation (`src/lib/store.ts` & `src/app/api/vote/route.ts`)**:
     - Removed `clientOthersVotedCount` from the server-side `voteForProfile()` calculation and switched to atomic MongoDB `$inc: { count: 1 }` on `voter_progress` keyed by the server-enforced SHA-256 voter fingerprint so clients cannot forge `othersVotedCount: 3` in API payloads to farm `+1` self-bonus votes.
  2. **Secured Cron Endpoint (`src/app/api/cron/hourly-votes/route.ts`)**:
     - Added optional `CRON_SECRET` Bearer token verification and IP rate limiting (`checkRateLimit`) so `/api/cron/hourly-votes` cannot be spammed publicly.
  3. **Server-Authoritative Battle Timestamps (`src/lib/store.ts`)**:
     - Hardened `startOrSyncArenaBattle()` so newly created or restarted 1v1 battles always use the server's `Date.now()` timestamp rather than trusting client-supplied `startMs`.
  4. **Production Security Headers & Image Host Whitelisting (`next.config.mjs`)**:
     - Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, disabled `X-Powered-By`, and restricted `images.remotePatterns` to Substack domains.

## [3.7.0] - Top-Layer Fairy Lights on Scroll (`z-40`) & Mobile Hanging Lamps (Akash Kandils)
- **What Changed**:
  1. **Fairy Lights & Hanging Lamps Always on Top When Scrolling (`src/components/DiwaliDecorationLights.tsx`)**:
     - Elevated `DiwaliDecorationLights` from `z-10` to `z-40 pointer-events-none` so all scrolling page content slides underneath the glowing fairy lights and swaying lamps instead of covering them.
  2. **Visible Hanging Lamps on Mobile, Tablet & Desktop (`src/components/DiwaliDecorationLights.tsx`)**:
     - Enabled the left and right swaying Akash Kandil lamps on all mobile, tablet, and desktop screen sizes.