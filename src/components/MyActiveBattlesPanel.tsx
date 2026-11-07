"use client";

import React, { useEffect, useState } from "react";
import { RankedArenaBattle, RankedArenaProfile } from "@/lib/store";
import {
  Swords,
  Clock,
  Crown,
  Flame,
  ArrowUpRight,
  PlusCircle,
  Trophy,
  Radio,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface Props {
  currentHandle: string;
  activeBattles: RankedArenaBattle[];
  allProfiles: RankedArenaProfile[];
  activeBattlePair: [string, string];
  isBattleMode: boolean;
  onSelectBattle: (
    handleA: string,
    handleB: string,
    hours: number,
    startMs: number
  ) => void;
  onVote: (handle: string) => Promise<void>;
  votedHandles: Set<string>;
  votingHandle: string | null;
  onStartNewBattleWithRival: (myHandle: string, rivalHandle: string) => void;
}

function formatLiveCountdown(endMs: number, nowMs: number): {
  expired: boolean;
  text: string;
  urgent: boolean;
} {
  const diff = Math.max(0, endMs - nowMs);
  if (diff <= 0) {
    return { expired: true, text: "Ended • Final Result", urgent: false };
  }
  const totalSec = Math.floor(diff / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    expired: false,
    text: `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`,
    urgent: hrs === 0 && mins < 30,
  };
}

export default function MyActiveBattlesPanel({
  currentHandle,
  activeBattles,
  allProfiles,
  activeBattlePair,
  isBattleMode,
  onSelectBattle,
  onVote,
  votedHandles,
  votingHandle,
  onStartNewBattleWithRival,
}: Props) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [tab, setTab] = useState<"my-battles" | "all-battles">("my-battles");

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cleanMe = currentHandle.trim().toLowerCase().replace(/^@+/, "");

  // Battles where the current user is Challenger A or Challenger B
  const myBattles = activeBattles.filter(
    (b) =>
      b.handleA.toLowerCase() === cleanMe ||
      b.handleB.toLowerCase() === cleanMe
  );

  // Summary metrics for current user
  let winningCount = 0;
  let trailingCount = 0;
  let tiedCount = 0;

  myBattles.forEach((b) => {
    const isMeA = b.handleA.toLowerCase() === cleanMe;
    const myFighter = isMeA ? b.fighterA : b.fighterB;
    const rivalFighter = isMeA ? b.fighterB : b.fighterA;
    if (myFighter.votes > rivalFighter.votes) winningCount++;
    else if (myFighter.votes < rivalFighter.votes) trailingCount++;
    else tiedCount++;
  });

  // Suggested new rival that the user isn't already battling
  const existingRivals = new Set(
    myBattles.map((b) =>
      b.handleA.toLowerCase() === cleanMe
        ? b.handleB.toLowerCase()
        : b.handleA.toLowerCase()
    )
  );
  const suggestedRival =
    allProfiles.find(
      (p) =>
        p.handle.toLowerCase() !== cleanMe &&
        !existingRivals.has(p.handle.toLowerCase())
    ) || allProfiles.find((p) => p.handle.toLowerCase() !== cleanMe);

  const displayedBattles =
    tab === "my-battles" && myBattles.length > 0 ? myBattles : activeBattles;

  if (activeBattles.length === 0 && !cleanMe) {
    return null;
  }

  return (
    <section className="bg-gradient-to-b from-[#29051C]/95 via-[#1E0314]/95 to-[#16020E]/95 border-2 border-[#FFE600]/80 rounded-3xl p-3.5 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.75)] backdrop-blur-md space-y-3.5">
      {/* Top Header & Summary KPI Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#FFE600]/25">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFE600] text-[#380828] text-[11px] font-black uppercase tracking-wider shadow">
              <Swords className="w-3.5 h-3.5" />
              Live 1v1 Battle Command Center
            </span>

            {cleanMe && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 text-[11px] font-black">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                @{cleanMe}: Playing {myBattles.length}{" "}
                {myBattles.length === 1 ? "Battle" : "Battles"}
              </span>
            )}

            {myBattles.length > 0 && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  🏆 {winningCount} Winning
                </span>
                {trailingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-300">
                    ⚡ {trailingCount} Trailing
                  </span>
                )}
                {tiedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200">
                    🤝 {tiedCount} Tied
                  </span>
                )}
              </div>
            )}
          </div>

          <h3 className="text-sm sm:text-lg font-black text-white">
            {cleanMe && myBattles.length > 0 ? (
              <>
                ⚔️ @{cleanMe} is in{" "}
                <span className="text-[#FFE600]">
                  {myBattles.length} Active 1v1{" "}
                  {myBattles.length === 1 ? "Battle" : "Battles"}
                </span>{" "}
                — Track Live Countdowns & Lead Margin Below
              </>
            ) : (
              <>
                🔥 {activeBattles.length} Live 1v1{" "}
                {activeBattles.length === 1 ? "Battle" : "Battles"} Happening
                Right Now Across the Arena
              </>
            )}
          </h3>
        </div>

        {/* Right Switcher Tabs + Start New Battle CTA */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-[#12010B] p-1 border border-[#FFE600]/35">
            <button
              type="button"
              onClick={() => setTab("my-battles")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                tab === "my-battles"
                  ? "bg-[#FFE600] text-[#380828] shadow"
                  : "text-amber-200 hover:text-white"
              }`}
            >
              My Battles ({myBattles.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("all-battles")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                tab === "all-battles"
                  ? "bg-[#FFE600] text-[#380828] shadow"
                  : "text-amber-200 hover:text-white"
              }`}
            >
              All Arena Battles ({activeBattles.length})
            </button>
          </div>

          {cleanMe && suggestedRival && (
            <button
              type="button"
              onClick={() =>
                onStartNewBattleWithRival(cleanMe, suggestedRival.handle)
              }
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-xs inline-flex items-center gap-1 shadow active:scale-95 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Battle @{suggestedRival.handle}</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty state if user clicked "My Battles" but has 0 battles */}
      {tab === "my-battles" && myBattles.length === 0 ? (
        <div className="bg-[#15020E] border border-[#FFE600]/35 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left space-y-0.5">
            <div className="text-xs sm:text-sm font-black text-[#FFE600] flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>
                @{cleanMe || "You"} aren&apos;t in an active 1v1 Battle yet!
              </span>
            </div>
            <p className="text-xs text-amber-100/80">
              Start a 1-to-48 hour 1v1 Battle against a friend or view all{" "}
              {activeBattles.length} live Arena battles happening now.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {suggestedRival && (
              <button
                type="button"
                onClick={() =>
                  onStartNewBattleWithRival(
                    cleanMe || "pragmaticengineer",
                    suggestedRival.handle
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-[#FFE600] text-[#380828] font-black text-xs inline-flex items-center gap-1.5 shadow"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Start 1v1 vs @{suggestedRival.handle}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab("all-battles")}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-100 font-bold text-xs"
            >
              See All ({activeBattles.length})
            </button>
          </div>
        </div>
      ) : (
        /* Responsive Grid of Live Battle Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedBattles.slice(0, 6).map((b) => {
            const isMeInvolved =
              b.handleA.toLowerCase() === cleanMe ||
              b.handleB.toLowerCase() === cleanMe;
            const isMeA = b.handleA.toLowerCase() === cleanMe;

            const primaryFighter = isMeInvolved
              ? isMeA
                ? b.fighterA
                : b.fighterB
              : b.fighterA;
            const rivalFighter = isMeInvolved
              ? isMeA
                ? b.fighterB
                : b.fighterA
              : b.fighterB;

            const myVotes = primaryFighter.votes;
            const rivalVotes = rivalFighter.votes;
            const diff = myVotes - rivalVotes;
            const absDiff = Math.abs(diff);

            const total = Math.max(1, myVotes + rivalVotes);
            const primaryPct = Math.round((myVotes / total) * 100);
            const rivalPct = 100 - primaryPct;

            const timer = formatLiveCountdown(b.endMs, nowMs);

            const isCurrentlyViewing =
              isBattleMode &&
              ((activeBattlePair[0].toLowerCase() ===
                b.handleA.toLowerCase() &&
                activeBattlePair[1].toLowerCase() ===
                  b.handleB.toLowerCase()) ||
                (activeBattlePair[0].toLowerCase() ===
                  b.handleB.toLowerCase() &&
                  activeBattlePair[1].toLowerCase() ===
                    b.handleA.toLowerCase()));

            const hasVotedPrimary = votedHandles.has(
              primaryFighter.handle.toLowerCase()
            );

            return (
              <div
                key={b.id}
                className={`rounded-2xl p-3.5 transition border-2 flex flex-col justify-between gap-2.5 ${
                  isCurrentlyViewing
                    ? "bg-gradient-to-b from-[#3E0A2B] to-[#240418] border-[#FFE600] shadow-[0_0_25px_rgba(255,230,0,0.3)]"
                    : "bg-[#170210]/95 hover:bg-[#230418] border-[#FFE600]/35 hover:border-[#FFE600]/75"
                }`}
              >
                {/* Top Status & Live Countdown Row */}
                <div className="flex items-center justify-between gap-1.5">
                  {diff > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black uppercase">
                      <Crown className="w-3 h-3 text-[#FFE600] fill-[#FFE600]" />
                      {timer.expired
                        ? `Won (+${absDiff})`
                        : isMeInvolved
                        ? `Winning by +${absDiff}`
                        : `@${primaryFighter.handle} +${absDiff}`}
                    </span>
                  ) : diff < 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] font-black uppercase">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      {timer.expired
                        ? `Lost (-${absDiff})`
                        : isMeInvolved
                        ? `Trailing by -${absDiff}`
                        : `@${rivalFighter.handle} +${absDiff}`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[10px] font-black uppercase">
                      <Trophy className="w-3 h-3 text-[#FFE600]" />
                      Tied ({myVotes}-{rivalVotes})
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                      timer.expired
                        ? "bg-amber-500/20 border-[#FFE600]/50 text-[#FFE600]"
                        : timer.urgent
                        ? "bg-rose-950 border-rose-400 text-rose-300 animate-pulse"
                        : "bg-[#12010B] border-[#FFE600]/35 text-[#FFE600]"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {timer.text}
                  </span>
                </div>

                {/* Contenders & Avatars Row */}
                <div
                  onClick={() =>
                    onSelectBattle(b.handleA, b.handleB, b.hours, b.startMs)
                  }
                  className="cursor-pointer grid grid-cols-11 items-center gap-1.5 bg-[#12010B]/90 rounded-xl p-2 border border-white/10"
                >
                  {/* Left Fighter */}
                  <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                    <img
                      src={primaryFighter.patakhaImageUrl}
                      alt={primaryFighter.patakhaName}
                      className="w-8 h-8 rounded-lg object-cover bg-[#FFF6E3] border border-[#D97706] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        @{primaryFighter.handle}
                      </div>
                      <div className="text-[10px] font-extrabold text-[#FFE600]">
                        🔥 {primaryFighter.votes}
                      </div>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="col-span-1 flex justify-center">
                    <span className="w-6 h-6 rounded-full bg-[#FFE600] text-[#380828] font-black text-[9px] flex items-center justify-center shadow">
                      VS
                    </span>
                  </div>

                  {/* Right Rival Fighter */}
                  <div className="col-span-5 flex items-center justify-end gap-1.5 min-w-0 text-right">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-sky-300 truncate">
                        @{rivalFighter.handle}
                      </div>
                      <div className="text-[10px] font-extrabold text-sky-200">
                        {rivalFighter.votes} 🔥
                      </div>
                    </div>
                    <img
                      src={rivalFighter.patakhaImageUrl}
                      alt={rivalFighter.patakhaName}
                      className="w-8 h-8 rounded-lg object-cover bg-[#FFF6E3] border border-sky-400 shrink-0"
                    />
                  </div>
                </div>

                {/* Live Tug-of-War Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-[#FFE600]">
                      @{primaryFighter.handle} ({primaryPct}%)
                    </span>
                    <span className="text-amber-200/70">{b.hours}h Battle</span>
                    <span className="text-sky-300">
                      ({rivalPct}%) @{rivalFighter.handle}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/70 overflow-hidden flex border border-white/15">
                    <div
                      className="h-full bg-gradient-to-r from-[#FFE600] to-[#FF5400] transition-all duration-500"
                      style={{ width: `${primaryPct}%` }}
                    />
                    <div
                      className="h-full bg-gradient-to-r from-[#6366F1] to-[#38BDF8] transition-all duration-500"
                      style={{ width: `${rivalPct}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={
                      votingHandle === primaryFighter.handle || hasVotedPrimary
                    }
                    onClick={() => onVote(primaryFighter.handle)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-[11px] inline-flex items-center justify-center gap-1 transition ${
                      hasVotedPrimary
                        ? "bg-emerald-700/80 text-white"
                        : "bg-gradient-to-r from-[#FF9F1C] to-[#EF233C] hover:brightness-110 text-white shadow"
                    }`}
                  >
                    <Flame className="w-3 h-3 fill-current text-[#FFE600]" />
                    <span>
                      {hasVotedPrimary
                        ? `Voted @${primaryFighter.handle}`
                        : `Vote @${primaryFighter.handle}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onSelectBattle(b.handleA, b.handleB, b.hours, b.startMs)
                    }
                    className={`py-1.5 px-3 rounded-xl font-black text-[11px] inline-flex items-center gap-1 transition border ${
                      isCurrentlyViewing
                        ? "bg-[#FFE600] text-[#380828] border-[#4A1238]"
                        : "bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border-[#FFE600]/40"
                    }`}
                  >
                    <span>{isCurrentlyViewing ? "Viewing" : "Open 1v1"}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}