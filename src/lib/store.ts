import crypto from "crypto";
import { classifyProfileToPatakha } from "./classifier";
import { getAvailablePatakhas, PatakhaArchetype, PatakhaId } from "./patakhas";
import { getMongoDb } from "./mongodb";

export interface ArenaProfile {
  id: string;
  handle: string;
  name: string;
  profileUrl: string;
  patakhaId: PatakhaId;
  votes: number;
  voters?: string[];
  createdAt: string;
  lastVotedAt?: string;
}

export interface RankedArenaProfile extends ArenaProfile {
  patakhaName: string;
  patakhaEmoji: string;
  patakhaImageUrl: string;
  patakhaAccentHex: string;
  globalRank: number;
  clanRank: number;
  clanTotalCount: number;
  inActiveBattle?: boolean;
  activeBattleRival?: string | null;
  activeBattleHours?: number | null;
}

export interface PatakhaClanSummary {
  patakhaId: PatakhaId;
  name: string;
  emoji: string;
  imageUrl: string;
  accentHex: string;
  memberCount: number;
  totalVotes: number;
  topCreatorHandle: string | null;
  clanRank: number;
}

export interface ArenaBattle {
  id: string;
  handleA: string;
  handleB: string;
  hours: number;
  startMs: number;
  endMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface RankedArenaBattle extends ArenaBattle {
  fighterA: RankedArenaProfile;
  fighterB: RankedArenaProfile;
  totalBattleVotes: number;
  isExpired: boolean;
}

export interface RecentArenaEvent {
  id: string;
  type: "vote" | "join" | "battle";
  handle: string;
  rivalHandle?: string;
  battleHours?: number;
  patakhaName: string;
  patakhaEmoji: string;
  votes: number;
  timestamp: string;
}

export interface ArenaSnapshot {
  patakhas: PatakhaArchetype[];
  profiles: RankedArenaProfile[];
  clans: PatakhaClanSummary[];
  activeBattles: RankedArenaBattle[];
  recentEvents: RecentArenaEvent[];
  totalCreators: number;
  totalVotes: number;
  visitorCount: number;
  dbConnected: boolean;
}

const DEFAULT_HANDLES = [
  { handle: "pragmaticengineer", votes: 48 },
  { handle: "aarav", votes: 42 },
  { handle: "rohan", votes: 38 },
  { handle: "priya", votes: 34 },
  { handle: "kabir", votes: 29 },
  { handle: "ananya", votes: 25 },
  { handle: "dev", votes: 19 },
];

const ONE_HOUR_MS = 60 * 60 * 1000;
const LIVE_PULSE_INTERVAL_MS = 5000;

const globalForArena = globalThis as unknown as {
  patakhaArenaProfiles?: Map<string, ArenaProfile>;
  patakhaArenaBattles?: Map<string, ArenaBattle>;
  patakhaVisitorCount?: number;
  patakhaVisitedSet?: Set<string>;
  patakhaRecentEvents?: RecentArenaEvent[];
  voterGivenCounts?: Map<string, number>;
  mongoSeeded?: boolean;
  mongoBattlesSeeded?: boolean;
  cachedSnapshot?: ArenaSnapshot;
  cachedProfileLookupMap?: Map<string, RankedArenaProfile>;
  cachedSnapshotAt?: number;
  inflightSnapshotPromise?: Promise<ArenaSnapshot> | null;
  serverHmacSecret?: string;
  lastHourlyTickSlot?: number;
  lastLivePulseAt?: number;
};

const SNAPSHOT_CACHE_TTL_MS = 1000;

function getCurrentHourSlot(): number {
  return Math.floor(Date.now() / ONE_HOUR_MS);
}

function getVoterGivenCountsMap(): Map<string, number> {
  if (!globalForArena.voterGivenCounts) {
    globalForArena.voterGivenCounts = new Map<string, number>();
  }
  return globalForArena.voterGivenCounts;
}

function makeBattlePairId(handleA: string, handleB: string): string {
  const [first, second] = [
    sanitizeHandle(handleA),
    sanitizeHandle(handleB),
  ].sort();
  return `${first}__vs__${second}`;
}

function getMemoryBattlesMap(): Map<string, ArenaBattle> {
  if (!globalForArena.patakhaArenaBattles) {
    const map = new Map<string, ArenaBattle>();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const seedBattles: Array<{ a: string; b: string; hours: number }> = [
      { a: "pragmaticengineer", b: "aarav", hours: 12 },
      { a: "rohan", b: "priya", hours: 6 },
    ];

    for (const sb of seedBattles) {
      const id = makeBattlePairId(sb.a, sb.b);
      map.set(id, {
        id,
        handleA: sb.a,
        handleB: sb.b,
        hours: sb.hours,
        startMs: now - 15 * 60 * 1000,
        endMs: now - 15 * 60 * 1000 + sb.hours * ONE_HOUR_MS,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    globalForArena.patakhaArenaBattles = map;
  }
  return globalForArena.patakhaArenaBattles;
}

function getServerHmacSecret(): string {
  if (process.env.CREATOR_HMAC_SECRET) {
    return process.env.CREATOR_HMAC_SECRET;
  }
  if (!globalForArena.serverHmacSecret) {
    globalForArena.serverHmacSecret =
      "patakha_hmac_v1_" + (process.env.MONGODB_URI || "default_arena_secret");
  }
  return globalForArena.serverHmacSecret;
}

/**
 * Generates a stateless HMAC-SHA256 ownership token for a creator's handle
 * so only the original creator browser can update their card in the Photo Studio.
 */
export function createCreatorOwnershipToken(handle: string): string {
  const clean = sanitizeHandle(handle);
  return crypto
    .createHmac("sha256", getServerHmacSecret())
    .update(`owner:${clean}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyCreatorOwnershipToken(
  handle: string,
  token?: string
): boolean {
  if (!token) return false;
  const expected = createCreatorOwnershipToken(handle);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Strictly sanitizes handles to lowercase alphanumeric + `_`/`-` (max 32 chars)
 * and ensures at least 1 alphanumeric character exists to prevent empty-key bugs.
 */
export function sanitizeHandle(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 32);

  if (!/[a-z0-9]/.test(cleaned)) {
    return "";
  }
  return cleaned;
}

function pushRecentEvent(event: Omit<RecentArenaEvent, "id" | "timestamp">) {
  if (!globalForArena.patakhaRecentEvents) {
    globalForArena.patakhaRecentEvents = [];
  }
  const next: RecentArenaEvent = {
    ...event,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  globalForArena.patakhaRecentEvents = [
    next,
    ...globalForArena.patakhaRecentEvents,
  ].slice(0, 14);
}

function invalidateSnapshotCache() {
  globalForArena.cachedSnapshot = undefined;
  globalForArena.cachedProfileLookupMap = undefined;
  globalForArena.cachedSnapshotAt = 0;
}

function getMemoryProfileMap(): Map<string, ArenaProfile> {
  const patakhas = getAvailablePatakhas();

  if (!globalForArena.patakhaArenaProfiles) {
    const map = new Map<string, ArenaProfile>();
    DEFAULT_HANDLES.forEach((seed, idx) => {
      const assigned = patakhas[idx % patakhas.length];
      const createdIso = new Date(
        Date.now() - (10 - idx) * 60000
      ).toISOString();
      map.set(seed.handle, {
        id: seed.handle,
        handle: seed.handle,
        name: seed.handle,
        profileUrl: `https://substack.com/@${seed.handle}`,
        patakhaId: assigned.id,
        votes: seed.votes,
        voters: [],
        createdAt: createdIso,
        lastVotedAt: createdIso,
      });
    });
    globalForArena.patakhaArenaProfiles = map;
    globalForArena.lastHourlyTickSlot = getCurrentHourSlot();
    globalForArena.lastLivePulseAt = Date.now();
  }

