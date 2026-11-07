import crypto from "crypto";
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

export interface RecentArenaEvent {
  id: string;
  type: "vote" | "join";
  handle: string;
  patakhaName: string;
  patakhaEmoji: string;
  votes: number;
  timestamp: string;
}

export interface ArenaSnapshot {
  patakhas: PatakhaArchetype[];
  profiles: RankedArenaProfile[];
  clans: PatakhaClanSummary[];
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

const globalForArena = globalThis as unknown as {
  patakhaArenaProfiles?: Map<string, ArenaProfile>;
  patakhaVisitorCount?: number;
  patakhaVisitedSet?: Set<string>;
  patakhaRecentEvents?: RecentArenaEvent[];
  mongoSeeded?: boolean;
  cachedSnapshot?: ArenaSnapshot;
  cachedProfileLookupMap?: Map<string, RankedArenaProfile>;
  cachedSnapshotAt?: number;
  inflightSnapshotPromise?: Promise<ArenaSnapshot> | null;
  serverHmacSecret?: string;
  lastHourlyBoostCheckAt?: number;
};

const SNAPSHOT_CACHE_TTL_MS = 2000;

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
  ].slice(0, 12);
}

function invalidateSnapshotCache() {
  globalForArena.cachedSnapshot = undefined;
  globalForArena.cachedProfileLookupMap = undefined;
  globalForArena.cachedSnapshotAt = 0;
}

/**
 * Calculates how many automatic engagement upvotes a profile should receive
 * if they haven't received a vote for more than 1 hour (3,600,000 ms).
 * Awards +1 upvote per elapsed idle hour (capped at +12 per check to keep ranks organic).
 */
