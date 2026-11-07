# Changelog — Rate My Patakha 🧨

## [3.3.0] - Multi-Battle Command Center, DB-Persisted 1v1 Battles, Live Frame Canvas Text & System Design Polling Engine
- **What Changed**:
  1. **Current User Multi-Battle Command Center (`src/components/MyActiveBattlesPanel.tsx`, `src/components/PatakhaArenaClient.tsx`)**:
     - Added a dedicated, responsive **Live 1v1 Battle Command Center** that detects all active battles the current user (`@myHandle`) is playing (`Playing N Battles`).
     - Shows summary badges (`🏆 Winning`, `⚡ Trailing`, `🤝 Tied`), each rival's `@username` & Patakha Clan, each battle's live ticking `HHh MMm SSs` countdown, a live tug-of-war vote bar, and 1-click buttons to **Vote** or **Open 1v1**.
  2. **Database-Persisted 1v1 Battles & Fixed Battle Hours Countdown (`src/lib/store.ts`, `src/app/api/battle/route.ts`, `src/components/HeadToHeadBattle.tsx`)**:
     - Persisted 1v1 Battles in MongoDB (`battles` collection) & memory (`ArenaBattle`) with `{ id, handleA, handleB, hours, startMs, endMs }`.
     - Fixed the bug in `HeadToHeadBattle.tsx` where changing Battle Hours (e.g., to `13h`) for an existing pair did not update the countdown timer.
     - Added `"⚔️ In 1v1 vs @rival"` badges directly on Leaderboard rows so any visitor can jump into ongoing battles.
  3. **100% Live Text & Vote Rendering on Photo / Rangoli Frame Canvas (`src/components/DiwaliSnapFrameStudio.tsx`)**:
     - Subscribed `DiwaliSnapFrameStudio` to the live-polled `allProfiles` list and added a **Live Frame Text Editor** bar directly above the canvas so `@username`, `Greeting Title`, `RANK #X`, and `X VOTES` update live on the canvas image on every keystroke and every incoming upvote.
  4. **Universal System Design Live Polling Engine (`src/app/api/leaderboard/route.ts`, `src/components/PatakhaArenaClient.tsx`)**:
     - **HTTP Conditional GET (`ETag` + `If-None-Match` → `304 Not Modified`)**: Eliminates redundant JSON payloads when arena state hasn't changed.
     - **Single-Flight Request Coalescing (`inflightPollRef`)**: Prevents overlapping network requests on slow connections.
     - **Page Visibility API + Exponential Backoff with Random Jitter**: Polls every `3s + 0..450ms jitter` when visible, pauses when the tab is hidden, and immediately syncs on tab focus.
     - **Cross-Tab `BroadcastChannel` Sync**: Broadcasts state mutations across all open browser tabs in `0ms`.

## [3.2.0] - Live Real-Time Vote Synchronization, "Upvote 3 Others = +1 Self Bonus" Engine & Simplified User Guide
- **What Changed**:
  1. **"Upvote 3 Other Users = +1 Bonus Vote for Your Own Score" (`src/lib/store.ts`, `src/app/api/vote/route.ts`, `src/components/PatakhaArenaClient.tsx`, `src/components/ArenaLeaderboard.tsx`)**:
     - Implemented real-time tracking of how many other profiles a user has upvoted (`othersVotedCount`) and automatic `+1` self-vote rewards on every 3rd upvote (`3, 6, 9, 12...`).