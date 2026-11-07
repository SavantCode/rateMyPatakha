"use client";

import React, { useState } from "react";
import { RankedArenaProfile } from "@/lib/store";
import {
  Flame,
  Trophy,
  Users,
  Sparkles,
  Award,
  Check,
  Copy,
  Share2,
  ArrowRight,
  Crown,
  ShieldCheck,
  TrendingUp,
  Swords,
} from "lucide-react";

interface Props {
  profile: RankedArenaProfile;
  allProfiles: RankedArenaProfile[];
  onVote: (handle: string) => Promise<void>;
  hasVoted: boolean;
  isVoting: boolean;
  onSwitchToCreatorStudio: () => void;
  onScrollToLeaderboard: () => void;
  onStartRivalryBattle?: (handleA: string, handleB: string) => void;
}

export default function PublicVoteSpotlight({
  profile,
  allProfiles,
  onVote,
  hasVoted,
  isVoting,
  onSwitchToCreatorStudio,
  onScrollToLeaderboard,
  onStartRivalryBattle,
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false);

  const displayHandle = profile.handle.startsWith("@")
    ? profile.handle
    : `@${profile.handle}`;

  const rivalAbove =
    profile.globalRank > 1
      ? allProfiles.find((p) => p.globalRank === profile.globalRank - 1) || null
      : null;

  const rivalBelow =
    allProfiles.find((p) => p.globalRank === profile.globalRank + 1) ||
    allProfiles.find((p) => p.handle !== profile.handle) ||
    null;

  const closestRival = rivalAbove || rivalBelow;

  const votesNeededToOvertake = rivalAbove
    ? Math.max(1, rivalAbove.votes - profile.votes + 1)
    : 0;

  const progressPct = rivalAbove
    ? Math.min(
        96,
        Math.max(18, Math.round((profile.votes / (rivalAbove.votes + 1)) * 100))
      )
    : 100;

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?u=${encodeURIComponent(
        profile.handle
      )}`;
    }
    return `http://localhost:3005/?u=${encodeURIComponent(profile.handle)}`;
  };

  const handleCopyVotingLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // ignore
    }
  };

  const handleShareFriendsLink = async () => {
    const url = getShareUrl();
    const text = `🧨 Upvote ${displayHandle} (${profile.patakhaName} — Rank #${profile.clanRank}) on the Diwali Patakha Leaderboard!`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Vote for ${displayHandle} on Rate My Patakha!`,
          text,
          url,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    await handleCopyVotingLink();
  };

  return (
    <section className="max-w-4xl mx-auto">
      <div className="bg-[#26051A]/95 border-2 border-[#FFE600] rounded-[32px] p-4 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-md">
        {/* Top Verified Official Voting Page Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-[#FFE600]/25">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE600]/15 border border-[#FFE600]/50 text-[#FFE600] text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Voting Page for {displayHandle}
          </div>

          <div className="flex items-center gap-3">
            {closestRival && onStartRivalryBattle && (
              <button
                type="button"
                onClick={() =>
                  onStartRivalryBattle(profile.handle, closestRival.handle)
                }
                className="px-3 py-1 rounded-xl bg-[#FFE600] text-[#380828] text-xs font-black inline-flex items-center gap-1 shadow active:scale-95 transition"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>1v1 vs @{closestRival.handle}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onScrollToLeaderboard}
              className="text-xs font-extrabold text-amber-200 hover:text-[#FFE600] inline-flex items-center gap-1 transition"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Leaderboard (#{profile.globalRank}) →</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* LEFT: READ-ONLY COLLECTIBLE GOLDEN CREAM CRACKER CARD */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[380px] rounded-[28px] p-1.5 bg-[#3A0B27] border-[3px] border-[#FFE600] shadow-[0_18px_45px_rgba(0,0,0,0.8)]">
              <div className="rounded-[22px] bg-gradient-to-b from-[#FFFDF9] via-[#FFF6E3] to-[#FDE68A] p-3 relative">
                <div className="rounded-[18px] border-2 border-[#B45309] p-1">
                  <div className="rounded-[14px] border border-[#F59E0B]/80 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#78350F]">
                      <span className="inline-flex items-center gap-1 truncate">
                        <Users className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                        <span>
                          Rank #{profile.clanRank} of {profile.clanTotalCount}{" "}
                          {profile.patakhaName}s
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#B45309] shrink-0">
                        <Award className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>Overall #{profile.globalRank}</span>
                      </span>
                    </div>

                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-[#D97706] bg-gradient-to-b from-[#ECD2A6] to-[#C89D66] shadow-inner flex items-center justify-center">
                      <img
                        src={profile.patakhaImageUrl}
                        alt={profile.patakhaName}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    </div>

                    <div className="pt-1 text-center space-y-0.5">
                      <div className="font-serif italic font-bold text-sm text-[#853A12] flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#D97706] fill-[#FFE600]" />
                        <span>
                          {profile.patakhaName} • Diwali Main Character
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl font-black text-[#1E0B02] tracking-tight truncate px-2">
                        {displayHandle}
                      </div>

                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#B45309]">
                        ✦ VERIFIED PATAKHA COLLECTORS CARD ✦
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DEDICATED 1-CLICK UPVOTE ENGINE & RANK PROGRESS */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/20 border border-orange-400/40 text-orange-200 text-xs font-black">
                <span>{profile.patakhaEmoji}</span>
                <span>{profile.patakhaName} Clan</span>
                <span>•</span>
                <span>Clan Rank #{profile.clanRank}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {hasVoted ? (
                  <>
                    You Upvoted{" "}
                    <span className="gold-shimmer">{displayHandle}</span>! 🧨
                  </>
                ) : (
                  <>
                    Help <span className="gold-shimmer">{displayHandle}</span>{" "}
                    Reach Rank #1! 🏆
                  </>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                {hasVoted
                  ? `Your vote has been recorded on the live leaderboard! Challenge a friend to a 1v1 Battle or create your own Patakha Card below.`
                  : `${displayHandle} was categorized as a "${profile.patakhaName}". Tap the button below to cast your upvote and push them higher on the Diwali Leaderboard!`}
              </p>
            </div>

            {/* Live Rank Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#15020E] border border-[#FFE600]/35 rounded-2xl p-3 text-center">
                <div className="text-[10px] font-extrabold uppercase text-amber-200/70">
                  Total Votes
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#FFE600] mt-0.5 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
                  {profile.votes}
                </div>
              </div>

              <div className="bg-[#15020E] border border-[#FFE600]/35 rounded-2xl p-3 text-center">
                <div className="text-[10px] font-extrabold uppercase text-amber-200/70">
                  Clan Rank
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                  #{profile.clanRank}
                  <span className="text-xs text-emerald-200/70 font-bold">
                    /{profile.clanTotalCount}
                  </span>
                </div>
              </div>

              <div className="bg-[#15020E] border border-[#FFE600]/35 rounded-2xl p-3 text-center">
                <div className="text-[10px] font-extrabold uppercase text-amber-200/70">
                  Overall Rank
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center justify-center gap-1">
                  {profile.globalRank === 1 && (
                    <Crown className="w-4 h-4 text-[#FFE600]" />
                  )}
                  #{profile.globalRank}
                </div>
              </div>
            </div>

            {/* Next Rank Progress Bar */}
            <div className="bg-[#170310] border border-[#FFE600]/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold">
                {rivalAbove ? (
                  <span className="text-amber-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#FFE600] shrink-0" />
                    <span>
                      Needs{" "}
                      <strong className="text-[#FFE600]">
                        {votesNeededToOvertake} more{" "}
                        {votesNeededToOvertake === 1 ? "upvote" : "upvotes"}
                      </strong>{" "}
                      to pass @{rivalAbove.handle} (#{rivalAbove.globalRank})
                    </span>
                  </span>
                ) : (
                  <span className="text-[#FFE600] flex items-center gap-1.5">
                    <Crown className="w-4 h-4 fill-current shrink-0" />
                    <span>
                      {displayHandle} is #1 Overall! Upvote to defend the crown!
                    </span>
                  </span>
                )}
                <span className="text-[#FFE600] font-black">{progressPct}%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden p-0.5 border border-[#FFE600]/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFE600] via-[#FF7B00] to-[#EF233C] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* GIANT PRIMARY UPVOTE CTA BUTTON */}
            <button
              type="button"
              disabled={isVoting || hasVoted}
              onClick={() => onVote(profile.handle)}
              className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-xl border-2 shadow-[0_12px_35px_rgba(255,123,0,0.45)] flex items-center justify-center gap-3 active:scale-[0.98] transition ${
                hasVoted
                  ? "bg-emerald-600 text-white border-emerald-300 cursor-default"
                  : "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#EF233C] hover:brightness-110 text-[#2B051C] border-white animate-pulse-slow"
              }`}
            >
              <Flame
                className={`w-6 h-6 sm:w-7 sm:h-7 ${
                  hasVoted
                    ? "fill-white text-white"
                    : "fill-[#2B051C] text-[#2B051C]"
                }`}
              />
              <span>
                {isVoting
                  ? "Recording Upvote..."
                  : hasVoted
                  ? `✅ Upvoted ${displayHandle} (${profile.votes} Votes)`
                  : `🔥 Tap to Upvote ${displayHandle} (${profile.votes})`}
              </span>
            </button>

            {/* Secondary Share + 1v1 Battle Row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVotingLink}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#16020F] hover:bg-white/10 border border-[#FFE600]/40 text-amber-100 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Voting Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#FFE600]" />
                    <span>Copy Voting Link</span>
                  </>
                )}
              </button>

              {closestRival && onStartRivalryBattle && (
                <button
                  type="button"
                  onClick={() =>
                    onStartRivalryBattle(profile.handle, closestRival.handle)
                  }
                  className="py-2.5 px-3.5 rounded-xl bg-[#16020F] hover:bg-[#FFE600] text-[#FFE600] hover:text-[#380828] border border-[#FFE600]/50 text-xs font-black inline-flex items-center justify-center gap-1.5 transition"
                >
                  <Swords className="w-4 h-4" />
                  <span>1v1 Battle</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareFriendsLink}
                className="py-2.5 px-3.5 rounded-xl bg-[#16020F] hover:bg-white/10 border border-[#FFE600]/40 text-[#FFE600] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {/* VIRAL LOOP ACQUISITION BANNER */}
            <div className="pt-2 border-t border-white/15">
              <div className="bg-gradient-to-r from-[#3B0828] via-[#4E0B35] to-[#3B0828] border-2 border-[#FFE600]/65 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <div className="text-xs font-black uppercase tracking-wider text-[#FFE600]">
                    🧨 Which Patakha Are You?
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                    Create your own Cracker Card or Wooden Frame in 5 seconds!
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSwitchToCreatorStudio}
                  className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition"
                >
                  <span>Create Yours Now</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}