function computeHourlyIdleBoost(profile: ArenaProfile, nowMs: number): number {
  const refTimeStr = profile.lastVotedAt || profile.createdAt;
  const refMs = refTimeStr ? new Date(refTimeStr).getTime() : nowMs;
  if (Number.isNaN(refMs) || nowMs - refMs < ONE_HOUR_MS) {
    return 0;
  }
  const elapsedHours = Math.floor((nowMs - refMs) / ONE_HOUR_MS);
  return Math.min(12, Math.max(1, elapsedHours));
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
  }

  const validIds = new Set(patakhas.map((p) => p.id));
  const map = globalForArena.patakhaArenaProfiles;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  let i = 0;
  for (const [key, profile] of map.entries()) {
    let updated = false;
    if (!validIds.has(profile.patakhaId)) {
      profile.patakhaId = patakhas[i % patakhas.length].id;
      updated = true;
    }

    // Apply automatic 1-hour idle upvote boost so users feel continuous engagement
    const boost = computeHourlyIdleBoost(profile, nowMs);
    if (boost > 0) {
      profile.votes += boost;
      profile.lastVotedAt = nowIso;
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

async function loadProfilesFromSource(): Promise<{
  profiles: ArenaProfile[];
  visitorCount: number;
  dbConnected: boolean;
}> {
  const patakhas = getAvailablePatakhas();
  const validIds = new Set(patakhas.map((p) => p.id));
  const db = await getMongoDb();

  if (db) {
    try {
      const col = db.collection<ArenaProfile>("profiles");
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

      const docs = await col
        .find({}, { projection: { voters: 0 } })
        .sort({ votes: -1, createdAt: -1 })
        .limit(500)
        .toArray();

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const shouldRunDbBoostWrite =
        !globalForArena.lastHourlyBoostCheckAt ||
        nowMs - globalForArena.lastHourlyBoostCheckAt > 30_000;

      const bulkBoostOps: {
        updateOne: {
          filter: { handle: string };
          update: { $inc: { votes: number }; $set: { lastVotedAt: string } };
        };
      }[] = [];

      const normalized = docs
        .filter((doc) => Boolean(doc.handle && sanitizeHandle(doc.handle)))
        .map((doc, idx) => {
          const clean = sanitizeHandle(doc.handle);
          const baseVotes = typeof doc.votes === "number" ? doc.votes : 10;
          const createdIso = doc.createdAt || nowIso;
          const lastVotedIso = doc.lastVotedAt || createdIso;

          const boost = computeHourlyIdleBoost(
            {
              ...doc,
              handle: clean,
              votes: baseVotes,
              createdAt: createdIso,
              lastVotedAt: lastVotedIso,
            },
            nowMs
          );

          if (boost > 0 && shouldRunDbBoostWrite) {
            bulkBoostOps.push({
              updateOne: {
                filter: { handle: clean },
                update: {
                  $inc: { votes: boost },
                  $set: { lastVotedAt: nowIso },
                },
              },
            });
          }

          return {
            id: clean,
            handle: clean,
            name: doc.name || clean,
            profileUrl: doc.profileUrl || `https://substack.com/@${clean}`,
            patakhaId: validIds.has(doc.patakhaId)
              ? doc.patakhaId
              : patakhas[idx % patakhas.length].id,
            votes: baseVotes + boost,
            createdAt: createdIso,
            lastVotedAt: boost > 0 ? nowIso : lastVotedIso,
          };
        });

      if (bulkBoostOps.length > 0) {
        globalForArena.lastHourlyBoostCheckAt = nowMs;
        await col.bulkWrite(bulkBoostOps, { ordered: false }).catch(() => {});
      }

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
        visitorCount,
        dbConnected: true,
      };
    } catch (e) {
      console.error("MongoDB read error, using memory fallback:", e);
    }
  }

  const map = getMemoryProfileMap();
  const visitorCount = globalForArena.patakhaVisitorCount ?? 1240;
  return {
    profiles: Array.from(map.values()).map(({ voters: _v, ...rest }) => rest),
    visitorCount,
    dbConnected: false,
  };
}

async function buildFreshArenaSnapshot(): Promise<ArenaSnapshot> {
  const patakhas = getAvailablePatakhas();
  const patakhaMap = new Map<string, PatakhaArchetype>(
    patakhas.map((p) => [p.id, p])
  );

  const {
    profiles: all,
    visitorCount,
    dbConnected,
  } = await loadProfilesFromSource();

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

  const lookupMap = new Map<string, RankedArenaProfile>();

  const rankedProfiles: RankedArenaProfile[] = all.map((p, idx) => {
    const archetype = patakhaMap.get(p.patakhaId) || patakhas[0];
    const clanMeta = intraClanRankMap.get(p.handle.toLowerCase()) || {
      clanRank: 1,
      clanTotalCount: 1,
    };
    const ranked: RankedArenaProfile = {
      ...p,
      patakhaName: archetype.name,
      patakhaEmoji: archetype.emoji,
      patakhaImageUrl: archetype.imageUrl,
      patakhaAccentHex: archetype.accentHex,
      globalRank: idx + 1,
      clanRank: clanMeta.clanRank,
      clanTotalCount: clanMeta.clanTotalCount,
    };
    lookupMap.set(p.handle.toLowerCase(), ranked);
    return ranked;
  });

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
    globalForArena.patakhaRecentEvents = rankedProfiles
      .slice(0, 5)
      .map((p, i) => ({
        id: `seed_${i}`,
        type: i % 2 === 0 ? "vote" : "join",
        handle: p.handle,
        patakhaName: p.patakhaName,
        patakhaEmoji: p.patakhaEmoji,
        votes: p.votes,
        timestamp: p.createdAt,
      }));
  }

  const snapshot: ArenaSnapshot = {
    patakhas,
    profiles: rankedProfiles,
    clans,
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
  if (
    !forceFresh &&
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

export async function voteForProfile(
  rawHandle: string,
  voterHash: string
): Promise<{
  profile: RankedArenaProfile | null;
  snapshot: ArenaSnapshot;
  alreadyVoted: boolean;
}> {
  const key = sanitizeHandle(rawHandle);
  if (!key) {
    return {
      profile: null,
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

  if (!alreadyVoted) {
    invalidateSnapshotCache();
  }

  const snapshot = await getArenaSnapshot(!alreadyVoted);
  const ranked =
    snapshot.profiles.find((p) => p.handle.toLowerCase() === key) || null;

  if (!alreadyVoted && ranked) {
    pushRecentEvent({
      type: "vote",
      handle: ranked.handle,
      patakhaName: ranked.patakhaName,
      patakhaEmoji: ranked.patakhaEmoji,
      votes: ranked.votes,
    });
  }

  return {
    profile: ranked,
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