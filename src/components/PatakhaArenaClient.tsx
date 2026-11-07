"use client";

import React, { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";
import FireworkBackground from "@/components/FireworkBackground";
import DiwaliDecorationLights from "@/components/DiwaliDecorationLights";
import PatakhaMemeCard from "@/components/PatakhaMemeCard";
import DiwaliSnapFrameStudio from "@/components/DiwaliSnapFrameStudio";
import PublicVoteSpotlight from "@/components/PublicVoteSpotlight";
import HeadToHeadBattle from "@/components/HeadToHeadBattle";
import ClanWarsMatrix from "@/components/ClanWarsMatrix";
import ArenaLeaderboard from "@/components/ArenaLeaderboard";
import { PatakhaId } from "@/lib/patakhas";
import {
  ArenaSnapshot,
  PatakhaClanSummary,
  RankedArenaProfile,
  RecentArenaEvent,
} from "@/lib/store";
import {
  Flame,
  Search,
  Trophy,
  Users,
  Zap,
  Sparkles,
  Camera,
  Eye,
  CheckCircle2,
  PlusCircle,
  Activity,
  Swords,
  HelpCircle,
  X,
  ShieldCheck,
  Mail,
  Code2,
  AtSign,
  Clock,
  BookOpen,
  Compass,
  Download,
} from "lucide-react";

const QUICK_SAMPLE_USERS = [
  "pragmaticengineer",
  "aarav",
  "rohan",
  "priya",
  "kabir",
  "ananya",
];

type GuideTabId = "quickstart" | "battle-tagging" | "frames" | "perks";

function getOrCreateClientVisitorId(): string {
  if (typeof window === "undefined") return "";
  const key = "patakha_visitor_id_v1";
  let existing = window.localStorage.getItem(key);
  if (!existing) {
    existing = `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(key, existing);
  }
  return existing;
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

  const [battleHandles, setBattleHandles] = useState<[string, string]>([
    "pragmaticengineer",
    "aarav",
  ]);
  const [battleDays, setBattleDays] = useState<number>(3);
  const [battleStartMs, setBattleStartMs] = useState<number>(() => Date.now());

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

  const [featuredProfile, setFeaturedProfile] =
    useState<RankedArenaProfile | null>(null);
  const [profiles, setProfiles] = useState<RankedArenaProfile[]>([]);
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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
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

  const applyArenaSnapshot = (
    profile: RankedArenaProfile,
    snapshot: ArenaSnapshot,
    syncUrl = false
  ) => {
    setFeaturedProfile(profile);
    setProfiles(snapshot.profiles || []);
    setClans(snapshot.clans || []);
    setRecentEvents(snapshot.recentEvents || []);
    setTotalCreators(snapshot.totalCreators || 0);
    setTotalVotes(snapshot.totalVotes || 0);
    if (typeof snapshot.visitorCount === "number") {
      setVisitorCount(snapshot.visitorCount);
    }
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
    setUrlOrHandle("");
    setExistingUserMatch(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startHeadToHeadBattle = async (
    rawA: string,
    rawB: string,
    daysParam = battleDays,
    startMsParam?: number,
    currentProfilesList = profiles
  ) => {
    const cleanA = rawA
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9_-]/g, "");
    let cleanB = rawB
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9_-]/g, "");

    if (!cleanA) return;

    if (!cleanB || cleanA === cleanB) {
      cleanB =
        currentProfilesList.find((p) => p.handle.toLowerCase() !== cleanA)
          ?.handle || (cleanA === "aarav" ? "rohan" : "aarav");
    }

    const clampedDays = Math.min(90, Math.max(1, Number(daysParam) || 3));
    const resolvedStartMs =
      startMsParam && !Number.isNaN(startMsParam) ? startMsParam : Date.now();

    let latestProfiles = currentProfilesList;

    for (const h of [cleanA, cleanB]) {
      const exists = latestProfiles.some((p) => p.handle.toLowerCase() === h);
      if (!exists) {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: h }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.snapshot?.profiles) {
            latestProfiles = data.snapshot.profiles;
            setProfiles(data.snapshot.profiles);
            setClans(data.snapshot.clans || []);
            setRecentEvents(data.snapshot.recentEvents || []);
            setTotalCreators(data.snapshot.totalCreators || 0);
            setTotalVotes(data.snapshot.totalVotes || 0);
          }
        }
      }
    }

    setBattleHandles([cleanA, cleanB]);
    setBattleDays(clampedDays);
    setBattleStartMs(resolvedStartMs);
    setIsPublicVoteMode(false);
    setIsBattleMode(true);

    if (typeof window !== "undefined") {
      const vsUrl = `${window.location.pathname}?vs=${encodeURIComponent(
        cleanA
      )},${encodeURIComponent(
        cleanB
      )}&days=${clampedDays}&start=${resolvedStartMs}`;
      window.history.replaceState({}, "", vsUrl);
    }
    topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    setVotedHandles(getStoredVotedHandles());
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
        const daysQuery = parseInt(params.get("days") || "3", 10);
        const startQuery = parseInt(params.get("start") || "", 10);
        const sharedUser = (
          params.get("u") ||
          params.get("vote") ||
          ""
        ).trim();

        const res = await fetch("/api/leaderboard");
        if (!res.ok) return;
        const snapshot: ArenaSnapshot = await res.json();

        setProfiles(snapshot.profiles || []);
        setClans(snapshot.clans || []);
        setRecentEvents(snapshot.recentEvents || []);
        setTotalCreators(snapshot.totalCreators || 0);
        setTotalVotes(snapshot.totalVotes || 0);
        if (typeof snapshot.visitorCount === "number") {
          setVisitorCount(snapshot.visitorCount);
        }

        if (vsParam && vsParam.includes(",")) {
          const [rawA, rawB] = vsParam.split(",");
          if (rawA) {
            await startHeadToHeadBattle(
              rawA,
              rawB || "",
              Number.isNaN(daysQuery) ? 3 : daysQuery,
              Number.isNaN(startQuery) ? Date.now() : startQuery,
              snapshot.profiles || []
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
            const existingInLeaderboard = (snapshot.profiles || []).find(
              (p) => p.handle.toLowerCase() === cleanTarget
            );

            if (existingInLeaderboard) {
              setFeaturedProfile(existingInLeaderboard);
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

        if (snapshot.profiles?.length > 0) {
          setFeaturedProfile(snapshot.profiles[0]);
        }
      } catch (e) {
        console.error("Failed to load arena:", e);
      }
    }
    initArena();
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

      if (data.creatorToken && data.profile?.handle) {
        saveCreatorToken(data.profile.handle, data.creatorToken);
      }

      setLastLoadedWasExisting(Boolean(data.alreadyExists));
      applyArenaSnapshot(data.profile, data.snapshot, false);

      if (data.alreadyExists) {
        showToast(
          `Loaded @${data.profile.handle}'s registered ${data.profile.patakhaName} card (Rank #${data.profile.clanRank})! 🎯`
        );
      } else {
        showToast(
          `Created new ${data.profile.patakhaName} card for @${data.profile.handle}! 🧨`
        );
        triggerDiwaliConfetti();
      }

      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setTimeout(() => {
          cardSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 120);
      }
    } catch {
      setErrorMsg("Network error. Please try again!");
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
    if (votedHandles.has(cleanKey)) {
      showToast(`You already upvoted @${handle}! 🔥`);
      return;
    }

    setVotingHandle(handle);

    const prevProfiles = profiles;
    const prevFeatured = featuredProfile;
    const prevTotalVotes = totalVotes;

    const nextSet = new Set(votedHandles);
    nextSet.add(cleanKey);
    setVotedHandles(nextSet);
    saveStoredVotedHandles(nextSet);

    setTotalVotes((v) => v + 1);
    setProfiles((curr) =>
      curr.map((p) =>
        p.handle.toLowerCase() === cleanKey ? { ...p, votes: p.votes + 1 } : p
      )
    );
    if (featuredProfile && featuredProfile.handle.toLowerCase() === cleanKey) {
      setFeaturedProfile({
        ...featuredProfile,
        votes: featuredProfile.votes + 1,
      });
    }
    triggerDiwaliConfetti();

    try {
      const voterId = getOrCreateClientVisitorId();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, voterId }),
      });

      if (!res.ok) {
        setProfiles(prevProfiles);
        setFeaturedProfile(prevFeatured);
        setTotalVotes(prevTotalVotes);
        return;
      }

      const data = await res.json();
      setProfiles(data.snapshot.profiles);
      setClans(data.snapshot.clans);
      setRecentEvents(data.snapshot.recentEvents || []);
      setTotalCreators(data.snapshot.totalCreators);
      setTotalVotes(data.snapshot.totalVotes);

      if (
        featuredProfile &&
        featuredProfile.handle.toLowerCase() === cleanKey &&
        data.profile
      ) {
        setFeaturedProfile(data.profile);
      }

      if (data.alreadyVoted) {
        showToast(`Your upvote for @${handle} is already counted!`);
      } else {
        showToast(`Upvote added for @${handle}! 🧨`);
      }
    } catch {
      setProfiles(prevProfiles);
      setFeaturedProfile(prevFeatured);
      setTotalVotes(prevTotalVotes);
    } finally {
      setVotingHandle(null);
    }
  };

  const fighterAProfile =
    profiles.find(
      (p) => p.handle.toLowerCase() === battleHandles[0].toLowerCase()
    ) ||
    profiles[0] ||
    featuredProfile;

  const fighterBProfile =
    profiles.find(
      (p) => p.handle.toLowerCase() === battleHandles[1].toLowerCase()
    ) ||
    profiles.find((p) => p.handle !== fighterAProfile?.handle) ||
    profiles[0] ||
    featuredProfile;

  return (
    <div className="relative min-h-screen pb-24 sm:pb-16 overflow-x-hidden flex flex-col justify-between">
      {/* Full-Screen Diwali Illustration Backdrop */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/api/bg-image')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#2B071E]/75 via-[#2B071E]/50 to-[#16020F]/90" />

      <FireworkBackground />
      <DiwaliDecorationLights />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#FFE600] text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-2xl max-w-[92vw] text-center">
          {toastMsg}
        </div>
      )}

      {/* Upgraded Multi-Tab Interactive User Manual Modal */}
      {showUserGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6">
          <div className="bg-[#240418] border-2 border-[#FFE600] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#FFE600]/25">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFE600] to-[#FF7B00] text-[#380828] flex items-center justify-center shadow">
                  <BookOpen className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-2xl font-black text-white">
                    Rate My Patakha — Official User Manual
                  </h2>
                  <p className="text-[11px] sm:text-xs text-amber-200/80 font-semibold">
                    Create cards, frame your Photo/Rangoli, browse clans & tag
                    friends in 1v1 battles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserGuideModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-[#FFE600] text-amber-100 hover:text-[#380828] transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Interactive Guide Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#14020E] p-1.5 rounded-2xl border border-[#FFE600]/35">
              <button
                type="button"
                onClick={() => setActiveGuideTab("quickstart")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "quickstart"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>1. Quick Start</span>
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
                <Swords className="w-3.5 h-3.5 shrink-0" />
                <span>2. Tag & Battle</span>
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
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>3. Photo & Rangoli</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveGuideTab("perks")}
                className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  activeGuideTab === "perks"
                    ? "bg-[#FFE600] text-[#380828] shadow"
                    : "text-amber-200 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>4. Clans & Boost</span>
              </button>
            </div>

            {/* TAB 1: QUICK START */}
            {activeGuideTab === "quickstart" && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFE600] text-[#380828] font-black text-[10px]">
                      STEP 1
                    </span>
                    <div className="font-black text-white text-sm">
                      Enter Your @Username
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      Type your handle (e.g., <strong>@rohan</strong>) or paste
                      your profile link. Our database checks in real time if you
                      already have a registered card or creates a brand-new one!
                    </p>
                  </div>

                  <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFE600] text-[#380828] font-black text-[10px]">
                      STEP 2
                    </span>
                    <div className="font-black text-white text-sm">
                      Download Anytime (Unlimited)
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      Tap <strong>Download Poster</strong> as many times as you
                      want to export a crisp 1080×1350 HD PNG with your live
                      Clan Rank!
                    </p>
                  </div>

                  <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#FFE600] text-[#380828] font-black text-[10px]">
                      STEP 3
                    </span>
                    <div className="font-black text-white text-sm">
                      Share Your Voting Link
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      Send your <code>/?u=yourname</code> link to friends. They
                      land on a <strong>Read-Only Voting Spotlight</strong>{" "}
                      where they can upvote you in 1 tap!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HOW TO PLAY 1v1 BATTLE BY TAGGING FRIENDS */}
            {activeGuideTab === "battle-tagging" && (
              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="bg-gradient-to-r from-[#380828] to-[#240418] border-2 border-[#FFE600]/60 rounded-2xl p-4 space-y-2">
                  <div className="font-black text-[#FFE600] text-sm sm:text-base flex items-center gap-1.5">
                    <AtSign className="w-4 h-4 text-emerald-400" />
                    How to Play a 1v1 Rivalry Battle by Tagging Friends
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-amber-100/90 leading-relaxed">
                    <li>
                      Open the <strong>⚔️ 1v1 Battle</strong> tab (or click the{" "}
                      <strong>⚔️ 1v1</strong> button next to anyone in the Clan
                      Browser or Leaderboard).
                    </li>
                    <li>
                      Click <strong>Customize Battle & Days</strong>, enter your{" "}
                      <strong>@username</strong> vs your friend&apos;s{" "}
                      <strong>@username</strong>, and set your{" "}
                      <strong>Custom Number of Days (1 to 90 Days)</strong>!
                    </li>
                    <li>
                      Click <strong>Download 1v1 VS Poster PNG</strong> to save
                      the side-by-side matchup poster, then click{" "}
                      <strong>Copy @Tag Challenge Text</strong> (or{" "}
                      <strong>Tag on X / WhatsApp</strong>).
                    </li>
                    <li>
                      Post the poster on Instagram Stories, X/Twitter, Substack
                      Notes, or WhatsApp and{" "}
                      <strong className="text-[#FFE600]">
                        tag your rival (@friend)
                      </strong>{" "}
                      so both audiences can vote before the countdown timer ends!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* TAB 3: PHOTO, RANGOLI & WOODEN FRAMES (WITH PRIVACY/DOWNLOAD NOTE) */}
            {activeGuideTab === "frames" && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 space-y-1.5">
                    <div className="font-black text-[#FFE600]">
                      📸 Upload Your Photo, Rangoli or Diyas
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      In the <strong>Wooden Frames</strong> tab, you can upload{" "}
                      <strong>
                        your portrait, your Rangoli design, glowing Diyas, or
                        any festive photograph
                      </strong>{" "}
                      into our Engraved Oak Wood, Crimson Palace Arch, or
                      Marigold Ring frames!
                    </p>
                  </div>

                  <div className="bg-amber-950/85 border-2 border-[#FFE600] rounded-2xl p-4 space-y-1.5">
                    <div className="font-black text-[#FFE600] flex items-center gap-1.5">
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Please Download First Before Sharing Link!</span>
                    </div>
                    <p className="text-amber-100/95 leading-relaxed">
                      For your privacy,{" "}
                      <strong>
                        your uploaded photo/Rangoli is NOT stored on our servers
                        and will NOT be shown when someone opens your shareable
                        voting link
                      </strong>
                      . Always click <strong>Download Poster</strong> first (you
                      can download unlimited times anytime!) and share that
                      downloaded image alongside your voting link!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BROWSE CLANS, HOURLY AUTO-BOOST & FAIR PLAY */}
            {activeGuideTab === "perks" && (
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 flex items-start gap-3">
                  <Compass className="w-5 h-5 text-[#FFE600] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-[#FFE600]">
                      🧭 Browse Other Users&apos; Clans & Rosters
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      Scroll to <strong>Explore Patakha Clans</strong> and tap
                      any Clan card to inspect its live member roster, see who
                      holds Rank #1 in that clan, view their card, or challenge
                      them to a 1v1 Battle!
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-950/75 border border-emerald-400/50 rounded-2xl p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-emerald-300">
                      ⚡ Hourly Community Momentum Boost (Never Stuck!)
                    </div>
                    <p className="text-emerald-100/90 leading-relaxed">
                      If any registered user goes more than{" "}
                      <strong>1 hour</strong> without receiving a new upvote,
                      our Arena Momentum Engine automatically boosts their card
                      by <strong>+1 upvote per idle hour</strong> so every
                      creator feels continuous engagement!
                    </p>
                  </div>
                </div>

                <div className="bg-[#15020E] border border-[#FFE600]/40 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#FFE600] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-black text-[#FFE600]">
                      🔒 Locked Cards & Anti-Spam Voting
                    </div>
                    <p className="text-amber-100/85 leading-relaxed">
                      Once a username creates a Patakha Card, their clan is
                      locked in MongoDB so visitors cannot overwrite it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <a
                href="mailto:rahulkcoding2023@gmail.com"
                className="text-xs font-bold text-amber-200 hover:text-[#FFE600] inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>Feedback / Collab: rahulkcoding2023@gmail.com</span>
              </a>

              <button
                type="button"
                onClick={() => setShowUserGuideModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm shadow"
              >
                Got It, Let&apos;s Play! 🧨
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* Header Bar with Live Visitor Counter */}
        <header
          ref={topStudioRef}
          className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-16 sm:pt-24 pb-2"
        >
          <div className="bg-[#28061C]/92 border-2 border-[#FFE600]/65 rounded-2xl sm:rounded-3xl px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
            <div
              onClick={
                isPublicVoteMode || isBattleMode
                  ? exitSpecialModesToStudio
                  : undefined
              }
              className={`flex items-center gap-2.5 min-w-0 ${
                isPublicVoteMode || isBattleMode ? "cursor-pointer" : ""
              }`}
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FFE600] via-[#FF9F1C] to-[#EF233C] flex items-center justify-center text-lg sm:text-2xl shadow border-2 border-[#4A1238] shrink-0">
                🧨
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-2xl font-black text-white leading-tight truncate">
                  Rate My <span className="gold-shimmer">Patakha</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-amber-200 font-semibold truncate">
                  {isBattleMode && fighterAProfile && fighterBProfile
                    ? `⚔️ ${battleDays}d Battle: @${fighterAProfile.handle} vs @${fighterBProfile.handle}`
                    : isPublicVoteMode && featuredProfile
                    ? `Official Voting Page for @${featuredProfile.handle}`
                    : `${clans.length} Cracker Clans • Photo/Rangoli Frames • 1v1 Battles`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold shrink-0">
              <div
                className="px-2.5 py-1.5 rounded-xl bg-[#16020F]/90 border border-emerald-400/45 flex items-center gap-1 text-emerald-300"
                title="Total Website Visitors"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{visitorCount.toLocaleString()}</span>
                <span className="hidden md:inline">Visitors</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-[#16020F]/90 border border-[#FFE600]/40 flex items-center gap-1 text-amber-200">
                <Users className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>{totalCreators}</span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-[#16020F]/90 border border-orange-400/40 flex items-center gap-1 text-orange-200">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>{totalVotes}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  categoriesSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className="hidden md:inline-flex px-2.5 py-1.5 rounded-xl bg-[#16020F]/90 hover:bg-white/15 border border-[#FFE600]/45 text-amber-100 items-center gap-1 transition"
                title="Browse All Patakha Clans & Members"
              >
                <Compass className="w-3.5 h-3.5 text-[#FFE600]" />
                <span>Browse Clans</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUserGuideModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-[#16020F]/90 hover:bg-[#FFE600] border border-[#FFE600]/55 text-[#FFE600] hover:text-[#380828] font-black inline-flex items-center gap-1 transition"
                title="Open User Manual & Battle Tagging Guide"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Manual</span>
              </button>

              {isPublicVoteMode || isBattleMode ? (
                <button
                  type="button"
                  onClick={exitSpecialModesToStudio}
                  className="inline-flex px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black border-2 border-[#4A1238] shadow transition items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Create Yours</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const a =
                      featuredProfile?.handle ||
                      profiles[0]?.handle ||
                      "pragmaticengineer";
                    const b =
                      profiles.find((p) => p.handle !== a)?.handle || "aarav";
                    startHeadToHeadBattle(a, b, battleDays);
                  }}
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black border-2 border-[#4A1238] shadow transition items-center gap-1.5"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>1v1 Battle</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Community Activity Ticker */}
          {recentEvents.length > 0 && (
            <div className="mt-2 bg-[#1B0312]/90 border border-[#FFE600]/35 rounded-xl px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px]">
              <span className="inline-flex items-center gap-1 font-black uppercase text-[#FFE600] shrink-0">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Live Arena:
              </span>
              <div className="flex items-center gap-3 shrink-0">
                {recentEvents.slice(0, 6).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      const found = profiles.find(
                        (p) =>
                          p.handle.toLowerCase() === ev.handle.toLowerCase()
                      );
                      if (found) {
                        setFeaturedProfile(found);
                        setIsBattleMode(false);
                        setIsPublicVoteMode(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-amber-100 hover:text-[#FFE600] transition shrink-0"
                  >
                    <span>{ev.type === "vote" ? "🔥" : "🧨"}</span>
                    <strong className="text-white">@{ev.handle}</strong>
                    <span className="text-amber-200/75">
                      {ev.type === "vote"
                        ? `upvoted (${ev.votes})`
                        : `joined ${ev.patakhaName}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Main Content Container */}
        <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-2 sm:pt-3 space-y-6 sm:space-y-10">
          {isBattleMode && fighterAProfile && fighterBProfile ? (
            <HeadToHeadBattle
              fighterA={fighterAProfile}
              fighterB={fighterBProfile}
              allProfiles={profiles}
              battleDays={battleDays}
              battleStartMs={battleStartMs}
              onVote={handleVote}
              votedHandles={votedHandles}
              votingHandle={votingHandle}
              onChangeMatchup={(a, b, customDays) =>
                startHeadToHeadBattle(
                  a,
                  b,
                  customDays ?? battleDays,
                  Date.now()
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
              onScrollToLeaderboard={() =>
                leaderboardSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
              onStartRivalryBattle={(a, b) =>
                startHeadToHeadBattle(a, b, battleDays, Date.now())
              }
            />
          ) : (
            <>
              {/* 4-Action Mode Switcher (Cracker Card, Photo/Rangoli Frames, 1v1 Battle, Browse Clans) */}
              <div className="flex justify-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto bg-[#1D0414]/95 border-2 border-[#FFE600]/70 p-1 rounded-2xl shadow-xl backdrop-blur-md gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveStudioTab("patakha-card")}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
                      activeStudioTab === "patakha-card"
                        ? "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] shadow"
                        : "text-amber-100 hover:bg-white/10"
                    }`}
                  >
                    <span>🧨</span>
                    <span className="truncate">Cracker Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStudioTab("snap-frame")}
                    className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition ${
                      activeStudioTab === "snap-frame"
                        ? "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] shadow"
                        : "text-amber-100 hover:bg-white/10"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">Photo / Rangoli Frame</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const a =
                        featuredProfile?.handle ||
                        profiles[0]?.handle ||
                        "pragmaticengineer";
                      const b =
                        profiles.find((p) => p.handle !== a)?.handle || "aarav";
                      startHeadToHeadBattle(a, b, battleDays, Date.now());
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-amber-100 hover:bg-white/10 transition"
                  >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE600] shrink-0" />
                    <span className="truncate">1v1 Battle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      categoriesSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-amber-100 hover:bg-white/10 transition"
                  >
                    <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE600] shrink-0" />
                    <span className="truncate">Browse Clans</span>
                  </button>
                </div>
              </div>

              {activeStudioTab === "patakha-card" ? (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-center">
                  <div className="lg:col-span-6 bg-[#28061C]/92 border-2 border-[#FFE600]/75 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-md space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFE600] text-[#380828] text-[11px] font-black uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 fill-current" />
                        Diwali Cracker Card Studio
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveStudioTab("snap-frame")}
                        className="text-[11px] font-extrabold text-[#FFE600] underline flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" /> Upload Photo / Rangoli →
                      </button>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                      Get Your <span className="gold-shimmer">Cracker Card</span>{" "}
                      & Shareable Voting Link 🧨
                    </h2>

                    <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                      Enter your username or paste your profile URL. Download
                      your card unlimited times, browse other users&apos;{" "}
                      <strong className="text-[#FFE600]">Patakha Clans</strong>,
                      or tag a friend in a{" "}
                      <strong className="text-[#FFE600]">
                        custom-day 1v1 Battle
                      </strong>
                      !
                    </p>

                    <form onSubmit={handleAnalyzeSubmit} className="space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFE600] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={urlOrHandle}
                          onChange={(e) => setUrlOrHandle(e.target.value)}
                          placeholder="Type @username or paste profile URL..."
                          className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-2xl bg-[#14020E]/95 border-2 border-[#FFE600]/60 text-white placeholder:text-amber-200/45 font-bold focus:outline-none focus:border-[#FFE600] text-sm sm:text-base"
                        />
                      </div>

                      {existingUserMatch && (
                        <div className="bg-emerald-950/85 border border-emerald-400/50 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                          <span className="text-emerald-200 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              <strong>@{existingUserMatch.handle}</strong>{" "}
                              already made a card:{" "}
                              <strong className="text-[#FFE600]">
                                {existingUserMatch.patakhaEmoji}{" "}
                                {existingUserMatch.patakhaName}
                              </strong>{" "}
                              (Rank #{existingUserMatch.clanRank} of{" "}
                              {existingUserMatch.clanTotalCount})
                            </span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black shrink-0">
                            🔥 {existingUserMatch.votes}
                          </span>
                        </div>
                      )}

                      {errorMsg && (
                        <div className="text-xs font-bold text-rose-200 bg-rose-950/90 border border-rose-400/60 rounded-xl px-3 py-2">
                          ⚠️ {errorMsg}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isAnalyzing}
                        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] font-black text-sm sm:text-base border-2 border-[#4A1238] shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition"
                      >
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        {isAnalyzing
                          ? "Checking Database..."
                          : existingUserMatch
                          ? `Load @${existingUserMatch.handle}'s Registered Card (${existingUserMatch.patakhaName}) 🎯`
                          : "Generate My Cracker Card 🧨"}
                      </button>
                    </form>

                    <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-200/75 shrink-0">
                        Registered Users:
                      </span>
                      {QUICK_SAMPLE_USERS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            setUrlOrHandle(u);
                            submitUsernameOrUrl(u);
                          }}
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-[#16020F]/85 hover:bg-[#FFE600] text-amber-200 hover:text-[#380828] border border-[#FFE600]/35 text-xs font-extrabold transition"
                        >
                          @{u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Live Collectible Cracker Card Column */}
                  <div ref={cardSectionRef} className="lg:col-span-6 space-y-2">
                    {featuredProfile && (
                      <div className="max-w-[420px] mx-auto bg-emerald-950/90 border border-emerald-400/50 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-emerald-200 font-bold">
                        <span className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate">
                            {lastLoadedWasExisting
                              ? `Verified DB Card for @${featuredProfile.handle}`
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
                                battleDays,
                                Date.now()
                              );
                            }}
                            className="text-[#FFE600] underline font-black"
                          >
                            ⚔️ 1v1 Battle
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsBattleMode(false);
                              setIsPublicVoteMode(true);
                              if (typeof window !== "undefined") {
                                window.history.replaceState(
                                  {},
                                  "",
                                  `${window.location.pathname}?u=${encodeURIComponent(
                                    featuredProfile.handle
                                  )}`
                                );
                              }
                            }}
                            className="text-amber-200 underline font-black"
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
                      <div className="w-full max-w-md mx-auto aspect-square rounded-3xl bg-[#28061C]/80 border-2 border-dashed border-[#FFE600]/50 flex items-center justify-center p-8 text-center text-amber-200 font-bold">
                        Loading Cracker Card...
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <DiwaliSnapFrameStudio
                  clans={clans}
                  activeProfile={featuredProfile}
                  onProfileSynced={(profile, snapshot) => {
                    applyArenaSnapshot(profile, snapshot, false);
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

          {/* SECTION 2: BROWSE PATAKHA CLANS & MEMBER ROSTERS */}
          <div
            ref={categoriesSectionRef}
            className="bg-[#28061C]/92 border-2 border-[#FFE600]/65 rounded-3xl p-3.5 sm:p-6 shadow-2xl backdrop-blur-md"
          >
            <ClanWarsMatrix
              clans={clans}
              profiles={profiles}
              selectedPatakha={selectedPatakha}
              onSelectPatakha={(id) => {
                setSelectedPatakha(id);
              }}
              onVote={handleVote}
              votedHandles={votedHandles}
              votingHandle={votingHandle}
              onInspectProfile={(profile) => {
                setFeaturedProfile(profile);
                setIsBattleMode(false);
                setIsPublicVoteMode(true);
                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?u=${encodeURIComponent(
                      profile.handle
                    )}`
                  );
                }
                topStudioRef.current?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              onStartBattleWithProfile={(targetProfile) => {
                const myHandle =
                  featuredProfile &&
                  featuredProfile.handle.toLowerCase() !==
                    targetProfile.handle.toLowerCase()
                    ? featuredProfile.handle
                    : profiles.find(
                        (p) =>
                          p.handle.toLowerCase() !==
                          targetProfile.handle.toLowerCase()
                      )?.handle || "pragmaticengineer";
                startHeadToHeadBattle(
                  myHandle,
                  targetProfile.handle,
                  battleDays,
                  Date.now()
                );
              }}
            />
          </div>

          {/* SECTION 3: VOTING LEADERBOARD */}
          <div ref={leaderboardSectionRef}>
            <ArenaLeaderboard
              profiles={profiles}
              clans={clans}
              selectedPatakha={selectedPatakha}
              onSelectPatakha={setSelectedPatakha}
              onVote={handleVote}
              votedHandles={votedHandles}
              onStartBattleWithProfile={(targetProfile) => {
                const myHandle =
                  featuredProfile &&
                  featuredProfile.handle.toLowerCase() !==
                    targetProfile.handle.toLowerCase()
                    ? featuredProfile.handle
                    : profiles.find(
                        (p) =>
                          p.handle.toLowerCase() !==
                          targetProfile.handle.toLowerCase()
                      )?.handle || "pragmaticengineer";
                startHeadToHeadBattle(
                  myHandle,
                  targetProfile.handle,
                  battleDays,
                  Date.now()
                );
              }}
              onInspectProfile={(profile) => {
                setFeaturedProfile(profile);
                setIsBattleMode(false);
                setIsPublicVoteMode(true);
                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    {},
                    "",
                    `${window.location.pathname}?u=${encodeURIComponent(
                      profile.handle
                    )}`
                  );
                }
                topStudioRef.current?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              votingHandle={votingHandle}
            />
          </div>
        </main>
      </div>

      {/* DEVELOPER & LIVE TRAFFIC SOFTWARE ENGINEERING FOOTER */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-3 sm:px-6 mt-10 mb-6">
        <div className="bg-[#1C0313]/95 border-2 border-[#FFE600]/55 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE600]/15 border border-[#FFE600]/45 text-[#FFE600] text-[11px] font-black uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5" />
                Live Systems & Software Engineering Showcase
              </div>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium">
                I built{" "}
                <strong className="text-[#FFE600]">Rate My Patakha</strong> to
                welcome real users and test my software engineering,
                high-concurrency caching, and real-time database skills by
                handling live community traffic! Share your card, tag a friend
                in a 1v1 Battle, and help stress-test the arena! 🚀
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveGuideTab("frames");
                  setShowUserGuideModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#2A071D] hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border border-[#FFE600]/50 font-black text-xs inline-flex items-center justify-center gap-1.5 transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read User Manual</span>
              </button>

              <a
                href="mailto:rahulkcoding2023@gmail.com?subject=Rate%20My%20Patakha%20Feedback"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-lg inline-flex items-center justify-center gap-1.5 hover:brightness-110 transition"
              >
                <Mail className="w-4 h-4 stroke-[2.5]" />
                <span>rahulkcoding2023@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1B0312]/95 border-t-2 border-[#FFE600]/65 px-2 py-1.5 backdrop-blur-lg shadow-[0_-8px_25px_rgba(0,0,0,0.8)]">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setIsPublicVoteMode(false);
              setIsBattleMode(false);
              setActiveStudioTab("patakha-card");
              topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-black transition ${
              !isPublicVoteMode &&
              !isBattleMode &&
              activeStudioTab === "patakha-card"
                ? "bg-[#FFE600] text-[#380828]"
                : "text-amber-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="mt-0.5">Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPublicVoteMode(false);
              setIsBattleMode(false);
              setActiveStudioTab("snap-frame");
              topStudioRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-black transition ${
              !isPublicVoteMode &&
              !isBattleMode &&
              activeStudioTab === "snap-frame"
                ? "bg-[#FFE600] text-[#380828]"
                : "text-amber-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="mt-0.5">Frames</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const a =
                featuredProfile?.handle ||
                profiles[0]?.handle ||
                "pragmaticengineer";
              const b =
                profiles.find((p) => p.handle !== a)?.handle || "aarav";
              startHeadToHeadBattle(a, b, battleDays, Date.now());
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-black transition ${
              isBattleMode ? "bg-[#FFE600] text-[#380828]" : "text-amber-200"
            }`}
          >
            <Swords className="w-4 h-4 text-[#FFE600]" />
            <span className="mt-0.5">1v1 Battle</span>
          </button>

          <button
            type="button"
            onClick={() =>
              categoriesSectionRef.current?.scrollIntoView({
                behavior: "smooth",
              })
            }
            className="flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-black text-amber-200 active:bg-white/10"
          >
            <Compass className="w-4 h-4 text-[#FFE600]" />
            <span className="mt-0.5">Clans</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUserGuideModal(true)}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-black text-amber-200 active:bg-white/10"
          >
            <HelpCircle className="w-4 h-4 text-[#FFE600]" />
            <span className="mt-0.5">Manual</span>
          </button>
        </div>
      </nav>
    </div>
  );
}