  const validIds = new Set(patakhas.map((p) => p.id));
  const map = globalForArena.patakhaArenaProfiles;
  const currentSlot = getCurrentHourSlot();
  const prevSlot = globalForArena.lastHourlyTickSlot ?? currentSlot;
  const elapsedHours =
    currentSlot > prevSlot ? Math.min(24, currentSlot - prevSlot) : 0;

  if (elapsedHours > 0) {
    globalForArena.lastHourlyTickSlot = currentSlot;
  }

  let i = 0;
  for (const [key, profile] of map.entries()) {
    let updated = false;
    if (!validIds.has(profile.patakhaId)) {
      profile.patakhaId = patakhas[i % patakhas.length].id;
      updated = true;
    }

    if (elapsedHours > 0) {
      profile.votes += elapsedHours;
      updated = true;
    }

    if (updated) {
      map.set(key, profile);
    }
    i++;
  }

  return map;
}

/**
 * Ensures every user profile in MongoDB (and memory) receives +1 vote per elapsed hour.
 */
export async function runHourlyVoteIncrement(): Promise<{
  incrementedBy: number;
  hourSlot: number;
}> {
  const currentSlot = getCurrentHourSlot();
  const db = await getMongoDb();

  if (db) {
    try {
      const metricsCol = db.collection<{
        _id: string;
        lastHourSlot?: number;
      }>("site_metrics");
      const profilesCol = db.collection<ArenaProfile>("profiles");

      const tickerDoc = await metricsCol.findOne({
        _id: "hourly_vote_ticker",
      });

      if (!tickerDoc || typeof tickerDoc.lastHourSlot !== "number") {
        await metricsCol
          .updateOne(
            { _id: "hourly_vote_ticker" },
            { $setOnInsert: { lastHourSlot: currentSlot } },
            { upsert: true }
          )
          .catch(() => {});
        globalForArena.lastHourlyTickSlot = currentSlot;
        return { incrementedBy: 0, hourSlot: currentSlot };
      }

      if (currentSlot > tickerDoc.lastHourSlot) {
        const elapsedHours = Math.min(24, currentSlot - tickerDoc.lastHourSlot);
        const claimResult = await metricsCol.updateOne(
          {
            _id: "hourly_vote_ticker",
            lastHourSlot: tickerDoc.lastHourSlot,
          },
          { $set: { lastHourSlot: currentSlot } }
        );

        if (claimResult.modifiedCount > 0) {
          await profilesCol.updateMany({}, { $inc: { votes: elapsedHours } });
          globalForArena.lastHourlyTickSlot = currentSlot;
          invalidateSnapshotCache();
          return { incrementedBy: elapsedHours, hourSlot: currentSlot };
        }
      }

      globalForArena.lastHourlyTickSlot = currentSlot;
      return { incrementedBy: 0, hourSlot: currentSlot };
    } catch (e) {
      console.error("Hourly vote increment DB check error:", e);
    }
  }

  const prevSlot = globalForArena.lastHourlyTickSlot ?? currentSlot;
  if (currentSlot > prevSlot) {
    const delta = Math.min(24, currentSlot - prevSlot);
    getMemoryProfileMap();
    invalidateSnapshotCache();
    return { incrementedBy: delta, hourSlot: currentSlot };
  }

  return { incrementedBy: 0, hourSlot: currentSlot };
}

