# Changelog — Rate My Patakha 🧨

## [3.8.2] - Fix Vercel Production TypeScript Build (`MapIterator` Target)
- **What Changed**:
  1. **Added `"target": "ES2020"` and `"downlevelIteration": true` (`tsconfig.json`)**:
     - Fixed the `next build` TypeScript error (`Type 'MapIterator<[string, RateBucket]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher`) during Vercel deployment.
  2. **Updated Rate-Limit Bucket Cleanup (`src/lib/rateLimit.ts`)**:
     - Switched `for (const [k, v] of buckets.entries())` to `buckets.forEach((v, k) => ...)` for clean iteration without iterator downlevel overhead.

## [3.8.1] - Vercel Hobby Plan Cron Compatibility (`0 0 * * *`)
- **What Changed**:
  1. **Updated `vercel.json` Cron Schedule for Vercel Hobby Plan (`vercel.json`)**:
     - Changed the cron schedule from `"0 * * * *"` (hourly) to `"0 0 * * *"` (once daily at midnight UTC) to comply with Vercel Hobby plan limits.
     - Hourly `+1` vote increments continue to happen automatically every hour via the lazy hour-slot check inside `loadProfilesAndBattlesFromSource()` and `getArenaSnapshot()` in `src/lib/store.ts`.

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