# Changelog — Rate My Patakha 🧨

## [2.8.0] - Clan Roster Explorer, Photo/Rangoli Privacy & Download-First UX, Voting System Audit, and `.gitignore`
- **What Changed**:
  1. **Interactive Clan Roster Browser (`src/components/ClanWarsMatrix.tsx`, `src/components/PatakhaArenaClient.tsx`)**:
     - Added a **"Browse Clans"** navigation button and an interactive **Clan Roster Spotlight** inside `ClanWarsMatrix.tsx`. Users can now tap any Patakha Clan to browse the users inside that clan, view their cards, upvote them, or challenge any clan member to a 1v1 Battle.
  2. **Photo / Rangoli Upload Privacy Banner & Unlimited Downloads (`src/components/DiwaliSnapFrameStudio.tsx`, `src/components/PatakhaArenaClient.tsx`, `USER_GUIDE.md`)**:
     - Updated the studio and User Manual to highlight that users can upload their **portrait, Rangoli art, Diyas, or any festive photograph** and download the framed poster **unlimited times anytime**.
     - Added a clear privacy callout explaining that uploaded photos are rendered 100% in-browser and are **not** shown on the public voting link (`/?u=username`), reminding users to **Download their poster first** and share the image alongside their voting link.
  3. **Production `.gitignore` (`.gitignore`)**:
     - Added a comprehensive `.gitignore` excluding `node_modules/`, `.next/`, `.env*` secrets, build caches, logs, and OS/IDE metadata.

## [2.7.0] - Custom-Day 1v1 Battles, Hourly Engagement Auto-Boost, Tagging Manual & Developer Footer
- **What Changed**:
  - Added custom battle duration (`1–90 Days`) with a live countdown timer, automatic `+1` hourly idle upvote boost in `src/lib/store.ts`, tagging challenge copy buttons, and the developer engineering footer (`rahulkcoding2023@gmail.com`).