/**
 * Keeps the live arena feed, active battles, and vote counters continuously active
 * so all visitors see real-time vote increments across every page.
 */
async function maybeTriggerLiveArenaPulse(): Promise<void> {
  const now = Date.now();
  const lastPulse = globalForArena.lastLivePulseAt ?? 0;
  if (now - lastPulse < LIVE_PULSE_INTERVAL_MS) {
    return;
  }
  globalForArena.lastLivePulseAt = now;

  const patakhas = getAvailablePatakhas();
  const patakhaMap = new Map<string, PatakhaArchetype>(
    patakhas.map((p) => [p.id, p])
  );

  const db = await getMongoDb();
  if (db) {
    try {
      const col = db.collection<ArenaProfile>("profiles");
      const sample = await col
        .aggregate<ArenaProfile>([{ $sample: { size: 1 } }])
        .toArray();
      const chosen = sample[0];
      if (chosen && chosen.handle) {
        const nextVotes = (chosen.votes || 10) + 1;
        await col.updateOne(
          { handle: chosen.handle },
          {
            $inc: { votes: 1 },
            $set: { lastVotedAt: new Date().toISOString() },
          }
        );
        const archetype = patakhaMap.get(chosen.patakhaId) || patakhas[0];
        pushRecentEvent({
          type: "vote",
          handle: chosen.handle,
          patakhaName: archetype.name,
          patakhaEmoji: archetype.emoji,
          votes: nextVotes,
        });
        invalidateSnapshotCache();
      }
      return;
    } catch {
      // fall through to memory pulse
    }
  }

  const map = getMemoryProfileMap();
  const entries = Array.from(map.values());
  if (entries.length > 0) {
    const chosen = entries[Math.floor(Math.random() * entries.length)];
    chosen.votes += 1;
    chosen.lastVotedAt = new Date().toISOString();
    map.set(chosen.handle, chosen);
    const archetype = patakhaMap.get(chosen.patakhaId) || patakhas[0];
    pushRecentEvent({
      type: "vote",
      handle: chosen.handle,
      patakhaName: archetype.name,
      patakhaEmoji: archetype.emoji,
      votes: chosen.votes,
    });
    invalidateSnapshotCache();
  }
}

/**
 * O(1) Hash Map Lookup for whether a username has ALREADY created their card.
 */
export async function findRegisteredProfile(
  rawHandle: string
): Promise<RankedArenaProfile | null> {
  const key = sanitizeHandle(rawHandle);
  if (!key) return null;

  await getArenaSnapshot();
  return globalForArena.cachedProfileLookupMap?.get(key) || null;
}

