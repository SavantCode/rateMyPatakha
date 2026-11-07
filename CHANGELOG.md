# Changelog — Rate My Patakha 🧨

## [3.9.1] - Prominent "Rate My Patakha" Header Sizing & Balanced Mobile Pill Row
- **What Changed**:
  1. **Enlarged Brand Header & Cracker Emblem (`src/components/PatakhaArenaClient.tsx`)**:
     - Upgraded the "Rate My Patakha" header title from `text-xs sm:text-base` to `text-xl sm:text-2xl md:text-3xl font-black` with `.gold-shimmer` on "Patakha" so the brand title stands out clearly on both mobile and desktop.
     - Enlarged the 🧨 cracker badge to `w-11 h-11 sm:w-13 sm:h-13 rounded-2xl` with a warm gold glow and increased the subtitle readability (`text-[11px] sm:text-xs font-extrabold`).
  2. **Clean Mobile Pill Layout (`src/components/PatakhaArenaClient.tsx`)**:
     - Centered the live stat pills (`Visitors`, `Users`, `Votes`) cleanly inside the header card on mobile without horizontal cutoff while keeping `Card`, `Battle`, `Ranks`, and `Guide` in the fixed bottom navigation dock.

## [3.9.0] - Instagram-Style Mobile Bottom Navigation Bar (`Card`, `Battle`, `Ranks`, `Guide`) & Clean `tsconfig.json`
- **What Changed**:
  1. **Added Fixed Mobile Bottom Navigation Bar (`src/components/PatakhaArenaClient.tsx`)**:
     - Added an Instagram-style thumb-friendly fixed bottom tab bar on mobile (`sm:hidden`) containing the 4 core navigation actions: **Card**, **Battle** (with live active-battle badge counter), **Ranks** (smooth scroll to the Leaderboard), and **Guide** (toggles the interactive User Guide modal).
     - Adjusted mobile bottom page padding (`pb-28 sm:pb-20`) and floating toast position (`bottom-20 sm:bottom-5`) so content never hides behind the bottom navigation dock.
  2. **Removed Deprecated `downlevelIteration` Flag (`tsconfig.json`)**:
     - Kept `"target": "ES2020"` which natively supports ES2015+ `Map`/`Set` iteration without triggering TypeScript's `Option 'downlevelIteration' is deprecated` warning.