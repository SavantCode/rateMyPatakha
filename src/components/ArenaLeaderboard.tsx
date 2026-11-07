"use client";

import React, { useState } from "react";
import { PatakhaClanSummary, RankedArenaProfile } from "@/lib/store";
import { PatakhaId } from "@/lib/patakhas";
import {
  Flame,
  Trophy,
  Search,
  Eye,
  Users,
  Crown,
  Filter,
  Link2,
  Check,
  ChevronDown,
  Swords,
  Gift,
} from "lucide-react";

interface Props {
  profiles: RankedArenaProfile[];
  clans: PatakhaClanSummary[];
  selectedPatakha: PatakhaId | "all";
  onSelectPatakha: (id: PatakhaId | "all") => void;
  onVote: (handle: string) => Promise<void>;
  onInspectProfile: (profile: RankedArenaProfile) => void;
  onStartBattleWithProfile?: (profile: RankedArenaProfile) => void;
  onJoinActiveBattle?: (
    handleA: string,
    handleB: string,
    hours?: number
  ) => void;
  votingHandle: string | null;
  votedHandles?: Set<string>;
  myHandle?: string;
  othersVotedCount?: number;
}

const PAGE_SIZE = 20;

export default function ArenaLeaderboard({
  profiles,
  clans,
  selectedPatakha,
  onSelectPatakha,
  onVote,
  onInspectProfile,
  onStartBattleWithProfile,
  onJoinActiveBattle,
  votingHandle,
  votedHandles = new Set(),
  myHandle = "",
  othersVotedCount = 0,
}: Props) {
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = profiles.filter((p) => {
    const matchesPatakha =
      selectedPatakha === "all" || p.patakhaId === selectedPatakha;
    const q = searchFilter.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.handle.toLowerCase().includes(q) ||
      p.patakhaName.toLowerCase().includes(q);
    return matchesPatakha && matchesSearch;
  });

  const visibleProfiles = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const activeClan =
    selectedPatakha !== "all"
      ? clans.find((c) => c.patakhaId === selectedPatakha) || null
      : null;

  const progressInCycle = othersVotedCount % 3;
  const remainingForNextBonus = 3 - progressInCycle;
  const totalBonusesEarned = Math.floor(othersVotedCount / 3);

  const handleCopyUserShareUrl = async (handle: string) => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/?u=${encodeURIComponent(handle)}`;
      await navigator.clipboard.writeText(url);
      setCopiedHandle(handle);
      setTimeout(() => setCopiedHandle(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="bg-[#26061B]/92 border-2 border-[#FFE600]/65 rounded-3xl p-3.5 sm:p-7 shadow-2xl backdrop-blur-md space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-black text-[#FFE600]">
              <Trophy className="w-3.5 h-3.5" />
              Live Community Voting Leaderboard
            </div>
            <h2 className="text-lg sm:text-3xl font-black text-white mt-0.5">
              {activeClan
                ? `${activeClan.emoji} ${activeClan.name} Ranks (${filtered.length})`
                : "🏆 Diwali Patakha Leaderboard"}
            </h2>
          </div>

          {selectedPatakha !== "all" && (
            <button
              type="button"
              onClick={() => {
                onSelectPatakha("all");
                setVisibleCount(PAGE_SIZE);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#FFE600] text-[#380828] text-xs font-black shadow"
            >
              Show All ({profiles.length})
            </button>
          )}
        </div>

        {/* Upvote 3 Others = +1 Self Bonus Banner */}
        <div className="bg-gradient-to-r from-[#380828] via-[#4A0E35] to-[#380828] border-2 border-[#FFE600]/75 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFE600] text-[#380828] flex items-center justify-center shrink-0 shadow">
              <Gift className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-black text-[#FFE600]">
                Reward Rule: Three Votes to Others = +1 Bonus Vote to Your Own
                Score!
              </span>
              <p className="text-[11px] sm:text-xs text-amber-100/90 font-semibold mt-0.5">
                {myHandle ? (
                  <>
                    Every time you upvote 3 other users,{" "}
                    <strong className="text-emerald-300">@{myHandle}</strong>{" "}
                    automatically gets{" "}
                    <strong className="text-[#FFE600]">+1 Bonus Vote</strong> in
                    real time! ({remainingForNextBonus} more{" "}
                    {remainingForNextBonus === 1 ? "upvote" : "upvotes"} for
                    your next +1 bonus)
                  </>
                ) : (
                  <>
                    Generate your card above, then upvote any 3 other users to
                    automatically boost your own score by{" "}
                    <strong className="text-[#FFE600]">+1 vote</strong> each
                    time!
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-[#14020E] px-2.5 py-1.5 rounded-xl border border-[#FFE600]/45">
              {[0, 1, 2].map((slot) => (
                <span
                  key={slot}
                  className={`w-3.5 h-3.5 rounded-full border transition ${
                    slot < progressInCycle
                      ? "bg-[#FFE600] border-white shadow-[0_0_8px_#FFE600]"
                      : "bg-white/10 border-[#FFE600]/40"
                  }`}
                />
              ))}
              <span className="text-[11px] font-black text-[#FFE600] ml-1">
                {progressInCycle}/3
              </span>
            </div>

            {totalBonusesEarned > 0 && (
              <span className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 border border-emerald-300/60 text-white text-[11px] font-black">
                +{totalBonusesEarned} Bonus Earned
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-7">
            <Search className="w-4 h-4 text-[#FFE600] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search @username or Patakha card..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#14020E]/95 border border-[#FFE600]/45 text-xs sm:text-sm text-white placeholder:text-amber-200/45 font-semibold focus:outline-none focus:border-[#FFE600]"
            />
          </div>

          <div className="relative sm:col-span-5">
            <Filter className="w-4 h-4 text-[#FFE600] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedPatakha}
              onChange={(e) => {
                onSelectPatakha(e.target.value as PatakhaId | "all");
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#14020E]/95 border border-[#FFE600]/45 text-xs sm:text-sm text-[#FFE600] font-extrabold focus:outline-none focus:border-[#FFE600]"
            >
              <option value="all">
                🔥 Filter by Patakha: All ({profiles.length} Users)
              </option>
              {clans.map((clan) => (
                <option key={clan.patakhaId} value={clan.patakhaId}>
                  {clan.emoji} {clan.name} ({clan.memberCount} Users)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Horizontal Swipe Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            onSelectPatakha("all");
            setVisibleCount(PAGE_SIZE);
          }}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition border ${
            selectedPatakha === "all"
              ? "bg-[#FFE600] text-[#380828] border-[#4A1238] shadow"
              : "bg-[#16030F]/80 text-amber-100 border-[#FFE600]/30"
          }`}
        >
          All ({profiles.length})
        </button>

        {clans.map((clan) => {
          const active = selectedPatakha === clan.patakhaId;
          return (
            <button
              key={clan.patakhaId}
              type="button"
              onClick={() => {
                onSelectPatakha(clan.patakhaId);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold transition border flex items-center gap-1.5 ${
                active
                  ? "bg-gradient-to-r from-[#FFE600] to-[#FF9F1C] text-[#380828] border-[#4A1238] font-black shadow"
                  : "bg-[#16030F]/80 text-amber-100 border-[#FFE600]/30"
              }`}
            >
              <span>{clan.emoji}</span>
              <span className="max-w-[110px] truncate">{clan.name}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-black ${
                  active
                    ? "bg-[#380828] text-[#FFE600]"
                    : "bg-[#FFE600]/20 text-[#FFE600]"
                }`}
              >
                {clan.memberCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leaderboard Rows */}
      <div className="space-y-2.5">
        {visibleProfiles.length === 0 ? (
          <div className="text-center py-8 bg-black/35 rounded-2xl border border-[#FFE600]/25 px-4">
            <p className="text-amber-200 font-extrabold text-sm">
              No profiles found for this Patakha filter yet.
            </p>
            <p className="text-xs text-amber-200/70 mt-1">
              Enter your username at the top to claim #1 in this category!
            </p>
          </div>
        ) : (
          visibleProfiles.map((item) => {
            const displayRank =
              selectedPatakha === "all" ? item.globalRank : item.clanRank;
            const hasVoted = votedHandles.has(item.handle.toLowerCase());
            const isOwnProfile =
              Boolean(myHandle) &&
              item.handle.toLowerCase() === myHandle.toLowerCase();

            const rankBadgeStyle =
              displayRank === 1
                ? "bg-gradient-to-b from-[#FFE600] to-[#FF9F1C] text-[#380828] border-[#4A1238]"
                : displayRank === 2
                ? "bg-gradient-to-b from-slate-100 to-slate-300 text-[#380828] border-slate-500"
                : displayRank === 3
                ? "bg-gradient-to-b from-amber-500 to-orange-700 text-white border-amber-200"
                : "bg-[#14020E] text-[#FFE600] border-[#FFE600]/35";

            return (
              <div
                key={item.handle}
                className={`rounded-2xl p-3 sm:p-3.5 transition border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 ${
                  isOwnProfile
                    ? "bg-gradient-to-r from-emerald-950/90 via-[#2B071E]/95 to-emerald-950/90 border-emerald-400"
                    : displayRank === 1
                    ? "bg-gradient-to-r from-[#3D0A2B]/95 via-[#2B071E]/95 to-[#3D0A2B]/95 border-[#FFE600]"
                    : "bg-[#1A0312]/90 hover:bg-[#29061C] border-[#FFE600]/30"
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex flex-col items-center justify-center font-black shrink-0 ${rankBadgeStyle}`}
                  >
                    <span className="text-xs sm:text-sm leading-none">
                      #{displayRank}
                    </span>
                    <span className="text-[7px] sm:text-[8px] uppercase tracking-tighter opacity-85 mt-0.5">
                      {selectedPatakha === "all" ? "All" : "Clan"}
                    </span>
                  </div>

                  {/* Mini Cream Polaroid Thumbnail */}
                  <div
                    onClick={() => onInspectProfile(item)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl p-0.5 bg-[#FFF6E3] border-2 border-[#D97706] shrink-0 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={item.patakhaImageUrl}
                      alt={item.patakhaName}
                      loading="lazy"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        onClick={() => onInspectProfile(item)}
                        className="font-black text-sm sm:text-base text-white hover:text-[#FFE600] cursor-pointer truncate transition"
                      >
                        @{item.handle}
                      </span>
                      {isOwnProfile && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[10px] font-black shrink-0">
                          YOU
                        </span>
                      )}
                      {displayRank === 1 && (
                        <Crown className="w-4 h-4 text-[#FFE600] fill-[#FFE600] shrink-0" />
                      )}
                      {item.inActiveBattle && item.activeBattleRival && (
                        <button
                          type="button"
                          onClick={() =>
                            onJoinActiveBattle?.(
                              item.handle,
                              item.activeBattleRival!,
                              item.activeBattleHours || 12
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-[#FFE600] text-white text-[10px] font-black shadow animate-pulse"
                          title={`Click to view live 1v1 Battle: @${item.handle} vs @${item.activeBattleRival}`}
                        >
                          <Swords className="w-3 h-3 text-[#FFE600]" />
                          <span>
                            In 1v1 vs @{item.activeBattleRival} (
                            {item.activeBattleHours || 12}h)
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold bg-[#FFE600]/15 border border-[#FFE600]/40 text-[#FFE600] truncate max-w-[175px] sm:max-w-none">
                        <span>{item.patakhaEmoji}</span>
                        <span className="truncate">{item.patakhaName}</span>
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-300 inline-flex items-center gap-0.5 shrink-0">
                        <Users className="w-3 h-3 shrink-0" />#{item.clanRank}/
                        {item.clanTotalCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {onStartBattleWithProfile && (
                      <button
                        type="button"
                        onClick={() => onStartBattleWithProfile(item)}
                        className="px-2.5 py-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border border-[#FFE600]/35 text-[11px] sm:text-xs font-black transition inline-flex items-center gap-1"
                        title={`Start 1v1 Battle with @${item.handle}`}
                      >
                        <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>1v1</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleCopyUserShareUrl(item.handle)}
                      className="px-2.5 py-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#FFE600]/35 text-amber-100 text-[11px] sm:text-xs font-extrabold transition inline-flex items-center gap-1"
                      title="Copy Direct Voting Link"
                    >
                      {copiedHandle === item.handle ? (
                        <>
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                          <span className="sm:hidden text-emerald-300">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE600]" />
                          <span className="sm:hidden">Link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onInspectProfile(item)}
                      className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#FFE600]/35 text-amber-100 text-[11px] sm:text-xs font-extrabold transition inline-flex items-center gap-1"
                      title="Open Voting Page"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFE600]" />
                      <span>View</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={votingHandle === item.handle || hasVoted}
                    onClick={() => onVote(item.handle)}
                    className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm border shadow active:scale-95 transition ${
                      hasVoted
                        ? "bg-emerald-700/90 text-white border-emerald-300/60"
                        : "bg-gradient-to-r from-[#FF9F1C] via-[#FF5400] to-[#EF233C] text-white border-[#FFE600]/60"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-[#FFE600]" />
                    <span>{hasVoted ? "Voted" : "Vote"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#FFE600] text-[11px]">
                      {item.votes}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Pagination Button */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#14020E] hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border-2 border-[#FFE600]/50 font-black text-xs sm:text-sm transition shadow-lg"
          >
            <ChevronDown className="w-4 h-4" />
            <span>
              Show More Ranks ({filtered.length - visibleCount} remaining)
            </span>
          </button>
        </div>
      )}
    </section>
  );
}