async function loadProfilesAndBattlesFromSource(): Promise<{
  profiles: ArenaProfile[];
  battles: ArenaBattle[];
  visitorCount: number;
  dbConnected: boolean;
}> {
  const patakhas = getAvailablePatakhas();
  const validIds = new Set(patakhas.map((p) => p.id));
  const db = await getMongoDb();

  if (db) {
    try {
      const col = db.collection<ArenaProfile>("profiles");
      const battlesCol = db.collection<ArenaBattle>("battles");
      const count = await col.estimatedDocumentCount();

      if (count === 0 && !globalForArena.mongoSeeded) {
        globalForArena.mongoSeeded = true;
        const seeds: ArenaProfile[] = DEFAULT_HANDLES.map((seed, idx) => {
          const assigned = patakhas[idx % patakhas.length];
          const createdIso = new Date(
            Date.now() - (10 - idx) * 60000
          ).toISOString();
          return {
            id: seed.handle,
            handle: seed.handle,
            name: seed.handle,
            profileUrl: `https://substack.com/@${seed.handle}`,
            patakhaId: assigned.id,
            votes: seed.votes,
            voters: [],
            createdAt: createdIso,
            lastVotedAt: createdIso,
          };
        });
        await col.insertMany(seeds, { ordered: false }).catch(() => {});
      }

      if (!globalForArena.mongoBattlesSeeded) {
        globalForArena.mongoBattlesSeeded = true;
        const battleCount = await battlesCol.estimatedDocumentCount();
        if (battleCount === 0) {
          const memBattles = Array.from(getMemoryBattlesMap().values());
          await battlesCol
            .insertMany(memBattles, { ordered: false })
            .catch(() => {});
        }
      }

      const currentSlot = getCurrentHourSlot();
      if (globalForArena.lastHourlyTickSlot !== currentSlot) {
        await runHourlyVoteIncrement();
      }

      const [docs, battleDocs] = await Promise.all([
        col
          .find({}, { projection: { voters: 0 } })
          .sort({ votes: -1, createdAt: -1 })
          .limit(500)
          .toArray(),
        battlesCol.find({}).sort({ updatedAt: -1 }).limit(30).toArray(),
      ]);

      const nowIso = new Date().toISOString();

      const normalized = docs
        .filter((doc) => Boolean(doc.handle && sanitizeHandle(doc.handle)))
        .map((doc, idx) => {
          const clean = sanitizeHandle(doc.handle);
          const baseVotes = typeof doc.votes === "number" ? doc.votes : 10;
          const createdIso = doc.createdAt || nowIso;
          const lastVotedIso = doc.lastVotedAt || createdIso;

          return {
            id: clean,
            handle: clean,
            name: doc.name || clean,
            profileUrl: doc.profileUrl || `https://substack.com/@${clean}`,
            patakhaId: validIds.has(doc.patakhaId)
              ? doc.patakhaId
              : patakhas[idx % patakhas.length].id,
            votes: baseVotes,
            createdAt: createdIso,
            lastVotedAt: lastVotedIso,
          };
        });

      const metricsCol = db.collection<{ _id: string; count: number }>(
        "site_metrics"
      );
      const visitorDoc = await metricsCol.findOne(
        { _id: "visitors" },
        { projection: { count: 1 } }
      );
      const visitorCount = visitorDoc?.count ?? 1240;

      return {
        profiles: normalized,
        battles: battleDocs,
        visitorCount,
        dbConnected: true,
      };
    } catch (e) {
      console.error("MongoDB read error, using memory fallback:", e);
    }
  }

  const map = getMemoryProfileMap();
  const battlesMap = getMemoryBattlesMap();
  const visitorCount = globalForArena.patakhaVisitorCount ?? 1240;
  return {
    profiles: Array.from(map.values()).map(({ voters: _v, ...rest }) => rest),
    battles: Array.from(battlesMap.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    visitorCount,
    dbConnected: false,
  };
}

async function buildFreshArenaSnapshot(): Promise<ArenaSnapshot> {
  await maybeTriggerLiveArenaPulse();

  const patakhas = getAvailablePatakhas();
  const patakhaMap = new Map<string, PatakhaArchetype>(
    patakhas.map((p) => [p.id, p])
  );

  const {
    profiles: all,
    battles: rawBattles,
    visitorCount,
    dbConnected,
  } = await loadProfilesAndBattlesFromSource();

  all.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const byPatakha: Record<string, ArenaProfile[]> = {};
  for (const p of patakhas) {
    byPatakha[p.id] = [];
  }
  for (const profile of all) {
    if (!byPatakha[profile.patakhaId]) {
      byPatakha[profile.patakhaId] = [];
    }
    byPatakha[profile.patakhaId].push(profile);
  }

  const intraClanRankMap = new Map<
    string,
    { clanRank: number; clanTotalCount: number }
  >();

  for (const patakhaId of Object.keys(byPatakha)) {
    const group = byPatakha[patakhaId];
    group.forEach((member, idx) => {
      intraClanRankMap.set(member.handle.toLowerCase(), {
        clanRank: idx + 1,
        clanTotalCount: group.length,
      });
    });
  }

  const nowMs = Date.now();
  const activeBattleByHandle = new Map<
    string,
    { rival: string; hours: number }
  >();
  for (const b of rawBattles) {
    if (b.endMs > nowMs) {
      const hA = sanitizeHandle(b.handleA);
      const hB = sanitizeHandle(b.handleB);
      if (hA && hB) {
        if (!activeBattleByHandle.has(hA)) {
          activeBattleByHandle.set(hA, { rival: hB, hours: b.hours });
        }
        if (!activeBattleByHandle.has(hB)) {
          activeBattleByHandle.set(hB, { rival: hA, hours: b.hours });
        }
      }
    }
  }

  const lookupMap = new Map<string, RankedArenaProfile>();

  const rankedProfiles: RankedArenaProfile[] = all.map((p, idx) => {
    const archetype = patakhaMap.get(p.patakhaId) || patakhas[0];
    const clanMeta = intraClanRankMap.get(p.handle.toLowerCase()) || {
      clanRank: 1,
      clanTotalCount: 1,
    };
    const battleMeta = activeBattleByHandle.get(p.handle.toLowerCase());
    const ranked: RankedArenaProfile = {
      ...p,
      patakhaName: archetype.name,
      patakhaEmoji: archetype.emoji,
      patakhaImageUrl: archetype.imageUrl,
      patakhaAccentHex: archetype.accentHex,
      globalRank: idx + 1,
      clanRank: clanMeta.clanRank,
      clanTotalCount: clanMeta.clanTotalCount,
      inActiveBattle: Boolean(battleMeta),
      activeBattleRival: battleMeta?.rival || null,
      activeBattleHours: battleMeta?.hours || null,
    };
    lookupMap.set(p.handle.toLowerCase(), ranked);
    return ranked;
  });

  const activeBattles: RankedArenaBattle[] = [];
  for (const b of rawBattles) {
    const cleanA = sanitizeHandle(b.handleA);
    const cleanB = sanitizeHandle(b.handleB);
    const fighterA = lookupMap.get(cleanA);
    const fighterB = lookupMap.get(cleanB);
    if (fighterA && fighterB) {
      activeBattles.push({
        ...b,
        handleA: cleanA,
        handleB: cleanB,
        fighterA,
        fighterB,
        totalBattleVotes: fighterA.votes + fighterB.votes,
        isExpired: nowMs >= b.endMs,
      });
    }
  }

  const totalVotes = all.reduce((sum, p) => sum + p.votes, 0);
  const totalCreators = all.length;

  const rawClans = patakhas.map((archetype) => {
    const members = byPatakha[archetype.id] || [];
    const clanVotes = members.reduce((s, m) => s + m.votes, 0);
    const topCreator = members[0] || null;
    return {
      patakhaId: archetype.id,
      name: archetype.name,
      emoji: archetype.emoji,
      imageUrl: archetype.imageUrl,
      accentHex: archetype.accentHex,
      memberCount: members.length,
      totalVotes: clanVotes,
      topCreatorHandle: topCreator ? topCreator.handle : null,
      clanRank: 0,
    };
  });

  rawClans.sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
    return b.memberCount - a.memberCount;
  });

  const clans: PatakhaClanSummary[] = rawClans.map((c, i) => ({
    ...c,
    clanRank: i + 1,
  }));

  if (
    !globalForArena.patakhaRecentEvents ||
    globalForArena.patakhaRecentEvents.length === 0
  ) {
    const initialEvents: RecentArenaEvent[] = [];
    if (activeBattles.length > 0) {
      const topBattle = activeBattles[0];
      initialEvents.push({
        id: `seed_battle_0`,
        type: "battle",
        handle: topBattle.handleA,
        rivalHandle: topBattle.handleB,
        battleHours: topBattle.hours,
        patakhaName: topBattle.fighterA.patakhaName,
        patakhaEmoji: "⚔️",
        votes: topBattle.totalBattleVotes,
        timestamp: topBattle.updatedAt,
      });
    }
    rankedProfiles.slice(0, 5).forEach((p, i) => {
      initialEvents.push({
        id: `seed_${i}`,
        type: i % 2 === 0 ? "vote" : "join",
        handle: p.handle,
        patakhaName: p.patakhaName,
        patakhaEmoji: p.patakhaEmoji,
        votes: p.votes,
        timestamp: p.createdAt,
      });
    });
    globalForArena.patakhaRecentEvents = initialEvents;
  }

  const snapshot: ArenaSnapshot = {
    patakhas,
    profiles: rankedProfiles,
    clans,
    activeBattles,
    recentEvents: globalForArena.patakhaRecentEvents || [],
    totalCreators,
    totalVotes,
    visitorCount,
    dbConnected,
  };

  globalForArena.cachedSnapshot = snapshot;
  globalForArena.cachedProfileLookupMap = lookupMap;
  globalForArena.cachedSnapshotAt = Date.now();
  return snapshot;
}

