"use client";

import React, { useState, useEffect } from "react";
import { RankedArenaProfile } from "@/lib/store";
import {
  Download,
  Flame,
  Share2,
  Users,
  Award,
  Check,
  Copy,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface Props {
  profile: RankedArenaProfile;
  onVote: (handle: string) => Promise<void>;
  hasVoted?: boolean;
  isVoting?: boolean;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function PatakhaMemeCard({
  profile,
  onVote,
  hasVoted = false,
  isVoting = false,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Reset and track loading animation whenever the card artwork URL changes
  useEffect(() => {
    setIsImageLoaded(false);
    const preload = new Image();
    preload.onload = () => setIsImageLoaded(true);
    preload.onerror = () => setIsImageLoaded(true);
    preload.src = profile.patakhaImageUrl;
    if (preload.complete) {
      setIsImageLoaded(true);
    }
  }, [profile.patakhaImageUrl]);

  const getShareableProfileUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?u=${encodeURIComponent(
        profile.handle
      )}`;
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
    return `${base}/?u=${encodeURIComponent(profile.handle)}`;
  };

  const getCleanFormalShareText = (includeUrl = true) => {
    const shareUrl = getShareableProfileUrl();
    const baseText = `I got "${profile.patakhaName}" (Rank #${profile.clanRank} of ${profile.clanTotalCount}) on Rate My Patakha. Cast your upvote for @${profile.handle} on the Diwali Patakha Leaderboard:`;
    return includeUrl ? `${baseText} ${shareUrl}` : baseText;
  };

  /**
   * Builds the 1080x1350 HD Cracker Card Poster Canvas.
   */
  const buildPosterCanvas = async (): Promise<HTMLCanvasElement> => {
    const loadedImg = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = profile.patakhaImageUrl;
    });

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // 1. Outer Dark Maroon & Gold Casing Border
    ctx.fillStyle = "#3A0B27";
    ctx.fillRect(0, 0, W, H);

    drawRoundedRectPath(ctx, 16, 16, W - 32, H - 32, 48);
    ctx.fillStyle = "#FFE600";
    ctx.fill();

    // 2. Warm Cream & Soft Gold Polaroid Interior
    drawRoundedRectPath(ctx, 28, 28, W - 56, H - 56, 40);
    const creamGrad = ctx.createLinearGradient(0, 28, 0, H - 28);
    creamGrad.addColorStop(0, "#FFFDF9");
    creamGrad.addColorStop(0.55, "#FFF6E3");
    creamGrad.addColorStop(1, "#FDE68A");
    ctx.fillStyle = creamGrad;
    ctx.fill();

    // 3. Double Golden Hairline Inner Frame
    drawRoundedRectPath(ctx, 50, 50, W - 100, H - 100, 26);
    ctx.strokeStyle = "#B45309";
    ctx.lineWidth = 4;
    ctx.stroke();

    drawRoundedRectPath(ctx, 62, 62, W - 124, H - 124, 20);
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Top Rank & Same-Patakha Header Strip
    ctx.fillStyle = "#78350F";
    ctx.font = "800 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `${profile.patakhaName.toUpperCase()} CLAN • RANK #${
        profile.clanRank
      } OF ${profile.clanTotalCount}`,
      94,
      108
    );

    ctx.textAlign = "right";
    ctx.fillStyle = "#B45309";
    ctx.fillText(
      `OVERALL #${profile.globalRank} • ${profile.votes} VOTES`,
      W - 94,
      108
    );

    // 5. Clean Rounded-Square Cracker Card Artwork Window
    const artX = 90;
    const artY = 132;
    const artW = W - 180;
    const artH = 880;
    const artRadius = 28;

    ctx.save();
    ctx.shadowColor = "rgba(69, 26, 3, 0.28)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    drawRoundedRectPath(ctx, artX, artY, artW, artH, artRadius);
    ctx.fillStyle = "#E5C185";
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, artX, artY, artW, artH, artRadius);
    ctx.clip();

    const artBg = ctx.createRadialGradient(
      artX + artW / 2,
      artY + artH / 2,
      40,
      artX + artW / 2,
      artY + artH / 2,
      artW * 0.7
    );
    artBg.addColorStop(0, "#F5DEB3");
    artBg.addColorStop(1, "#C89D66");
    ctx.fillStyle = artBg;
    ctx.fillRect(artX, artY, artW, artH);

    if (loadedImg) {
      const imgW = loadedImg.naturalWidth || 900;
      const imgH = loadedImg.naturalHeight || 900;
      const scale = Math.max(artW / imgW, artH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      ctx.drawImage(
        loadedImg,
        artX + (artW - drawW) / 2,
        artY + (artH - drawH) / 2,
        drawW,
        drawH
      );
    } else {
      ctx.fillStyle = "#78350F";
      ctx.font = "900 100px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(profile.patakhaName, artX + artW / 2, artY + artH / 2);
    }
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, artX, artY, artW, artH, artRadius);
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 6. Bottom Editorial Typography Block
    const cleanHandle = profile.handle.startsWith("@")
      ? profile.handle
      : `@${profile.handle}`;

    ctx.fillStyle = "#853A12";
    ctx.font = "italic 700 36px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `✦ ${profile.patakhaName} • Diwali Main Character`,
      W / 2,
      1078
    );

    let handleFontSize = 68;
    ctx.font = `900 ${handleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    while (
      ctx.measureText(cleanHandle).width > W - 180 &&
      handleFontSize > 32
    ) {
      handleFontSize -= 2;
      ctx.font = `900 ${handleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    }
    ctx.fillStyle = "#1E0B02";
    ctx.fillText(cleanHandle, W / 2, 1152);

    ctx.fillStyle = "#B45309";
    ctx.font = "800 22px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `✦ DIWALI CRACKER CARD • VOTE FOR ${cleanHandle.toUpperCase()} TO RANK #1 ✦`,
      W / 2,
      1228
    );

    return canvas;
  };

  const handleDownloadCrackerCardPng = async () => {
    setIsDownloading(true);
    try {
      const canvas = await buildPosterCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${profile.handle}-${profile.patakhaId}-poster.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to export Cracker Card PNG:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSharePosterAndLink = async () => {
    setIsSharingPoster(true);
    try {
      const shareUrl = getShareableProfileUrl();
      const shareText = getCleanFormalShareText(true);

      const canvas = await buildPosterCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );

      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File(
          [blob],
          `${profile.handle}-${profile.patakhaId}-poster.png`,
          { type: "image/png" }
        );

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Vote for @${profile.handle} on Rate My Patakha`,
            text: shareText,
            files: [file],
          });
          return;
        }

        await navigator.share({
          title: `Vote for @${profile.handle} on Rate My Patakha`,
          text: getCleanFormalShareText(false),
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2600);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${profile.handle}-${profile.patakhaId}-poster.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // User cancelled share sheet or fallback
    } finally {
      setIsSharingPoster(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = getShareableProfileUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2400);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    const text = getCleanFormalShareText(true);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareX = () => {
    const shareUrl = getShareableProfileUrl();
    const text = getCleanFormalShareText(false);
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const displayHandle = profile.handle.startsWith("@")
    ? profile.handle
    : `@${profile.handle}`;
  const shareUrlDisplay = getShareableProfileUrl();

  return (
    <div className="w-full max-w-[420px] mx-auto space-y-3">
      <div className="rounded-[28px] p-1.5 bg-[#3A0B27] border-[3px] border-[#FFE600] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <div className="rounded-[22px] bg-gradient-to-b from-[#FFFDF9] via-[#FFF6E3] to-[#FDE68A] p-2.5 sm:p-3.5 relative">
          <div className="rounded-[18px] border-2 border-[#B45309] p-1">
            <div className="rounded-[14px] border border-[#F59E0B]/80 p-2.5 sm:p-3.5 space-y-3">
              {/* Top Clan Rank & Global Rank Strip */}
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#78350F] px-0.5">
                <span className="inline-flex items-center gap-1 truncate">
                  <Users className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span>
                    #{profile.clanRank} of {profile.clanTotalCount}{" "}
                    {profile.patakhaName}s
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[#B45309] shrink-0">
                  <Award className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Overall #{profile.globalRank}</span>
                </span>
              </div>

              {/* Clean Rounded-Square Cracker Artwork Window with Festive Shimmer Skeleton */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-[#D97706] bg-gradient-to-b from-[#ECD2A6] to-[#C89D66] shadow-[0_10px_28px_rgba(120,53,15,0.28)] flex items-center justify-center">
                {!isImageLoaded && (
                  <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#3A0B27] via-[#590D3B] to-[#260419] flex flex-col items-center justify-center p-6 text-center animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFE600]/20 border-2 border-[#FFE600] flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(255,230,0,0.4)]">
                      <Sparkles className="w-8 h-8 text-[#FFE600] animate-spin" />
                    </div>
                    <div className="text-sm font-black uppercase tracking-widest text-[#FFE600]">
                      Igniting {profile.patakhaName}...
                    </div>
                    <div className="text-[11px] font-semibold text-amber-200/80 mt-1">
                      Preparing HD Collectible Cracker Artwork
                    </div>
                  </div>
                )}

                <img
                  src={profile.patakhaImageUrl}
                  alt={profile.patakhaName}
                  fetchPriority="high"
                  decoding="async"
                  onLoad={() => setIsImageLoaded(true)}
                  onError={() => setIsImageLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isImageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {/* Bottom Editorial Typography Block */}
              <div className="pt-1 pb-0.5 text-center space-y-1">
                <div className="font-serif italic font-bold text-sm sm:text-base text-[#853A12] flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D97706] fill-[#FFE600] shrink-0" />
                  <span className="truncate">
                    {profile.patakhaName} • Diwali Main Character
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-[#1E0B02] tracking-tight truncate px-2">
                  {displayHandle}
                </div>

                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-[#B45309] pt-0.5">
                  ✦ DIWALI CRACKER STUDIO • RATE MY PATAKHA ✦
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Vote & Clan Counter Bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="text-amber-100 font-bold truncate">
            Same Card:{" "}
            <strong className="text-[#FFE600]">
              {profile.clanTotalCount} users
            </strong>{" "}
            got {profile.patakhaName}
          </div>

          <button
            type="button"
            disabled={isVoting || hasVoted}
            onClick={() => onVote(profile.handle)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs sm:text-sm border shadow-lg active:scale-95 transition ${
              hasVoted
                ? "bg-emerald-700/90 text-white border-emerald-300/60"
                : "bg-gradient-to-r from-[#FF9F1C] via-[#FF5400] to-[#EF233C] hover:brightness-110 text-white border-[#FFE600]/70"
            }`}
          >
            <Flame className="w-4 h-4 fill-current text-[#FFE600]" />
            <span>{hasVoted ? "Upvoted" : "Upvote"}</span>
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#FFE600]">
              {profile.votes}
            </span>
          </button>
        </div>
      </div>

      {/* Shareable Voting Link Box */}
      <div className="bg-[#230518]/95 border-2 border-[#FFE600]/60 rounded-2xl p-3 space-y-2 shadow-xl">
        <div className="flex items-center justify-between gap-2 text-[11px] font-black text-[#FFE600]">
          <span className="inline-flex items-center gap-1 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Share Voting Link to Boost {displayHandle}&apos;s Rank
          </span>
          <span className="text-emerald-300">{profile.votes} Upvotes</span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            readOnly
            value={shareUrlDisplay}
            onClick={handleCopyShareLink}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#12020C] border border-[#FFE600]/35 text-xs text-amber-100 font-mono truncate focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs transition"
          >
            {copiedShareLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Poster Share + Download + Social Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSharePosterAndLink}
          disabled={isSharingPoster}
          className="inline-flex items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl active:scale-[0.99] transition"
        >
          <Share2 className="w-4 h-4 stroke-[2.5]" />
          <span>
            {isSharingPoster ? "Preparing..." : "Share Poster + Link"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleDownloadCrackerCardPng}
          disabled={isDownloading}
          className="inline-flex items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl active:scale-[0.99] transition"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isDownloading ? "Saving..." : "Download Poster"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-300/50 text-white font-extrabold text-xs transition shadow"
        >
          Share on WhatsApp
        </button>

        <button
          type="button"
          onClick={handleShareX}
          className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2A071D]/95 hover:bg-[#3B0B29] border border-[#FFE600]/40 text-white font-extrabold text-xs transition shadow"
        >
          <Share2 className="w-3.5 h-3.5 text-[#FFE600]" />
          <span>Post on X (x.com)</span>
        </button>
      </div>
    </div>
  );
}