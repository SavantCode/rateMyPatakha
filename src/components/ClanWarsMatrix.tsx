"use client";

import React, { useRef, useState } from "react";
import { PatakhaClanSummary, RankedArenaProfile } from "@/lib/store";
import { PatakhaId } from "@/lib/patakhas";
import {
  Flame,
  Users,
  Crown,
  Sparkles,
  LayoutGrid,
  GalleryHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Swords,
  Compass,
} from "lucide-react";

interface Props {
  clans: PatakhaClanSummary[];
  profiles?: RankedArenaProfile[];
  selectedPatakha: PatakhaId | "all";
  onSelectPatakha: (id: PatakhaId | "all") => void;
  onInspectProfile?: (profile: RankedArenaProfile) => void;
  onStartBattleWithProfile?: (profile: RankedArenaProfile) => void;
  onVote?: (handle: string) => Promise<void>;
  votedHandles?: Set<string>;
  votingHandle?: string | null;
}

export default function ClanWarsMatrix({
  clans,
  profiles = [],
  selectedPatakha,
  onSelectPatakha,
  onInspectProfile,
  onStartBattleWithProfile,
  onVote,
  votedHandles = new Set(),
  votingHandle = null,
}: Props) {
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [showAllGrid, setShowAllGrid] = useState(false);
  const [query, setQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const totalMembers = clans.reduce((acc, c) => acc + c.memberCount, 0) || 1;

  const filteredClans = clans.filter((c) =>
    !query.trim()
      ? true
      : c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const visibleGridClans = showAllGrid
    ? filteredClans
    : filteredClans.slice(0, 8);

  const activeBrowsedClanId =
    selectedPatakha !== "all" ? selectedPatakha : clans[0]?.patakhaId || null;

  const activeBrowsedClan =
    clans.find((c) => c.patakhaId === activeBrowsedClanId) || null;

  const activeClanMembers = profiles.filter(
    (p) => p.patakhaId === activeBrowsedClanId
  );

  const scrollCarousel = (dir: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const distance = 260;
    scrollContainerRef.current.scrollBy({
      left: dir === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-4">
      {/* Header + Mobile View Switcher + Search */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#FFE600]">
              <Compass className="w-3.5 h-3.5" />
              Browse {clans.length} Patakha Clans • Tap Any Clan to See Its
              Members
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5">
              🧨 Explore Patakha Clans & Member Rosters
            </h2>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {selectedPatakha !== "all" && (
              <button
                type="button"
                onClick={() => onSelectPatakha("all")}
                className="px-3 py-1.5 rounded-xl bg-[#FFE600] text-[#380828] text-xs font-black shadow active:scale-95 transition"
              >
                Show All Clans
              </button>
            )}

            {/* Toggle between Swipe Carousel & Compact Grid */}
            <div className="inline-flex rounded-xl bg-[#14020E] p-1 border border-[#FFE600]/35">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                  viewMode === "carousel"
                    ? "bg-[#FFE600] text-[#380828]"
                    : "text-amber-200 hover:text-white"
                }`}
                title="Swipe Carousel"
              >
                <GalleryHorizontal className="w-3.5 h-3.5" />
                <span>Swipe</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                  viewMode === "grid"
                    ? "bg-[#FFE600] text-[#380828]"
                    : "text-amber-200 hover:text-white"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar + Desktop Carousel Arrows */}
        {clans.length > 4 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#FFE600] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search across ${clans.length} Patakha clans...`}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14020E]/90 border border-[#FFE600]/35 text-xs sm:text-sm text-white placeholder:text-amber-200/45 font-semibold focus:outline-none focus:border-[#FFE600]"
              />
            </div>

            {viewMode === "carousel" && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  className="p-2 rounded-xl bg-[#14020E] border border-[#FFE600]/40 text-[#FFE600] hover:bg-[#FFE600] hover:text-[#380828] transition"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  className="p-2 rounded-xl bg-[#14020E] border border-[#FFE600]/40 text-[#FFE600] hover:bg-[#FFE600] hover:text-[#380828] transition"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODE A: MOBILE-FIRST TOUCH SWIPE CAROUSEL */}
      {viewMode === "carousel" ? (
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory no-scrollbar"
          >
            {filteredClans.map((clan) => {
              const isSelected = selectedPatakha === clan.patakhaId;
              const sharePct = Math.round(
                (clan.memberCount / totalMembers) * 100
              );

              return (
                <button
                  key={clan.patakhaId}
                  type="button"
                  onClick={() =>
                    onSelectPatakha(isSelected ? "all" : clan.patakhaId)
                  }
                  className={`snap-start shrink-0 w-[162px] sm:w-[196px] text-left rounded-2xl p-2.5 sm:p-3.5 transition-all border-2 flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-b from-[#FF9F1C]/40 to-[#4A1238]/95 border-[#FFE600] ring-2 ring-[#FFE600]/60 shadow-lg"
                      : "bg-[#190311]/95 hover:bg-[#27061B] border-[#FFE600]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FFE600] text-[#380828]">
                      Clan #{clan.clanRank}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200/80">
                      {sharePct}%
                    </span>
                  </div>

                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/65 mb-2 border border-[#FFE600]/25 p-1.5 flex items-center justify-center">
                    <img
                      src={clan.imageUrl}
                      alt={clan.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-white truncate">
                      {clan.emoji} {clan.name}
                    </h3>

                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-[#FFE600] font-black flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {clan.memberCount}
                      </span>
                      <span className="text-orange-300 font-black flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {clan.totalVotes}
                      </span>
                    </div>

                    {clan.topCreatorHandle && (
                      <div className="mt-1.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1 truncate">
                        <Crown className="w-3 h-3 text-[#FFE600] shrink-0" />
                        <span className="truncate">
                          @{clan.topCreatorHandle}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-amber-200/70 font-semibold text-center sm:hidden mt-1">
            ← Swipe sideways & tap any Clan to browse its members →
          </div>
        </div>
      ) : (
        /* MODE B: COMPACT RESPONSIVE 2-COLUMN MOBILE / 4-COLUMN DESKTOP GRID */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
            {visibleGridClans.map((clan) => {
              const isSelected = selectedPatakha === clan.patakhaId;
              return (
                <button
                  key={clan.patakhaId}
                  type="button"
                  onClick={() =>
                    onSelectPatakha(isSelected ? "all" : clan.patakhaId)
                  }
                  className={`text-left rounded-2xl p-2.5 sm:p-3 transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? "bg-gradient-to-b from-[#FF9F1C]/40 to-[#4A1238]/95 border-[#FFE600] ring-2 ring-[#FFE600]/60"
                      : "bg-[#190311]/95 hover:bg-[#27061B] border-[#FFE600]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFE600] text-[#380828]">
                      Clan #{clan.clanRank}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200">
                      {clan.memberCount} users
                    </span>
                  </div>

                  <div className="aspect-square w-full max-h-36 mx-auto rounded-xl overflow-hidden bg-black/65 mb-2 border border-[#FFE600]/20 p-1.5 flex items-center justify-center">
                    <img
                      src={clan.imageUrl}
                      alt={clan.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-white truncate">
                      {clan.emoji} {clan.name}
                    </h3>
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-amber-200/80">Votes:</span>
                      <span className="font-black text-orange-300 flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {clan.totalVotes}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredClans.length > 8 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllGrid((prev) => !prev)}
                className="px-4 py-2 rounded-xl bg-[#14020E] hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border border-[#FFE600]/50 text-xs font-black transition"
              >
                {showAllGrid
                  ? "Show Fewer Clans"
                  : `Show All ${filteredClans.length} Patakha Clans`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* INTERACTIVE CLAN ROSTER BROWSER (See other users' clans & members) */}
      {activeBrowsedClan && profiles.length > 0 && (
        <div className="bg-[#16020F]/95 border-2 border-[#FFE600]/45 rounded-2xl p-3.5 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <img
                src={activeBrowsedClan.imageUrl}
                alt={activeBrowsedClan.name}
                className="w-9 h-9 rounded-xl object-cover bg-[#FFF6E3] border border-[#D97706] shrink-0"
              />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Clan Roster Spotlight • Clan Rank #
                  {activeBrowsedClan.clanRank}
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  {activeBrowsedClan.emoji} {activeBrowsedClan.name} Members (
                  {activeClanMembers.length})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {clans.slice(0, 6).map((c) => (
                <button
                  key={c.patakhaId}
                  type="button"
                  onClick={() => onSelectPatakha(c.patakhaId)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shrink-0 ${
                    activeBrowsedClan.patakhaId === c.patakhaId
                      ? "bg-[#FFE600] text-[#380828] font-black shadow"
                      : "bg-[#26051A] text-amber-200 border border-[#FFE600]/25 hover:border-[#FFE600]"
                  }`}
                >
                  {c.emoji} {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {activeClanMembers.length === 0 ? (
            <div className="text-xs text-amber-200/75 py-3 text-center">
              No users in {activeBrowsedClan.name} yet — generate your card to
              claim #1 in this clan!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {activeClanMembers.slice(0, 6).map((member) => {
                const hasVoted = votedHandles.has(member.handle.toLowerCase());
                return (
                  <div
                    key={member.handle}
                    className="bg-[#230417] border border-[#FFE600]/30 hover:border-[#FFE600] rounded-xl p-2.5 flex items-center justify-between gap-2 transition"
                  >
                    <div
                      onClick={() => onInspectProfile?.(member)}
                      className="flex items-center gap-2 min-w-0 cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#FFE600] text-[#380828] font-black text-[11px] flex items-center justify-center shrink-0">
                        #{member.clanRank}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-xs sm:text-sm text-white hover:text-[#FFE600] truncate">
                          @{member.handle}
                        </div>
                        <div className="text-[10px] text-amber-200/75 font-bold">
                          Overall #{member.globalRank} • 🔥 {member.votes}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onInspectProfile && (
                        <button
                          type="button"
                          onClick={() => onInspectProfile(member)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFE600] transition"
                          title={`View @${member.handle}'s Card`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onStartBattleWithProfile && (
                        <button
                          type="button"
                          onClick={() => onStartBattleWithProfile(member)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] transition"
                          title={`1v1 Battle vs @${member.handle}`}
                        >
                          <Swords className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onVote && (
                        <button
                          type="button"
                          disabled={votingHandle === member.handle || hasVoted}
                          onClick={() => onVote(member.handle)}
                          className={`px-2 py-1 rounded-lg font-black text-[11px] inline-flex items-center gap-1 transition ${
                            hasVoted
                              ? "bg-emerald-700 text-white"
                              : "bg-gradient-to-r from-[#FF9F1C] to-[#EF233C] text-white"
                          }`}
                        >
                          <Flame className="w-3 h-3 fill-current text-[#FFE600]" />
                          <span>{member.votes}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}