export async function getArenaSnapshot(
  forceFresh = false
): Promise<ArenaSnapshot> {
  const now = Date.now();
  const currentSlot = getCurrentHourSlot();
  const hourChanged =
    globalForArena.lastHourlyTickSlot !== undefined &&
    currentSlot > globalForArena.lastHourlyTickSlot;
  const pulseDue =
    now - (globalForArena.lastLivePulseAt ?? 0) >= LIVE_PULSE_INTERVAL_MS;

  if (
    !forceFresh &&
    !hourChanged &&
    !pulseDue &&
    globalForArena.cachedSnapshot &&
    globalForArena.cachedSnapshotAt &&
    now - globalForArena.cachedSnapshotAt < SNAPSHOT_CACHE_TTL_MS
  ) {
    return globalForArena.cachedSnapshot;
  }

  if (globalForArena.inflightSnapshotPromise) {
    return globalForArena.inflightSnapshotPromise;
  }

  const promise = buildFreshArenaSnapshot().finally(() => {
    globalForArena.inflightSnapshotPromise = null;
  });
  globalForArena.inflightSnapshotPromise = promise;
  return promise;
}

export async function getOrCreateArenaProfile(
  profileData: Omit<ArenaProfile, "votes" | "createdAt"> & {
    initialVotes?: number;
    allowCardUpdate?: boolean;
    creatorToken?: string;
  }
): Promise<{
  profile: RankedArenaProfile;
  snapshot: ArenaSnapshot;
  isNew: boolean;
  alreadyExists: boolean;
  creatorToken?: string;
}> {
  const key = sanitizeHandle(profileData.handle);
  if (!key) {
    throw new Error("Invalid handle provided");
  }

  const db = await getMongoDb();
  let isNew = false;
  let canUpdateCard = false;

  if (
    profileData.allowCardUpdate &&
    verifyCreatorOwnershipToken(key, profileData.creatorToken)
  ) {
    canUpdateCard = true;
  }

  const nowIso = new Date().toISOString();

  if (db) {
    try {
      const col = db.collection<ArenaProfile>("profiles");
      const existing = await col.findOne(
        { handle: key },
        { projection: { handle: 1, patakhaId: 1 } }
      );

      if (existing) {
        isNew = false;
        if (
          canUpdateCard &&
          profileData.patakhaId &&
          profileData.patakhaId !== existing.patakhaId
        ) {
          await col.updateOne(
            { handle: key },
            { $set: { patakhaId: profileData.patakhaId } }
          );
          invalidateSnapshotCache();
        }
      } else {
        isNew = true;
        await col.updateOne(
          { handle: key },
          {
            $setOnInsert: {
              id: key,
              handle: key,
              name: profileData.name || key,
              profileUrl: profileData.profileUrl,
              patakhaId: profileData.patakhaId,
              votes: profileData.initialVotes ?? 10,
              voters: [],
              createdAt: nowIso,
              lastVotedAt: nowIso,
            },
          },
          { upsert: true }
        );
        invalidateSnapshotCache();
      }
    } catch (e) {
      console.error("MongoDB getOrCreate error:", e);
    }
  } else {
    const map = getMemoryProfileMap();
    const existing = map.get(key);
    if (existing) {
      isNew = false;
      if (
        canUpdateCard &&
        profileData.patakhaId &&
        profileData.patakhaId !== existing.patakhaId
      ) {
        map.set(key, { ...existing, patakhaId: profileData.patakhaId });
        invalidateSnapshotCache();
      }
    } else {
      isNew = true;
      map.set(key, {
        ...profileData,
        id: key,
        handle: key,
        votes: profileData.initialVotes ?? 10,
        voters: [],
        createdAt: nowIso,
        lastVotedAt: nowIso,
      });
      invalidateSnapshotCache();
    }
  }

  const snapshot = await getArenaSnapshot(isNew || canUpdateCard);
  const ranked =
    snapshot.profiles.find((p) => p.handle.toLowerCase() === key) ||
    snapshot.profiles[0];

  if (isNew && ranked) {
    pushRecentEvent({
      type: "join",
      handle: ranked.handle,
      patakhaName: ranked.patakhaName,
      patakhaEmoji: ranked.patakhaEmoji,
      votes: ranked.votes,
    });
  }

  return {
    profile: ranked,
    snapshot,
    isNew,
    alreadyExists: !isNew,
    creatorToken:
      isNew || canUpdateCard ? createCreatorOwnershipToken(key) : undefined,
  };
}

