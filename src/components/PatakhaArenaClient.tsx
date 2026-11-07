"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import FireworkBackground from "@/components/FireworkBackground";
import DiwaliDecorationLights from "@/components/DiwaliDecorationLights";
import PatakhaMemeCard from "@/components/PatakhaMemeCard";
import DiwaliSnapFrameStudio from "@/components/DiwaliSnapFrameStudio";
import PublicVoteSpotlight from "@/components/PublicVoteSpotlight";
import HeadToHeadBattle from "@/components/HeadToHeadBattle";
import MyActiveBattlesPanel from "@/components/MyActiveBattlesPanel";
import ClanWarsMatrix from "@/components/ClanWarsMatrix";
import ArenaLeaderboard from "@/components/ArenaLeaderboard";
import ClientErrorReporter from "@/components/ClientErrorReporter";
import { PatakhaId } from "@/lib/patakhas";
import {
  ArenaSnapshot,
  PatakhaClanSummary,
  RankedArenaBattle,
  RankedArenaProfile,
  RecentArenaEvent,
} from "@/lib/store";
import {
  Flame,
  Search,
  Users,
  Zap,
  Sparkles,
  Camera,
  Eye,
  CheckCircle2,
  Activity,
  Swords,
  HelpCircle,
  X,
  Github,
  Code2,
  AtSign,
  BookOpen,
  Compass,
  Download,
  Gift,
  Clock,
  Trophy,
} from "lucide-react";

const QUICK_SAMPLE_USERS = [
  "pragmaticengineer",
  "aarav",
  "rohan",
  "priya",
  "kabir",
  "ananya",
];

type GuideTabId = "quickstart" | "battle-tagging" | "frames" | "finale";
type MobileBottomTabId = "card" | "battle" | "ranks" | "guide";

const BROADCAST_CHANNEL_NAME = "patakha_arena_live_channel_v1";

function getOrCreateClientVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const key = "patakha_visitor_id_v1";
    let existing = window.localStorage.getItem(key);
    if (!existing) {
      existing = `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      window.localStorage.setItem(key, existing);
    }
    return existing;
  } catch {
    return "";
  }
}

function getStoredVotedHandles(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem("patakha_voted_handles_v1");
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveStoredVotedHandles(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      "patakha_voted_handles_v1",
      JSON.stringify(Array.from(set))
    );
  } catch {
    // ignore
  }
}

function getStoredMyHandle(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("patakha_my_handle_v1") || "";
  } catch {
    return "";
  }
}

function saveStoredMyHandle(handle: string) {
  if (typeof window === "undefined" || !handle) return;
  try {
    window.localStorage.setItem("patakha_my_handle_v1", handle.toLowerCase());
  } catch {
    // ignore
  }
}

function getStoredOthersVotedCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("patakha_others_voted_count_v1");
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

function saveStoredOthersVotedCount(count: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      "patakha_others_voted_count_v1",
      String(Math.max(0, count))
    );
  } catch {
    // ignore
  }
}

function saveCreatorToken(handle: string, token?: string) {
  if (typeof window === "undefined" || !token) return;
  try {
    const raw = window.localStorage.getItem("patakha_creator_tokens_v1");
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[handle.toLowerCase()] = token;
    window.localStorage.setItem(
      "patakha_creator_tokens_v1",
      JSON.stringify(map)
    );
  } catch {
    // ignore
  }
}

export default function PatakhaArenaClient() {
  const [isPublicVoteMode, setIsPublicVoteMode] = useState(false);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] =
    useState<GuideTabId>("quickstart");
  const [mobileBottomTab, setMobileBottomTab] =
    useState<MobileBottomTabId>("card");

  const [battleHandles, setBattleHandles] = useState<[string, string]>([
    "pragmaticengineer",
    "aarav",
  ]);
  const [battleProfilesMap, setBattleProfilesMap] = useState<
    Record<string, RankedArenaProfile>
  >({});
  const [battleHours, setBattleHours] = useState<number>(12);
  const [battleStartMs, setBattleStartMs] = useState<number>(1729728000000);
  const [activeBattles, setActiveBattles] = useState<RankedArenaBattle[]>([]);

  const [activeStudioTab, setActiveStudioTab] = useState<
    "patakha-card" | "snap-frame"
  >("patakha-card");

  const [urlOrHandle, setUrlOrHandle] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [existingUserMatch, setExistingUserMatch] =
    useState<RankedArenaProfile | null>(null);
  const [lastLoadedWasExisting, setLastLoadedWasExisting] = useState(false);

  const [myHandle, setMyHandle] = useState<string>("");
  const [othersVotedCount, setOthersVotedCount] = useState<number>(0);

  const [featuredProfile, setFeaturedProfile] =
    useState<RankedArenaProfile | null>(null);
  const featuredProfileRef = useRef<RankedArenaProfile | null>(null);
  const [profiles, setProfiles] = useState<RankedArenaProfile[]>([]);
  const profilesRef = useRef<RankedArenaProfile[]>([]);
  const [clans, setClans] = useState<PatakhaClanSummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentArenaEvent[]>([]);
  const [totalCreators, setTotalCreators] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [visitorCount, setVisitorCount] = useState(1240);

  const [selectedPatakha, setSelectedPatakha] = useState<PatakhaId | "all">(
    "all"
  );
  const [votingHandle, setVotingHandle] = useState<string | null>(null);
  const [votedHandles, setVotedHandles] = useState<Set<string>>(new Set());

  const topStudioRef = useRef<HTMLDivElement | null>(null);
  const cardSectionRef = useRef<HTMLDivElement | null>(null);
  const categoriesSectionRef = useRef<HTMLDivElement | null>(null);
  const leaderboardSectionRef = useRef<HTMLDivElement | null>(null);

  // System Design Polling Refs: ETag caching, Single-Flight coalescing, Exponential Backoff, BroadcastChannel
  const lastEtagRef = useRef<string | null>(null);
  const inflightPollRef = useRef<Promise<void> | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    featuredProfileRef.current = featuredProfile;
  }, [featuredProfile]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4200);
  };

  const triggerDiwaliConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#FFE600", "#FF7B00", "#EF233C", "#38BDF8", "#4A1238"],
      });
    } catch {
      // ignore
    }
  };

  const syncSnapshotToState = useCallback(
    (snapshot: ArenaSnapshot, broadcastToOtherTabs = false) => {
      const list = snapshot.profiles || [];
      setProfiles(list);
      profilesRef.current = list;
      setClans(snapshot.clans || []);
      setActiveBattles(snapshot.activeBattles || []);
      setRecentEvents(snapshot.recentEvents || []);
      setTotalCreators(snapshot.totalCreators || 0);
      setTotalVotes(snapshot.totalVotes || 0);
      if (typeof snapshot.visitorCount === "number") {
        setVisitorCount(snapshot.visitorCount);
      }

      // Keep featuredProfile and battleProfilesMap synced with live vote counts & ranks
      const currentFeatured = featuredProfileRef.current;
      if (currentFeatured) {
        const updatedFeatured = list.find(
          (p) =>
            p.handle.toLowerCase() === currentFeatured.handle.toLowerCase()
        );
        if (updatedFeatured) {
          setFeaturedProfile(updatedFeatured);
        }
      }

      setBattleProfilesMap((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const k of Object.keys(next)) {
          const fresh = list.find((p) => p.handle.toLowerCase() === k);
          if (
            fresh &&
            (fresh.votes !== next[k].votes ||
              fresh.globalRank !== next[k].globalRank)
          ) {
            next[k] = fresh;
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      if (broadcastToOtherTabs && broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({
            type: "SNAPSHOT_SYNC",
            snapshot,
          });
        } catch {
          // ignore
        }
      }
    },
    []
  );

  // Setup Cross-Tab BroadcastChannel so actions in one tab sync all other open tabs in 0ms
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === "SNAPSHOT_SYNC" && event.data?.snapshot) {
          syncSnapshotToState(event.data.snapshot, false);
        }
      };
      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch {
      return;
    }
  }, [syncSnapshotToState]);

  /**
   * System-Design Single-Flight + ETag Conditional Poll Function:
   * - Coalesces concurrent calls into a single network promise.
   * - Sends `If-None-Match` so unchanged state returns `304 Not Modified` with 0-byte payload.
   */
  const pollArenaSnapshot = useCallback(
    async (forceFresh = false): Promise<void> => {
      if (inflightPollRef.current) {
        return inflightPollRef.current;
      }

      const task = (async () => {
        try {
          const headers: Record<string, string> = {};
          if (!forceFresh && lastEtagRef.current) {
            headers["If-None-Match"] = lastEtagRef.current;
          }

          const res = await fetch("/api/leaderboard", {
            cache: "no-store",
            headers,
          });

          if (res.status === 304) {
            consecutiveErrorsRef.current = 0;
            return;
          }

          if (!res.ok) {
            consecutiveErrorsRef.current += 1;
            return;
          }

          const newEtag = res.headers.get("etag");
          if (newEtag) {
            lastEtagRef.current = newEtag;
          }

          consecutiveErrorsRef.current = 0;
          const snapshot: ArenaSnapshot = await res.json();
          syncSnapshotToState(snapshot, false);
        } catch {
          consecutiveErrorsRef.current += 1;
        } finally {
          inflightPollRef.current = null;
        }
      })();

      inflightPollRef.current = task;
      return task;
    },
    [syncSnapshotToState]
  );

  /**
   * Adaptive Jittered Polling Loop + Page Visibility API Listener:
   * - Base interval: 3000ms + random(0..450ms) jitter to prevent thundering herd.
   * - Exponential backoff on network failure (up to 15s).
   * - Pauses background polling when tab is hidden; triggers instant fetch when tab regains visibility/focus.
   */
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const scheduleNextPoll = () => {
      if (isCancelled) return;
      const errCount = consecutiveErrorsRef.current;
      const backoffMultiplier = Math.min(4, Math.pow(1.6, errCount));
      const jitterMs = Math.floor(Math.random() * 450);
      const delayMs = Math.round(3000 * backoffMultiplier) + jitterMs;

      timeoutId = setTimeout(async () => {
        if (isCancelled) return;
        if (typeof document === "undefined" || !document.hidden) {
          await pollArenaSnapshot(false);
        }
        scheduleNextPoll();
      }, delayMs);
    };

    scheduleNextPoll();

    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        pollArenaSnapshot(false);
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [pollArenaSnapshot]);

  const applyArenaSnapshot = (
    profile: RankedArenaProfile,
    snapshot: ArenaSnapshot,
    syncUrl = false
  ) => {
    setFeaturedProfile(profile);
    featuredProfileRef.current = profile;
    syncSnapshotToState(snapshot, true);
    if (syncUrl && typeof window !== "undefined" && profile?.handle) {
      const nextUrl = `${window.location.pathname}?u=${encodeURIComponent(
        profile.handle
      )}`;
      window.history.replaceState({}, "", nextUrl);
    }
  };

  const exitSpecialModesToStudio = () => {
    setIsPublicVoteMode(false);
    setIsBattleMode(false);
    setMobileBottomTab("card");
    setUrlOrHandle("");
    setExistingUserMatch(null);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", window.location.pathname);
    }
    topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Starts or syncs a 1v1 Head-to-Head Battle in the Database (`POST /api/battle`)
   * so the exact countdown (`startMs` + `hours`) and contenders are persisted and visible
   * to all users across the website!
   */
  const startHeadToHeadBattle = useCallback(
    async (
      rawA: string,
      rawB: string,
      hoursParam = battleHours,
      startMsParam?: number,
      explicitProfilesList?: RankedArenaProfile[],
      shouldScroll = false,
      forceUpdate = false
    ) => {
      const cleanA = rawA
        .trim()
        .toLowerCase()
        .replace(/^@+/, "")
        .replace(/[^a-z0-9_-]/g, "")
        .replace(/^[-_]+|[-_]+$/g, "")
        .slice(0, 32);

      let cleanB = rawB
        .trim()
        .toLowerCase()
        .replace(/^@+/, "")
        .replace(/[^a-z0-9_-]/g, "")
        .replace(/^[-_]+|[-_]+$/g, "")
        .slice(0, 32);

      if (!cleanA) return;

      const latestProfiles = explicitProfilesList || profilesRef.current;

      if (!cleanB || cleanA === cleanB) {
        cleanB =
          latestProfiles.find((p) => p.handle.toLowerCase() !== cleanA)
            ?.handle || (cleanA === "aarav" ? "rohan" : "aarav");
      }

      const clampedHours = Math.min(48, Math.max(1, Number(hoursParam) || 12));

      try {
        const res = await fetch("/api/battle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handleA: cleanA,
            handleB: cleanB,
            hours: clampedHours,
            startMs: startMsParam,
            forceUpdate,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.snapshot) {
            syncSnapshotToState(data.snapshot, true);
          }
          if (data.battle) {
            const b: RankedArenaBattle = data.battle;
            setBattleProfilesMap((prev) => ({
              ...prev,
              [b.handleA.toLowerCase()]: b.fighterA,
              [b.handleB.toLowerCase()]: b.fighterB,
            }));
            setBattleHandles([b.handleA, b.handleB]);
            setBattleHours(b.hours);
            setBattleStartMs(b.startMs);
            setIsPublicVoteMode(false);
            setIsBattleMode(true);
            setMobileBottomTab("battle");

            if (typeof window !== "undefined") {
              const vsUrl = `${
                window.location.pathname
              }?vs=${encodeURIComponent(b.handleA)},${encodeURIComponent(
                b.handleB
              )}&hours=${b.hours}&start=${b.startMs}`;
              window.history.replaceState({}, "", vsUrl);
            }

            if (shouldScroll) {
              topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
            }
            return;
          }
        }
      } catch {
        // Fallback to local state if network fails
      }

      const now = Date.now();
      const resolvedStartMs =
        startMsParam && !Number.isNaN(startMsParam) && !forceUpdate
          ? Math.min(now, Math.max(now - 30 * 86_400_000, startMsParam))
          : now;

      setBattleHandles([cleanA, cleanB]);
      setBattleHours(clampedHours);
      setBattleStartMs(resolvedStartMs);
      setIsPublicVoteMode(false);
      setIsBattleMode(true);
      setMobileBottomTab("battle");

      if (shouldScroll) {
        topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [battleHours, syncSnapshotToState]
  );

  useEffect(() => {
    if (isPublicVoteMode || isBattleMode) return;
    const raw = urlOrHandle.trim();
    if (!raw || raw.length < 2) {
      setExistingUserMatch(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profile?u=${encodeURIComponent(raw)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.exists && data.profile) {
          setExistingUserMatch(data.profile);
        } else {
          setExistingUserMatch(null);
        }
      } catch {
        // ignore
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [urlOrHandle, isPublicVoteMode, isBattleMode]);

  useEffect(() => {
    setBattleStartMs(Date.now());
    setVotedHandles(getStoredVotedHandles());
    setMyHandle(getStoredMyHandle());
    setOthersVotedCount(getStoredOthersVotedCount());

    const visitorId = getOrCreateClientVisitorId();

    fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.visitorCount === "number") {
          setVisitorCount(d.visitorCount);
        }
      })
      .catch(() => {});

    async function initArena() {
      try {
        const params = new URLSearchParams(window.location.search);
        const vsParam = (params.get("vs") || "").trim();
        const hoursQuery = parseInt(params.get("hours") || "", 10);
        const daysQuery = parseInt(params.get("days") || "", 10);
        const startQuery = parseInt(params.get("start") || "", 10);
        const sharedUser = (
          params.get("u") ||
          params.get("vote") ||
          ""
        ).trim();

        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (!res.ok) return;
        const etag = res.headers.get("etag");
        if (etag) lastEtagRef.current = etag;
        const snapshot: ArenaSnapshot = await res.json();

        const loadedProfiles = snapshot.profiles || [];
        syncSnapshotToState(snapshot, false);

        // Pre-warm all Patakha card images into browser cache
        (snapshot.clans || []).forEach((clan) => {
          const preload = new Image();
          preload.src = clan.imageUrl;
        });

        if (vsParam && vsParam.includes(",")) {
          const [rawA, rawB] = vsParam.split(",");
          if (rawA) {
            const resolvedHours = !Number.isNaN(hoursQuery)
              ? hoursQuery
              : !Number.isNaN(daysQuery)
              ? daysQuery * 24
              : 12;
            await startHeadToHeadBattle(
              rawA,
              rawB || "",
              resolvedHours,
              Number.isNaN(startQuery) ? undefined : startQuery,
              loadedProfiles,
              false,
              false
            );
            return;
          }
        }

        if (sharedUser) {
          const cleanTarget = sharedUser
            .toLowerCase()
            .replace(/^@+/, "")
            .replace(/[^a-z0-9_-]/g, "");
          if (cleanTarget) {
            const existingInLeaderboard = loadedProfiles.find(
              (p) => p.handle.toLowerCase() === cleanTarget
            );

            if (existingInLeaderboard) {
              setFeaturedProfile(existingInLeaderboard);
              featuredProfileRef.current = existingInLeaderboard;
              setIsPublicVoteMode(true);
              return;
            }

            const createRes = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input: cleanTarget }),
            });
            if (createRes.ok) {
              const createdData = await createRes.json();
              applyArenaSnapshot(
                createdData.profile,
                createdData.snapshot,
                true
              );
              setIsPublicVoteMode(true);
              return;
            }
          }
        }

        const storedHandle = getStoredMyHandle();
        const mySavedProfile = storedHandle
          ? loadedProfiles.find(
              (p) => p.handle.toLowerCase() === storedHandle.toLowerCase()
            )
          : null;

        if (mySavedProfile) {
          setFeaturedProfile(mySavedProfile);
          featuredProfileRef.current = mySavedProfile;
        } else if (loadedProfiles.length > 0) {
          setFeaturedProfile(loadedProfiles[0]);
          featuredProfileRef.current = loadedProfiles[0];
        }
      } catch (e) {
        console.error("Failed to load arena:", e);
      }
    }
    initArena();

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const vs = params.get("vs");
      const u = params.get("u") || params.get("vote");
      if (!vs && !u) {
        setIsBattleMode(false);
        setIsPublicVoteMode(false);
        setMobileBottomTab("card");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitUsernameOrUrl = async (rawValue: string) => {
    const targetInput = rawValue.trim();
    if (!targetInput) {
      setErrorMsg("Please enter your profile URL or username!");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: targetInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not categorize profile.");
        return;
      }

      if (data.profile?.handle) {
        setMyHandle(data.profile.handle);
        saveStoredMyHandle(data.profile.handle);
      }

      if (data.creatorToken && data.profile?.handle) {
        saveCreatorToken(data.profile.handle, data.creatorToken);
      }

      setLastLoadedWasExisting(Boolean(data.alreadyExists));
      applyArenaSnapshot(data.profile, data.snapshot, true);
      setActiveStudioTab("patakha-card");
      setIsPublicVoteMode(false);
      setIsBattleMode(false);
      setMobileBottomTab("card");
      triggerDiwaliConfetti();

      if (data.alreadyExists) {
        showToast(
          `Loaded @${data.profile.handle}'s registered ${data.profile.patakhaName} card (Rank #${data.profile.clanRank})!`
        );
      } else {
        showToast(
          `Created @${data.profile.handle} as ${data.profile.patakhaName} (Rank #${data.profile.clanRank})!`
        );
      }

      setTimeout(() => {
        cardSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 150);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitUsernameOrUrl(urlOrHandle);
  };

  const handleVote = async (handle: string) => {
    const cleanKey = handle.toLowerCase();
    const activeMyHandle = (
      myHandle ||
      featuredProfile?.handle ||
      ""
    ).toLowerCase();

    if (votedHandles.has(cleanKey)) {
      showToast(`You already upvoted @${handle}!`);
      return;
    }

    setVotingHandle(handle);

    const isVotingForOther = !activeMyHandle || activeMyHandle !== cleanKey;
    const nextOthersCount = isVotingForOther
      ? othersVotedCount + 1
      : othersVotedCount;

    // Optimistic UI update
    const updatedVoted = new Set(votedHandles);
    updatedVoted.add(cleanKey);
    setVotedHandles(updatedVoted);
    saveStoredVotedHandles(updatedVoted);

    if (isVotingForOther) {
      setOthersVotedCount(nextOthersCount);
      saveStoredOthersVotedCount(nextOthersCount);
    }

    try {
      const voterId = getOrCreateClientVisitorId();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          voterId,
          voterHandle: activeMyHandle,
          othersVotedCount: nextOthersCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;

      if (typeof data.othersVotedCount === "number") {
        setOthersVotedCount(data.othersVotedCount);
        saveStoredOthersVotedCount(data.othersVotedCount);
      }

      if (data.alreadyVoted) {
        showToast(`Your upvote for @${handle} is already counted!`);
      } else if (data.bonusAwarded && data.bonusProfile) {
        triggerDiwaliConfetti();
        showToast(
          `🎁 3-Vote Bonus Unlocked! You upvoted 3 users, so @${data.bonusProfile.handle} got +1 Bonus Vote (${data.bonusProfile.votes} total)!`
        );
      } else {
        triggerDiwaliConfetti();
        const rem = 3 - ((data.othersVotedCount ?? nextOthersCount) % 3);
        if (activeMyHandle && activeMyHandle !== cleanKey) {
          showToast(
            `Upvoted @${handle} (${data.profile.votes} votes)! Upvote ${rem} more ${
              rem === 1 ? "user" : "users"
            } to earn +1 Bonus Vote for @${activeMyHandle}!`
          );
        } else {
          showToast(
            `Upvoted @${handle}! Now at ${data.profile.votes} votes (Rank #${data.profile.clanRank}).`
          );
        }
      }

      if (data.snapshot) {
        syncSnapshotToState(data.snapshot, true);
      }
    } catch (e) {
      console.error("Failed to vote:", e);
    } finally {
      setVotingHandle(null);
    }
  };

  const handleInspectProfileFromLeaderboard = (profile: RankedArenaProfile) => {
    setFeaturedProfile(profile);
    featuredProfileRef.current = profile;
    setIsBattleMode(false);
    setIsPublicVoteMode(true);
    setMobileBottomTab("card");
    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}?u=${encodeURIComponent(
        profile.handle
      )}`;
      window.history.replaceState({}, "", nextUrl);
    }
    topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStartBattleWithProfile = (targetProfile: RankedArenaProfile) => {
    const activeMyHandle =
      myHandle || featuredProfile?.handle || "pragmaticengineer";
    const fighter1 =
      activeMyHandle.toLowerCase() !== targetProfile.handle.toLowerCase()
        ? activeMyHandle
        : profiles[0]?.handle !== targetProfile.handle
        ? profiles[0]?.handle || "pragmaticengineer"
        : "aarav";

    startHeadToHeadBattle(
      fighter1,
      targetProfile.handle,
      battleHours,
      Date.now(),
      profiles,
      true,
      true
    );
  };

  const fighterAProfile =
    profiles.find(
      (p) => p.handle.toLowerCase() === battleHandles[0].toLowerCase()
    ) ||
    battleProfilesMap[battleHandles[0].toLowerCase()] ||
    featuredProfile ||
    profiles[0] ||
    null;

  const fighterBProfile =
    profiles.find(
      (p) => p.handle.toLowerCase() === battleHandles[1].toLowerCase()
    ) ||
    battleProfilesMap[battleHandles[1].toLowerCase()] ||
    profiles.find(
      (p) => p.handle.toLowerCase() !== (fighterAProfile?.handle || "")
    ) ||
    profiles[1] ||
    profiles[0] ||
    null;

  const effectiveMyHandle = myHandle || "";
  const myActiveBattlesCount = activeBattles.filter(
    (b) =>
      effectiveMyHandle &&
      (b.handleA.toLowerCase() === effectiveMyHandle.toLowerCase() ||
        b.handleB.toLowerCase() === effectiveMyHandle.toLowerCase())
  ).length;

  const progressInCycle = othersVotedCount % 3;
  const votesNeededForNextBonus = 3 - progressInCycle;

  return (
    <div className="relative min-h-screen text-amber-50 pb-28 sm:pb-20 overflow-x-hidden">
      <ClientErrorReporter />

      {/* Background Artwork Layer */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url('/api/bg-image')`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(45, 6, 30, 0.30) 0%, rgba(28, 3, 19, 0.78) 65%, rgba(16, 2, 11, 0.94) 100%)",
        }}
      />

      <DiwaliDecorationLights />
      <FireworkBackground />

      {/* Floating Toast Notification (Positioned above mobile bottom nav bar on phones) */}
      {toastMsg && (
        <div className="fixed bottom-20 sm:bottom-5 right-4 left-4 sm:left-auto z-50 max-w-md bg-[#2A061D] border-2 border-[#FFE600] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#FFE600] shrink-0" />
          <span className="text-xs sm:text-sm font-extrabold">{toastMsg}</span>
        </div>
      )}

      {/* SIMPLIFIED USER MANUAL MODAL */}
      {showUserGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowUserGuideModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-[#240418] border-2 border-[#FFE600] rounded-3xl p-4 sm:p-7 shadow-[0_24px_70px_rgba(0,0,0,0.9)] space-y-5 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#FFE600]/30">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#FFE600] text-[#380828] text-xs font-black uppercase">
                  Simple User Guide
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-white">
                  🧨 How Rate My Patakha Works
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUserGuideModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFE600] transition"
                aria-label="Close guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Guide Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#13010C] p-1.5 rounded-2xl border border-[#FFE600]/35">
              <button
                type="button"
                onClick={() => setActiveGuideTab("quickstart")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "quickstart"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1. Cracker Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("battle-tagging")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "battle-tagging"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>2. 1v1 Battles</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("frames")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "frames"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>3. Photo Frames</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("finale")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "finale"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>4. +1 Bonus Rule</span>
              </button>
            </div>

            {activeGuideTab === "quickstart" && (
              <div className="space-y-3 text-xs sm:text-sm text-amber-100/95">
                <div className="bg-[#16020F] border border-[#FFE600]/40 rounded-2xl p-4 space-y-2">
                  <div className="text-[#FFE600] font-black text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Step-by-Step: Create & Share Your Cracker Card
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-amber-100/90">
                    <li>
                      <strong>Enter Your @Username</strong>: Type your handle
                      (like <code className="text-[#FFE600]">@rohan</code>) in
                      the top box and tap{" "}
                      <strong>&ldquo;Generate My Cracker Card&rdquo;</strong>.
                    </li>
                    <li>
                      <strong>Get Your Clan & Rank</strong>: You are matched
                      with a Patakha Clan and placed on the live Leaderboard.
                    </li>
                    <li>
                      <strong>Download & Share</strong>: Tap{" "}
                      <strong>&ldquo;Download Poster&rdquo;</strong> to save
                      your HD PNG card, and send your voting link (
                      <code className="text-[#FFE600]">/?u=yourname</code>) to
                      friends so they can upvote you!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeGuideTab === "battle-tagging" && (
              <div className="space-y-3 text-xs sm:text-sm text-amber-100/95">
                <div className="bg-[#16020F] border border-[#FFE600]/45 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[#FFE600] font-black text-sm flex items-center gap-1.5">
                    <AtSign className="w-4 h-4 text-emerald-400" />
                    How Live 1v1 Battles & Multi-Battle Tracking Work
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-amber-100/90">
                    <li>
                      <strong>Start Any 1v1 Battle</strong>: Click{" "}
                      <strong>&ldquo;⚔️ 1v1 Battle&rdquo;</strong> at the top or
                      click the <strong>1v1</strong> button next to any user on
                      the Leaderboard.
                    </li>
                    <li>
                      <strong>Pick Hours (1 to 48 Hours)</strong>: Choose how
                      many hours the battle should run and click{" "}
                      <strong>Launch</strong>. Your battle is saved in the live
                      database so everyone on the site can see it!
                    </li>
                    <li>
                      <strong>Track All Live Battles Above Leaderboard</strong>:
                      Scroll down to the <strong>Live 1v1 Arena Battles</strong>{" "}
                      section right above the Leaderboard to see all ongoing
                      matchups and your own battles!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeGuideTab === "frames" && (
              <div className="space-y-3 text-xs sm:text-sm text-amber-100/95">
                <div className="bg-[#16020F] border border-[#FFE600]/40 rounded-2xl p-4 space-y-2">
                  <div className="text-[#FFE600] font-black text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-400" />
                    How to Frame Your Photo or Rangoli (Live Text on Image)
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-amber-100/90">
                    <li>
                      Open the{" "}
                      <strong>&ldquo;📷 Photo / Rangoli Frame&rdquo;</strong>{" "}
                      tab and upload your photo, selfie, or Rangoli.
                    </li>
                    <li>
                      Choose from 4 handcrafted frames (Engraved Oak Wood,
                      Crimson Palace Arch, Marigold Ring, or Golden Polaroid).
                    </li>
                    <li>
                      <strong>100% Live Canvas Text</strong>: Your{" "}
                      <code className="text-[#FFE600]">@username</code>,{" "}
                      <code className="text-[#FFE600]">Greeting Title</code>,{" "}
                      <code className="text-[#FFE600]">Rank</code>, and{" "}
                      <code className="text-[#FFE600]">Votes</code> are drawn
                      live onto the frame image as you type or receive votes!
                    </li>
                    <li>
                      <strong>Privacy First — Download Your Poster</strong>:
                      Your personal photo never leaves your device. Tap{" "}
                      <strong>&ldquo;1. Download Poster&rdquo;</strong> first,
                      and share that image along with your voting link!
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeGuideTab === "finale" && (
              <div className="space-y-3 text-xs sm:text-sm text-amber-100/95">
                <div className="bg-[#16020F] border border-[#FFE600]/45 rounded-2xl p-4 space-y-2">
                  <div className="text-[#FFE600] font-black text-sm flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-emerald-400" />
                    Three Votes to Others = +1 Bonus Vote to Your Own Score!
                  </div>
                  <p className="text-amber-100/90 leading-relaxed">
                    Every time you upvote <strong>3 other users</strong> on the
                    Leaderboard, Clan list, or 1v1 Battles (3, 6, 9, 12...),{" "}
                    <strong className="text-[#FFE600]">
                      your own profile score automatically increases by +1 vote
                      in real time!
                    </strong>
                  </p>
                  <p className="text-amber-100/90 leading-relaxed pt-1">
                    Plus, every registered user automatically receives{" "}
                    <strong className="text-[#FFE600]">
                      +1 vote every hour
                    </strong>
                    , and the <strong>Overall #1 Leaderboard Winner</strong>{" "}
                    will be crowned in <strong>1 Week</strong>!
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/SavantCode/rateMyPatakha"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-extrabold text-[#FFE600] hover:underline inline-flex items-center gap-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
                <a
                  href="/audit"
                  className="text-xs font-extrabold text-emerald-300 hover:underline inline-flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Developer Audit (/audit)</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setShowUserGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm shadow-lg transition"
              >
                Got It, Let&apos;s Go! 🧨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container — Top padding clears the z-40 hanging lights & lamps */}
      <div
        ref={topStudioRef}
        className="relative z-20 max-w-6xl mx-auto px-3 sm:px-6 pt-14 sm:pt-20 md:pt-24 space-y-3 sm:space-y-4"
      >
        {/* PROMINENT FESTIVAL HEADER BAR (Framed cleanly between the hanging lamps on mobile & desktop) */}
        <header className="max-w-5xl mx-6 sm:mx-12 md:mx-auto">
          <div className="bg-gradient-to-r from-[#28051B]/95 via-[#340724]/95 to-[#28051B]/95 border-2 border-[#FFE600]/80 rounded-3xl px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col lg:flex-row items-center justify-between gap-2.5 sm:gap-4 shadow-[0_14px_36px_rgba(0,0,0,0.82)] backdrop-blur-md">
            {/* Left / Center Brand Emblem + Prominent Title + Subtitle */}
            <div
              onClick={exitSpecialModesToStudio}
              className="flex items-center gap-3 sm:gap-3.5 cursor-pointer group"
            >
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#FFE600] via-[#FF9F1C] to-[#EF233C] border-2 border-white/80 flex items-center justify-center shadow-[0_0_20px_rgba(255,230,0,0.45)] shrink-0 group-hover:scale-105 transition">
                <span className="text-xl sm:text-2xl leading-none">🧨</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none text-white drop-shadow">
                  Rate My <span className="gold-shimmer">Patakha</span>
                </h1>
                <p className="text-[11px] sm:text-xs font-extrabold text-amber-200/90 mt-1 leading-tight">
                  {clans.length || 7} Cracker Clans • Photo/Rangoli Frames • 1v1
                  Battles
                </p>
              </div>
            </div>

            {/* Right Live Stat Pills & Quick Actions (Centered & wrapped cleanly on mobile, inline on desktop) */}
            <div className="w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/55 text-emerald-300 text-[11px] sm:text-xs font-black shadow-sm">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{visitorCount.toLocaleString()} Visitors</span>
              </div>

              <div
                onClick={() =>
                  leaderboardSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#15020E] border border-[#FFE600]/40 text-amber-100 text-[11px] sm:text-xs font-black hover:border-[#FFE600] transition"
                title="Registered Users"
              >
                <Users className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>{totalCreators}</span>
              </div>

              <div
                onClick={() =>
                  leaderboardSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#15020E] border border-[#FFE600]/40 text-amber-100 text-[11px] sm:text-xs font-black hover:border-[#FFE600] transition"
                title="Total Live Votes"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>{totalVotes}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  categoriesSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#15020E] hover:bg-white/10 border border-[#FFE600]/45 text-amber-100 text-xs font-extrabold transition"
              >
                <Compass className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>Browse Clans</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUserGuideModal(true)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#15020E] hover:bg-white/10 border border-[#FFE600]/45 text-amber-100 text-xs font-extrabold transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>Manual</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isBattleMode) {
                    setIsBattleMode(false);
                    setMobileBottomTab("card");
                    if (typeof window !== "undefined") {
                      window.history.pushState(
                        {},
                        "",
                        window.location.pathname
                      );
                    }
                  } else {
                    const fA =
                      effectiveMyHandle ||
                      featuredProfile?.handle ||
                      profiles[0]?.handle ||
                      "pragmaticengineer";
                    const fB =
                      profiles.find(
                        (p) => p.handle.toLowerCase() !== fA.toLowerCase()
                      )?.handle || "aarav";
                    startHeadToHeadBattle(
                      fA,
                      fB,
                      battleHours,
                      Date.now(),
                      profiles,
                      false,
                      false
                    );
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFE600] hover:bg-amber-300 text-[#380828] text-xs font-black shadow transition"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>
                  {isBattleMode
                    ? "Exit Battle"
                    : myActiveBattlesCount > 0
                    ? `1v1 Battle (${myActiveBattlesCount})`
                    : "1v1 Battle"}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* SLIM ONE-LINER LIVE ARENA ACTIVITY TICKER */}
        {recentEvents.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-[#180210]/90 border border-[#FFE600]/35 rounded-full px-3.5 py-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shrink-0">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="text-[#FFE600]">LIVE ARENA:</span>
              </span>
              <div className="flex items-center gap-3.5 text-[11px] sm:text-xs font-bold text-amber-100/90 whitespace-nowrap">
                {recentEvents.slice(0, 7).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      if (ev.type === "battle" && ev.rivalHandle) {
                        startHeadToHeadBattle(
                          ev.handle,
                          ev.rivalHandle,
                          ev.battleHours || 12,
                          undefined,
                          profiles,
                          true,
                          false
                        );
                        return;
                      }
                      const found = profiles.find(
                        (p) =>
                          p.handle.toLowerCase() === ev.handle.toLowerCase()
                      );
                      if (found) handleInspectProfileFromLeaderboard(found);
                    }}
                    className="inline-flex items-center gap-1 hover:text-[#FFE600] transition"
                  >
                    <span>{ev.type === "vote" ? "🔥" : ev.patakhaEmoji}</span>
                    {ev.type === "battle" && ev.rivalHandle ? (
                      <>
                        <span className="font-black text-[#FFE600]">
                          @{ev.handle} vs @{ev.rivalHandle}
                        </span>
                        <span className="text-rose-300">
                          ({ev.battleHours || 12}h battle)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-black text-white">
                          @{ev.handle}
                        </span>
                        <span className="text-amber-200/75">
                          {ev.type === "vote"
                            ? `upvoted (${ev.votes})`
                            : `joined ${ev.patakhaName}`}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONDITIONAL HERO AREA:
            1) 1v1 HEAD-TO-HEAD RIVALRY BATTLE MODE (`/?vs=user1,user2&hours=12`)
            2) DEDICATED PUBLIC VOTING SPOTLIGHT (`/?u=username`)
            3) CREATOR STUDIO (Cracker Card + Wooden Frame Studio) */}
        {isBattleMode && fighterAProfile && fighterBProfile ? (
          <HeadToHeadBattle
            fighterA={fighterAProfile}
            fighterB={fighterBProfile}
            allProfiles={profiles}
            activeBattles={activeBattles}
            battleHours={battleHours}
            battleStartMs={battleStartMs}
            onVote={handleVote}
            votedHandles={votedHandles}
            votingHandle={votingHandle}
            onChangeMatchup={(a, b, hrs, forceUpdate) =>
              startHeadToHeadBattle(
                a,
                b,
                hrs ?? battleHours,
                forceUpdate ? Date.now() : battleStartMs,
                profiles,
                false,
                Boolean(forceUpdate)
              )
            }
            onExitToStudio={exitSpecialModesToStudio}
          />
        ) : isPublicVoteMode && featuredProfile ? (
          <PublicVoteSpotlight
            profile={featuredProfile}
            allProfiles={profiles}
            onVote={handleVote}
            hasVoted={votedHandles.has(featuredProfile.handle.toLowerCase())}
            isVoting={votingHandle === featuredProfile.handle}
            onSwitchToCreatorStudio={exitSpecialModesToStudio}
            onScrollToLeaderboard={() => {
              setMobileBottomTab("ranks");
              leaderboardSectionRef.current?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            onStartRivalryBattle={(a, b) =>
              startHeadToHeadBattle(
                a,
                b,
                battleHours,
                Date.now(),
                profiles,
                true,
                true
              )
            }
          />
        ) : (
          <>
            {/* SLIM SINGLE-LINE 4-TAB STUDIO SWITCHER */}
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-[#220416]/95 p-1 rounded-2xl border border-[#FFE600]/65 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioTab("patakha-card");
                    setMobileBottomTab("card");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all ${
                    activeStudioTab === "patakha-card"
                      ? "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] shadow"
                      : "text-amber-100 hover:bg-white/10"
                  }`}
                >
                  <span>🧨 Cracker Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStudioTab("snap-frame");
                    setMobileBottomTab("card");
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl font-black text-xs whitespace-nowrap transition-all ${
                    activeStudioTab === "snap-frame"
                      ? "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] shadow"
                      : "text-amber-100 hover:bg-white/10"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Photo / Rangoli Frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fA =
                      effectiveMyHandle ||
                      featuredProfile?.handle ||
                      profiles[0]?.handle ||
                      "pragmaticengineer";
                    const fB =
                      profiles.find(
                        (p) => p.handle.toLowerCase() !== fA.toLowerCase()
                      )?.handle || "aarav";
                    startHeadToHeadBattle(
                      fA,
                      fB,
                      battleHours,
                      Date.now(),
                      profiles,
                      false,
                      false
                    );
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl font-black text-xs whitespace-nowrap text-amber-100 hover:bg-[#FFE600] hover:text-[#380828] transition-all"
                >
                  <Swords className="w-3.5 h-3.5 shrink-0 text-[#FFE600]" />
                  <span>1v1 Battle</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    categoriesSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl font-black text-xs whitespace-nowrap text-amber-100 hover:bg-white/10 transition-all"
                >
                  <Compass className="w-3.5 h-3.5 shrink-0 text-[#FFE600]" />
                  <span>Browse Clans</span>
                </button>
              </div>
            </div>

            {activeStudioTab === "patakha-card" ? (
              <section className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start pt-0.5">
                {/* Left Input Form Column */}
                <div className="lg:col-span-6 bg-[#240417]/95 border border-[#FFE600]/75 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE600] text-[#380828] text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow">
                      <Sparkles className="w-3 h-3 fill-current" />
                      Diwali Cracker Card Studio
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveStudioTab("snap-frame")}
                      className="text-xs font-extrabold text-[#FFE600] hover:underline inline-flex items-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Photo / Rangoli →</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      Get Your{" "}
                      <span className="text-[#FFE600]">Cracker Card</span> &amp;
                      Shareable Voting Link
                    </h2>
                    <p className="text-xs sm:text-sm text-amber-100/85 leading-relaxed">
                      Enter your username or paste your profile URL. Download
                      your card unlimited times, browse other users&apos;{" "}
                      <strong className="text-[#FFE600]">Patakha Clans</strong>,
                      or tag a friend in a{" "}
                      <strong className="text-[#FFE600]">
                        custom-hour 1v1 Battle
                      </strong>
                      !
                    </p>
                  </div>

                  <form onSubmit={handleAnalyzeSubmit} className="space-y-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#FFE600] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={urlOrHandle}
                        onChange={(e) => setUrlOrHandle(e.target.value)}
                        placeholder="Type @username or paste profile URL..."
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#14020C] border border-[#FFE600]/55 text-white placeholder:text-amber-200/45 font-bold text-sm focus:outline-none focus:border-[#FFE600]"
                      />
                    </div>

                    {existingUserMatch && (
                      <div className="bg-emerald-950/90 border border-emerald-400/60 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-200 font-bold truncate">
                            Found <strong>@{existingUserMatch.handle}</strong>:{" "}
                            {existingUserMatch.patakhaEmoji}{" "}
                            {existingUserMatch.patakhaName} (Rank #
                            {existingUserMatch.clanRank})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black shrink-0">
                          🔥 {existingUserMatch.votes}
                        </span>
                      </div>
                    )}

                    {errorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400 text-red-200 text-xs font-bold">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAnalyzing}
                      className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-sm sm:text-base border border-[#4A1238] shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 fill-[#380828]" />
                      <span>
                        {isAnalyzing
                          ? "Igniting Your Cracker Card..."
                          : existingUserMatch
                          ? `Load @${existingUserMatch.handle}'s Registered Card`
                          : "Generate My Cracker Card"}
                      </span>
                    </button>
                  </form>

                  {/* Quick Sample User Chips */}
                  <div className="pt-0.5 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/75">
                      Or test with a popular creator:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SAMPLE_USERS.map((sample) => (
                        <button
                          key={sample}
                          type="button"
                          onClick={() => {
                            setUrlOrHandle(sample);
                            submitUsernameOrUrl(sample);
                          }}
                          className="text-xs px-2.5 py-1 rounded-xl bg-[#16020F] hover:bg-[#FFE600] text-amber-100 hover:text-[#380828] border border-[#FFE600]/40 font-extrabold transition"
                        >
                          @{sample}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upvote 3 Others = +1 Self Bonus Progress Box */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="bg-[#16020F]/90 border border-[#FFE600]/40 rounded-2xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-black text-[#FFE600]">
                        <span className="inline-flex items-center gap-1.5">
                          <Gift className="w-3.5 h-3.5 text-emerald-400" />
                          <span>3 Votes to Others = +1 Bonus Vote for You</span>
                        </span>
                        <span className="text-emerald-300">
                          {progressInCycle}/3 Upvotes
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-100/85 leading-relaxed">
                        Upvote <strong>{votesNeededForNextBonus} more</strong>{" "}
                        {votesNeededForNextBonus === 1 ? "user" : "users"} on
                        the Leaderboard below to automatically add{" "}
                        <strong className="text-[#FFE600]">
                          +1 Bonus Vote
                        </strong>{" "}
                        to{" "}
                        {effectiveMyHandle ? (
                          <strong className="text-emerald-300">
                            @{effectiveMyHandle}
                          </strong>
                        ) : (
                          "your card"
                        )}
                        !
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Output Cracker Card Column with Slim Top Status Pill */}
                <div
                  ref={cardSectionRef}
                  className="lg:col-span-6 flex flex-col items-center space-y-2"
                >
                  {featuredProfile && (
                    <div className="w-full max-w-[420px] bg-emerald-950/90 border border-emerald-400/50 rounded-full px-3.5 py-1 flex items-center justify-between gap-2 text-xs text-emerald-200 font-bold shadow">
                      <span className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {lastLoadedWasExisting
                            ? `Loaded @${featuredProfile.handle}`
                            : `Active Card for @${featuredProfile.handle}`}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const rival =
                              profiles.find(
                                (p) =>
                                  p.handle.toLowerCase() !==
                                  featuredProfile.handle.toLowerCase()
                              )?.handle || "aarav";
                            startHeadToHeadBattle(
                              featuredProfile.handle,
                              rival,
                              battleHours,
                              Date.now(),
                              profiles,
                              true,
                              false
                            );
                          }}
                          className="text-[#FFE600] hover:underline font-black"
                        >
                          1v1 Battle
                        </button>
                        <span className="text-emerald-400/60">•</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleInspectProfileFromLeaderboard(featuredProfile)
                          }
                          className="text-emerald-300 hover:underline font-black"
                        >
                          Voter Page →
                        </button>
                      </div>
                    </div>
                  )}

                  {featuredProfile ? (
                    <PatakhaMemeCard
                      profile={featuredProfile}
                      onVote={handleVote}
                      hasVoted={votedHandles.has(
                        featuredProfile.handle.toLowerCase()
                      )}
                      isVoting={votingHandle === featuredProfile.handle}
                    />
                  ) : (
                    <div className="w-full max-w-[420px] h-96 rounded-3xl bg-black/40 border-2 border-dashed border-[#FFE600]/40 flex items-center justify-center text-amber-200/70 font-bold text-sm p-6 text-center">
                      Enter your username to reveal your Diwali Cracker Card!
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <DiwaliSnapFrameStudio
                clans={clans}
                allProfiles={profiles}
                activeProfile={featuredProfile}
                onProfileSynced={(profile, snapshot) => {
                  if (profile?.handle) {
                    setMyHandle(profile.handle);
                    saveStoredMyHandle(profile.handle);
                  }
                  applyArenaSnapshot(profile, snapshot, true);
                }}
                onVote={handleVote}
                hasVoted={
                  featuredProfile
                    ? votedHandles.has(featuredProfile.handle.toLowerCase())
                    : false
                }
                isVoting={
                  featuredProfile
                    ? votingHandle === featuredProfile.handle
                    : false
                }
              />
            )}
          </>
        )}

        {/* Patakha Clan Matrix + Interactive Clan Member Roster */}
        <div
          ref={categoriesSectionRef}
          className="bg-[#28061C]/90 border-2 border-[#FFE600]/65 rounded-3xl p-3.5 sm:p-7 shadow-2xl backdrop-blur-md"
        >
          <ClanWarsMatrix
            clans={clans}
            profiles={profiles}
            selectedPatakha={selectedPatakha}
            onSelectPatakha={(id) => {
              setSelectedPatakha(id);
            }}
            onInspectProfile={handleInspectProfileFromLeaderboard}
            onStartBattleWithProfile={handleStartBattleWithProfile}
            onVote={handleVote}
            votedHandles={votedHandles}
            votingHandle={votingHandle}
          />
        </div>

        {/* LIVE 1v1 BATTLES SECTION (Placed right above the Leaderboard where users see all ranks!) */}
        <MyActiveBattlesPanel
          currentHandle={effectiveMyHandle}
          activeBattles={activeBattles}
          allProfiles={profiles}
          activeBattlePair={battleHandles}
          isBattleMode={isBattleMode}
          onSelectBattle={(handleA, handleB, hrs, sMs) =>
            startHeadToHeadBattle(
              handleA,
              handleB,
              hrs,
              sMs,
              profiles,
              true,
              false
            )
          }
          onVote={handleVote}
          votedHandles={votedHandles}
          votingHandle={votingHandle}
          onStartNewBattleWithRival={(me, rival) =>
            startHeadToHeadBattle(
              me,
              rival,
              battleHours,
              Date.now(),
              profiles,
              true,
              true
            )
          }
        />

        {/* Live Community Leaderboard */}
        <div ref={leaderboardSectionRef}>
          <ArenaLeaderboard
            profiles={profiles}
            clans={clans}
            selectedPatakha={selectedPatakha}
            onSelectPatakha={setSelectedPatakha}
            onVote={handleVote}
            onInspectProfile={handleInspectProfileFromLeaderboard}
            onStartBattleWithProfile={handleStartBattleWithProfile}
            onJoinActiveBattle={(a, b, hrs) =>
              startHeadToHeadBattle(
                a,
                b,
                hrs || 12,
                undefined,
                profiles,
                true,
                false
              )
            }
            votingHandle={votingHandle}
            votedHandles={votedHandles}
            myHandle={effectiveMyHandle}
            othersVotedCount={othersVotedCount}
          />
        </div>

        {/* 1-Week Grand Finale & Hourly Vote Rule Banner */}
        <div className="bg-gradient-to-r from-[#3D0A2B]/95 via-[#26041A]/95 to-[#3D0A2B]/95 border-2 border-[#FFE600]/65 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE600] text-[#380828] flex items-center justify-center shrink-0 shadow">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-xs sm:text-sm">
              <div className="font-black text-[#FFE600] uppercase tracking-wider">
                🏆 Grand Leaderboard Finale in 1 Week + Hourly Auto-Vote Boost
              </div>
              <p className="text-amber-100/90 font-semibold mt-0.5">
                Every registered profile automatically earns{" "}
                <strong className="text-[#FFE600]">+1 vote every hour</strong>,
                every{" "}
                <strong className="text-[#FFE600]">
                  3 upvotes you cast for others
                </strong>{" "}
                gives you{" "}
                <strong className="text-emerald-300">+1 Bonus Vote</strong>, and
                the Overall #1 Diwali Patakha Champion will be announced in{" "}
                <strong className="text-[#FFE600]">1 Week</strong>!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUserGuideModal(true)}
            className="shrink-0 px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs inline-flex items-center gap-1.5 shadow transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Read Full Rules</span>
          </button>
        </div>

        {/* Footer with User Manual Button, GitHub Repo & Developer Audit Link */}
        <footer className="bg-[#1C0313]/95 border-2 border-[#FFE600]/45 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="text-lg">🧨</span>
            <div>
              <div className="font-black text-white text-sm">
                Rate My Patakha — Diwali Cracker Card, Frame Studio & 1v1
                Battles
              </div>
              <div className="text-amber-200/75 font-semibold">
                Real-time Leaderboard • 1–48 Hour 1v1 Rivalry Battles •
                Handcrafted Festive Frames
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowUserGuideModal(true)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#FFE600]/40 text-[#FFE600] font-black inline-flex items-center gap-1.5 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>User Guide</span>
            </button>

            <a
              href="/audit"
              className="px-3 py-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/50 text-emerald-300 font-black inline-flex items-center gap-1.5 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>System Audit (/audit)</span>
            </a>

            <a
              href="https://github.com/SavantCode/rateMyPatakha"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black inline-flex items-center gap-1.5 shadow transition"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </footer>
      </div>

      {/* INSTAGRAM-STYLE FIXED BOTTOM MOBILE NAVIGATION BAR (Only on Phones: Card, Battle, Ranks, Guide) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#1B0211]/95 backdrop-blur-lg border-t-2 border-[#FFE600]/75 px-2 py-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.85)]"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {/* 1. CARD TAB */}
          <button
            type="button"
            onClick={() => {
              setShowUserGuideModal(false);
              setIsBattleMode(false);
              setIsPublicVoteMode(false);
              setMobileBottomTab("card");
              topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition active:scale-95 ${
              mobileBottomTab === "card" &&
              !isBattleMode &&
              !showUserGuideModal
                ? "bg-[#FFE600] text-[#380828] font-black shadow"
                : "text-amber-100/85 hover:text-[#FFE600] font-extrabold"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] leading-tight mt-0.5">Card</span>
          </button>

          {/* 2. BATTLE TAB */}
          <button
            type="button"
            onClick={() => {
              setShowUserGuideModal(false);
              setMobileBottomTab("battle");
              const fA =
                effectiveMyHandle ||
                featuredProfile?.handle ||
                profiles[0]?.handle ||
                "pragmaticengineer";
              const fB =
                profiles.find(
                  (p) => p.handle.toLowerCase() !== fA.toLowerCase()
                )?.handle || "aarav";
              startHeadToHeadBattle(
                fA,
                fB,
                battleHours,
                Date.now(),
                profiles,
                true,
                false
              );
            }}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition active:scale-95 ${
              (mobileBottomTab === "battle" || isBattleMode) &&
              !showUserGuideModal
                ? "bg-[#FFE600] text-[#380828] font-black shadow"
                : "text-amber-100/85 hover:text-[#FFE600] font-extrabold"
            }`}
          >
            <Swords className="w-4 h-4" />
            <span className="text-[10px] leading-tight mt-0.5">Battle</span>
            {myActiveBattlesCount > 0 && (
              <span className="absolute top-1 right-3 px-1 min-w-[14px] h-[14px] rounded-full bg-rose-600 border border-[#FFE600] text-white text-[9px] font-black flex items-center justify-center leading-none">
                {myActiveBattlesCount}
              </span>
            )}
          </button>

          {/* 3. RANKS TAB */}
          <button
            type="button"
            onClick={() => {
              setShowUserGuideModal(false);
              setMobileBottomTab("ranks");
              leaderboardSectionRef.current?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition active:scale-95 ${
              mobileBottomTab === "ranks" && !showUserGuideModal
                ? "bg-[#FFE600] text-[#380828] font-black shadow"
                : "text-amber-100/85 hover:text-[#FFE600] font-extrabold"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] leading-tight mt-0.5">Ranks</span>
          </button>

          {/* 4. GUIDE TAB */}
          <button
            type="button"
            onClick={() => {
              setMobileBottomTab("guide");
              setShowUserGuideModal((prev) => !prev);
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition active:scale-95 ${
              showUserGuideModal
                ? "bg-[#FFE600] text-[#380828] font-black shadow"
                : "text-amber-100/85 hover:text-[#FFE600] font-extrabold"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px] leading-tight mt-0.5">Guide</span>
          </button>
        </div>
      </nav>
    </div>
  );
}