/**
 * Creates, updates, or retrieves a 1v1 Head-to-Head Battle in MongoDB & memory.
 * - Uses server-side `Date.now()` for new or restarted battles so clients cannot forge expired timestamps.
 */
export async function startOrSyncArenaBattle(params: {
  handleA: string;
  handleB: string;
  hours?: number;
  startMs?: number;
  forceUpdate?: boolean;
}): Promise<{
  battle: RankedArenaBattle;
  snapshot: ArenaSnapshot;
}> {
  const cleanA = sanitizeHandle(params.handleA);
  let cleanB = sanitizeHandle(params.handleB);

  if (!cleanA) {
    throw new Error("Challenger 1 username is required");
  }
  if (!cleanB || cleanB === cleanA) {
    cleanB = cleanA === "aarav" ? "rohan" : "aarav";
  }

  // Ensure both fighters exist in the database
  for (const h of [cleanA, cleanB]) {
    const existing = await findRegisteredProfile(h);
    if (!existing) {
      const classified = classifyProfileToPatakha({
        handle: h,
        name: h,
        profileUrl: `https://${h}.substack.com`,
      });
      await getOrCreateArenaProfile({
        id: h,
        handle: h,
        name: h,
        profileUrl: `https://${h}.substack.com`,
        patakhaId: classified.patakhaId,
      });
    }
  }

  const pairId = makeBattlePairId(cleanA, cleanB);
  const clampedHours = Math.min(48, Math.max(1, Number(params.hours) || 12));
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const db = await getMongoDb();
  const memBattles = getMemoryBattlesMap();
  let existingBattle: ArenaBattle | null = memBattles.get(pairId) || null;

  if (db) {
    try {
      const battlesCol = db.collection<ArenaBattle>("battles");
      const found = await battlesCol.findOne({ id: pairId });
      if (found) {
        existingBattle = found;
      }
    } catch {
      // ignore
    }
  }

  const shouldCreateOrUpdate =
    !existingBattle ||
    Boolean(params.forceUpdate) ||
    (params.hours !== undefined && existingBattle.hours !== clampedHours);

  let finalBattleDoc: ArenaBattle;

  if (shouldCreateOrUpdate) {
    // Server-enforced start timestamp: use now for new/restarted battles, or preserve existingBattle.startMs
    const resolvedStartMs =
      existingBattle && !params.forceUpdate ? existingBattle.startMs : now;
    const resolvedEndMs = resolvedStartMs + clampedHours * ONE_HOUR_MS;

    finalBattleDoc = {
      id: pairId,
      handleA: cleanA,
      handleB: cleanB,
      hours: clampedHours,
      startMs: resolvedStartMs,
      endMs: resolvedEndMs,
      createdAt: existingBattle?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    memBattles.set(pairId, finalBattleDoc);

    if (db) {
      try {
        const battlesCol = db.collection<ArenaBattle>("battles");
        await battlesCol.updateOne(
          { id: pairId },
          { $set: finalBattleDoc },
          { upsert: true }
        );
      } catch (e) {
        console.error("Failed to save battle in MongoDB:", e);
      }
    }

    pushRecentEvent({
      type: "battle",
      handle: cleanA,
      rivalHandle: cleanB,
      battleHours: clampedHours,
      patakhaName: `${clampedHours}h 1v1 Battle`,
      patakhaEmoji: "⚔️",
      votes: 0,
    });

    invalidateSnapshotCache();
  } else {
    finalBattleDoc = existingBattle!;
  }

  const snapshot = await getArenaSnapshot(true);
  const fighterA =
    snapshot.profiles.find((p) => p.handle.toLowerCase() === cleanA) ||
    snapshot.profiles[0];
  const fighterB =
    snapshot.profiles.find((p) => p.handle.toLowerCase() === cleanB) ||
    snapshot.profiles[1] ||
    snapshot.profiles[0];

  const rankedBattle: RankedArenaBattle = {
    ...finalBattleDoc,
    handleA: cleanA,
    handleB: cleanB,
    fighterA,
    fighterB,
    totalBattleVotes: (fighterA?.votes || 10) + (fighterB?.votes || 10),
    isExpired: Date.now() >= finalBattleDoc.endMs,
  };

  return {
    battle: rankedBattle,
    snapshot,
  };
}

/**
 * Casts an upvote for `rawHandle`.
 * Strictly tracks "Upvote 3 Other Users = +1 Bonus Vote" server-side (never trusting client counts).
 */
export async function voteForProfile(
  rawHandle: string,
  voterHash: string,
  rawVoterHandle?: string
): Promise<{
  profile: RankedArenaProfile | null;
  bonusProfile: RankedArenaProfile | null;
  bonusAwarded: boolean;
  othersVotedCount: number;
  snapshot: ArenaSnapshot;
  alreadyVoted: boolean;
}> {
  const key = sanitizeHandle(rawHandle);
  const cleanVoterHandle = rawVoterHandle ? sanitizeHandle(rawVoterHandle) : "";

  if (!key) {
    return {
      profile: null,
      bonusProfile: null,
      bonusAwarded: false,
      othersVotedCount: 0,
      snapshot: await getArenaSnapshot(),
      alreadyVoted: false,
    };
  }

  const db = await getMongoDb();
  let alreadyVoted = false;

  if (db) {
    try {
      const col = db.collection<ArenaProfile>("profiles");
      const updateResult = await col.updateOne(
        {
          handle: key,
          ...(voterHash ? { voters: { $ne: voterHash } } : {}),
        },
        {
          $inc: { votes: 1 },
          $set: { lastVotedAt: new Date().toISOString() },
          ...(voterHash
            ? {
                $push: {
                  voters: {
                    $each: [voterHash],
                    $slice: -5000,
                  },
                },
              }
            : {}),
        }
      );

      if (updateResult.matchedCount === 0) {
        const exists = await col.findOne(
          { handle: key },
          { projection: { _id: 1 } }
        );
        if (exists) {
          alreadyVoted = true;
        }
      }
    } catch (e) {
      console.error("MongoDB atomic vote error:", e);
    }
  } else {
    const map = getMemoryProfileMap();
    const existing = map.get(key);
    if (existing) {
      const voters = existing.voters || [];
      if (voterHash && voters.includes(voterHash)) {
        alreadyVoted = true;
      } else {
        existing.votes += 1;
        existing.lastVotedAt = new Date().toISOString();
        if (voterHash) {
          existing.voters = [...voters.slice(-4999), voterHash];
        }
        map.set(key, existing);
      }
    }
  }

  // Server-authoritative tracking of how many OTHER users this voter has upvoted
  const countsMap = getVoterGivenCountsMap();
  const voterTrackingKey = voterHash || cleanVoterHandle || "anon";
  let othersVotedCount = countsMap.get(voterTrackingKey) || 0;
  let bonusAwarded = false;

  if (!alreadyVoted && cleanVoterHandle !== key) {
    if (db) {
      try {
        const progressCol = db.collection<{ _id: string; count: number }>(
          "voter_progress"
        );
        const updatedProg = await progressCol.findOneAndUpdate(
          { _id: voterTrackingKey },
          { $inc: { count: 1 } },
          { upsert: true, returnDocument: "after" }
        );
        othersVotedCount = updatedProg?.count ?? othersVotedCount + 1;
      } catch {
        othersVotedCount += 1;
      }
    } else {
      othersVotedCount += 1;
    }

    countsMap.set(voterTrackingKey, othersVotedCount);

    if (cleanVoterHandle && othersVotedCount > 0 && othersVotedCount % 3 === 0) {
      if (db) {
        try {
          const col = db.collection<ArenaProfile>("profiles");
          const bonusRes = await col.updateOne(
            { handle: cleanVoterHandle },
            {
              $inc: { votes: 1 },
              $set: { lastVotedAt: new Date().toISOString() },
            }
          );
          if (bonusRes.modifiedCount > 0) {
            bonusAwarded = true;
          }
        } catch (e) {
          console.error("Failed to award 3-vote bonus in DB:", e);
        }
      } else {
        const map = getMemoryProfileMap();
        const voterOwnProfile = map.get(cleanVoterHandle);
        if (voterOwnProfile) {
          voterOwnProfile.votes += 1;
          voterOwnProfile.lastVotedAt = new Date().toISOString();
          map.set(cleanVoterHandle, voterOwnProfile);
          bonusAwarded = true;
        }
      }
    }
  }

  if (!alreadyVoted || bonusAwarded) {
    invalidateSnapshotCache();
  }

  const snapshot = await getArenaSnapshot(!alreadyVoted || bonusAwarded);
  const ranked =
    snapshot.profiles.find((p) => p.handle.toLowerCase() === key) || null;
  const bonusProfile = cleanVoterHandle
    ? snapshot.profiles.find(
        (p) => p.handle.toLowerCase() === cleanVoterHandle
      ) || null
    : null;

  if (!alreadyVoted && ranked) {
    pushRecentEvent({
      type: "vote",
      handle: ranked.handle,
      patakhaName: ranked.patakhaName,
      patakhaEmoji: ranked.patakhaEmoji,
      votes: ranked.votes,
    });
  }

  if (bonusAwarded && bonusProfile) {
    pushRecentEvent({
      type: "vote",
      handle: bonusProfile.handle,
      patakhaName: bonusProfile.patakhaName,
      patakhaEmoji: bonusProfile.patakhaEmoji,
      votes: bonusProfile.votes,
    });
  }

  return {
    profile: ranked,
    bonusProfile,
    bonusAwarded,
    othersVotedCount,
    snapshot,
    alreadyVoted,
  };
}

export async function recordWebsiteVisit(visitorHash: string): Promise<{
  visitorCount: number;
  dbConnected: boolean;
}> {
  const db = await getMongoDb();

  if (db) {
    try {
      const metricsCol = db.collection<{
        _id: string;
        count: number;
        visitors?: string[];
      }>("site_metrics");

      await metricsCol
        .updateOne(
          { _id: "visitors" },
          { $setOnInsert: { count: 1240, visitors: [] } },
          { upsert: true }
        )
        .catch(() => {});

      if (visitorHash) {
        await metricsCol.updateOne(
          { _id: "visitors", visitors: { $ne: visitorHash } },
          {
            $inc: { count: 1 },
            $push: {
              visitors: {
                $each: [visitorHash],
                $slice: -10000,
              },
            },
          }
        );
      } else {
        await metricsCol.updateOne({ _id: "visitors" }, { $inc: { count: 1 } });
      }

      const doc = await metricsCol.findOne(
        { _id: "visitors" },
        { projection: { count: 1 } }
      );
      return {
        visitorCount: doc?.count ?? 1241,
        dbConnected: true,
      };
    } catch (e) {
      console.error("Visitor counter MongoDB error:", e);
    }
  }

  if (!globalForArena.patakhaVisitorCount) {
    globalForArena.patakhaVisitorCount = 1240;
  }
  if (!globalForArena.patakhaVisitedSet) {
    globalForArena.patakhaVisitedSet = new Set<string>();
  }

  if (!visitorHash || !globalForArena.patakhaVisitedSet.has(visitorHash)) {
    globalForArena.patakhaVisitorCount += 1;
    if (visitorHash) {
      globalForArena.patakhaVisitedSet.add(visitorHash);
    }
  }

  return {
    visitorCount: globalForArena.patakhaVisitorCount,
    dbConnected: false,
  };
}