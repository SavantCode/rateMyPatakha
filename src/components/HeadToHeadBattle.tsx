"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { RankedArenaBattle, RankedArenaProfile } from "@/lib/store";
import {
  Flame,
  Swords,
  Crown,
  Users,
  Award,
  Share2,
  Copy,
  Check,
  Sparkles,
  PlusCircle,
  RefreshCw,
  Download,
  Clock,
  AtSign,
  Trophy,
  Search,
  Radio,
  CheckCircle2,
} from "lucide-react";

interface Props {
  fighterA: RankedArenaProfile;
  fighterB: RankedArenaProfile;
  allProfiles: RankedArenaProfile[];
  activeBattles?: RankedArenaBattle[];
  battleHours: number;
  battleStartMs: number;
  onVote: (handle: string) => Promise<void>;
  votedHandles: Set<string>;
  votingHandle: string | null;
  onChangeMatchup: (
    handleA: string,
    handleB: string,
    hours?: number,
    forceUpdate?: boolean
  ) => Promise<void>;
  onExitToStudio: () => void;
}

const HOUR_PRESETS = [
  { hours: 1, label: "1 Hr" },
  { hours: 3, label: "3 Hrs" },
  { hours: 6, label: "6 Hrs" },
  { hours: 12, label: "12 Hrs" },
  { hours: 24, label: "24 Hrs (1d)" },
  { hours: 48, label: "48 Hrs (2d)" },
];

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

function loadCardImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function formatRemainingHoursCountdown(endMs: number, nowMs: number): {
  expired: boolean;
  label: string;
} {
  const diff = Math.max(0, endMs - nowMs);
  if (diff <= 0) {
    return { expired: true, label: "Time Up • Final Results Announced" };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    expired: false,
    label: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`,
  };
}

function cleanHandleInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 32);
}

export default function HeadToHeadBattle({
  fighterA,
  fighterB,
  allProfiles,
  activeBattles = [],
  battleHours,
  battleStartMs,
  onVote,
  votedHandles,
  votingHandle,
  onChangeMatchup,
  onExitToStudio,
}: Props) {
  const [customA, setCustomA] = useState(fighterA.handle);
  const [customB, setCustomB] = useState(fighterB.handle);
  const [customHoursInput, setCustomHoursInput] = useState<string>(
    String(battleHours || 12)
  );
  const [isSwitchingMatchup, setIsSwitchingMatchup] = useState(false);
  const [copiedBattleLink, setCopiedBattleLink] = useState(false);
  const [copiedTagChallenge, setCopiedTagChallenge] = useState(false);
  const [showMatchupPicker, setShowMatchupPicker] = useState(false);
  const [battleSyncNotice, setBattleSyncNotice] = useState<string | null>(null);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const winnerConfettiFiredRef = useRef(false);

  // Sync local inputs when parent fighter or hours props change
  useEffect(() => {
    setCustomA(fighterA.handle);
    setCustomB(fighterB.handle);
    setCustomHoursInput(String(battleHours || 12));
    winnerConfettiFiredRef.current = false;
  }, [fighterA.handle, fighterB.handle, battleHours, battleStartMs]);

  // Preload active fighter images and track load status per unique handle+image key
  useEffect(() => {
    [
      {
        key: `${fighterA.handle}:${fighterA.patakhaImageUrl}`,
        url: fighterA.patakhaImageUrl,
      },
      {
        key: `${fighterB.handle}:${fighterB.patakhaImageUrl}`,
        url: fighterB.patakhaImageUrl,
      },
    ].forEach(({ key, url }) => {
      const img = new Image();
      img.onload = () => setLoadedImages((prev) => ({ ...prev, [key]: true }));
      img.onerror = () => setLoadedImages((prev) => ({ ...prev, [key]: true }));
      img.src = url;
      if (img.complete) {
        setLoadedImages((prev) => ({ ...prev, [key]: true }));
      }
    });
  }, [
    fighterA.handle,
    fighterA.patakhaImageUrl,
    fighterB.handle,
    fighterB.patakhaImageUrl,
  ]);

  // Auto-sync live battle in DB when user types a new Challenger 1, Challenger 2, OR changes Battle Hours!
  useEffect(() => {
    if (!showMatchupPicker) return;
    const cleanA = cleanHandleInput(customA);
    const cleanB = cleanHandleInput(customB);
    if (!cleanA || !cleanB || cleanA === cleanB) return;

    const parsedHours = Math.min(
      48,
      Math.max(1, parseInt(customHoursInput, 10) || 12)
    );

    const alreadyMatching =
      cleanA === fighterA.handle.toLowerCase() &&
      cleanB === fighterB.handle.toLowerCase() &&
      parsedHours === battleHours;
    if (alreadyMatching) return;

    const timer = setTimeout(async () => {
      setIsSwitchingMatchup(true);
      try {
        await onChangeMatchup(cleanA, cleanB, parsedHours, true);
        setBattleSyncNotice(
          `Synced @${cleanA} vs @${cleanB} (${parsedHours}h) to live Arena DB!`
        );
        setTimeout(() => setBattleSyncNotice(null), 3200);
      } finally {
        setIsSwitchingMatchup(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [
    customA,
    customB,
    customHoursInput,
    fighterA.handle,
    fighterB.handle,
    battleHours,
    showMatchupPicker,
    onChangeMatchup,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sanitizedHours = Math.min(48, Math.max(1, Number(battleHours) || 12));
  const battleEndMs = battleStartMs + sanitizedHours * 3_600_000;
  const countdown = formatRemainingHoursCountdown(battleEndMs, nowMs);

  const totalBattleVotes = Math.max(1, fighterA.votes + fighterB.votes);
  const pctA = Math.round((fighterA.votes / totalBattleVotes) * 100);
  const pctB = 100 - pctA;

  const voteDiff = Math.abs(fighterA.votes - fighterB.votes);
  const leader =
    fighterA.votes > fighterB.votes
      ? fighterA
      : fighterB.votes > fighterA.votes
      ? fighterB
      : null;

  useEffect(() => {
    if (countdown.expired && !winnerConfettiFiredRef.current) {
      winnerConfettiFiredRef.current = true;
      try {
        confetti({
          particleCount: 90,
          spread: 85,
          origin: { y: 0.55 },
          colors: ["#FFE600", "#FF9F1C", "#EF233C", "#38BDF8"],
        });
      } catch {
        // ignore
      }
    }
  }, [countdown.expired]);

  const getBattleShareUrl = (hoursOverride = sanitizedHours) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?vs=${encodeURIComponent(
        fighterA.handle
      )},${encodeURIComponent(
        fighterB.handle
      )}&hours=${hoursOverride}&start=${battleStartMs}`;
    }
    return `http://localhost:3005/?vs=${encodeURIComponent(
      fighterA.handle
    )},${encodeURIComponent(
      fighterB.handle
    )}&hours=${hoursOverride}&start=${battleStartMs}`;
  };

  /**
   * Clean, formal share text without markdown asterisks or broken surrogate emojis.
   */
  const getTagChallengeMessage = (includeUrl = true) => {
    const url = getBattleShareUrl();
    if (countdown.expired) {
      const resultText = leader
        ? `Official Battle Result: @${leader.handle} won the ${sanitizedHours}-Hour Diwali Patakha 1v1 Battle against @${
            leader.handle === fighterA.handle
              ? fighterB.handle
              : fighterA.handle
          } (${fighterA.votes} vs ${fighterB.votes}) on Rate My Patakha.`
        : `Official Battle Result: @${fighterA.handle} and @${fighterB.handle} tied (${fighterA.votes} - ${fighterB.votes}) in their ${sanitizedHours}-Hour Diwali Patakha 1v1 Battle on Rate My Patakha.`;
      return includeUrl
        ? `${resultText} View final scoreboard: ${url}`
        : resultText;
    }

    const activeText = `Hey @${fighterB.handle}, I challenged you to a ${sanitizedHours}-Hour Diwali Patakha 1v1 Battle against @${fighterA.handle} on Rate My Patakha (Current Score: @${fighterA.handle} ${fighterA.votes} vs @${fighterB.handle} ${fighterB.votes}, Time Left: ${countdown.label}). Cast your vote here:`;
    return includeUrl ? `${activeText} ${url}` : activeText;
  };

  /**
   * Builds a 1080x1350 HD 1v1 VS Battle Poster Canvas
   */
  const buildBattlePosterCanvas = async (): Promise<HTMLCanvasElement> => {
    const [imgA, imgB] = await Promise.all([
      loadCardImage(fighterA.patakhaImageUrl),
      loadCardImage(fighterB.patakhaImageUrl),
    ]);

    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#380726");
    bgGrad.addColorStop(0.5, "#1E0314");
    bgGrad.addColorStop(1, "#11010B");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    drawRoundedRectPath(ctx, 20, 20, W - 40, H - 40, 42);
    ctx.strokeStyle = "#FFE600";
    ctx.lineWidth = 8;
    ctx.stroke();

    drawRoundedRectPath(ctx, 34, 34, W - 68, H - 68, 32);
    ctx.strokeStyle = "#FF7B00";
    ctx.lineWidth = 3;
    ctx.stroke();

    drawRoundedRectPath(ctx, W / 2 - 340, 56, 680, 56, 28);
    ctx.fillStyle = "#FFE600";
    ctx.fill();

    ctx.fillStyle = "#380828";
    ctx.font = "900 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      countdown.expired
        ? `${sanitizedHours}-HOUR BATTLE COMPLETED • OFFICIAL FINAL RESULT`
        : `${sanitizedHours}-HOUR PATAKHA 1v1 BATTLE • ${countdown.label.toUpperCase()}`,
      W / 2,
      84
    );

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 54px system-ui, -apple-system, sans-serif";
    ctx.fillText(`@${fighterA.handle}  vs  @${fighterB.handle}`, W / 2, 164);

    ctx.fillStyle = "#FDE68A";
    ctx.font = "800 25px system-ui, -apple-system, sans-serif";
    const statusLine = countdown.expired
      ? leader
        ? `WINNER: @${leader.handle.toUpperCase()} WON BY +${voteDiff} ${
            voteDiff === 1 ? "UPVOTE" : "UPVOTES"
          }!`
        : `OFFICIAL DRAW (${fighterA.votes} - ${fighterB.votes})!`
      : leader
      ? `@${leader.handle.toUpperCase()} LEADS BY +${voteDiff} ${
          voteDiff === 1 ? "UPVOTE" : "UPVOTES"
        }!`
      : `DEAD HEAT TIE (${fighterA.votes} - ${fighterB.votes}) • NEXT VOTE LEADS!`;
    ctx.fillText(statusLine, W / 2, 218);

    const cardW = 450;
    const cardH = 685;
    const cardY = 268;
    const leftCardX = 58;
    const rightCardX = W - 58 - cardW;

    const drawFighterPosterColumn = (
      x: number,
      y: number,
      fighter: RankedArenaProfile,
      img: HTMLImageElement | null,
      accentColor: string,
      isLeaderCard: boolean
    ) => {
      ctx.save();
      ctx.shadowColor = isLeaderCard
        ? "rgba(255, 230, 0, 0.35)"
        : "rgba(0, 0, 0, 0.65)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;

      drawRoundedRectPath(ctx, x, y, cardW, cardH, 32);
      ctx.fillStyle = isLeaderCard ? "#FFE600" : accentColor;
      ctx.fill();
      ctx.restore();

      drawRoundedRectPath(ctx, x + 8, y + 8, cardW - 16, cardH - 16, 26);
      const creamGrad = ctx.createLinearGradient(0, y, 0, y + cardH);
      creamGrad.addColorStop(0, "#FFFDF9");
      creamGrad.addColorStop(0.6, "#FFF6E3");
      creamGrad.addColorStop(1, "#FDE68A");
      ctx.fillStyle = creamGrad;
      ctx.fill();

      ctx.fillStyle = "#78350F";
      ctx.font = "900 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `RANK #${fighter.clanRank}/${fighter.clanTotalCount}`,
        x + 28,
        y + 42
      );

      ctx.textAlign = "right";
      ctx.fillStyle = "#B45309";
      ctx.fillText(`ALL #${fighter.globalRank}`, x + cardW - 28, y + 42);

      const artSize = cardW - 52;
      const artX = x + 26;
      const artY = y + 66;

      ctx.save();
      drawRoundedRectPath(ctx, artX, artY, artSize, artSize, 22);
      ctx.clip();
      ctx.fillStyle = "#E5C185";
      ctx.fillRect(artX, artY, artSize, artSize);

      if (img) {
        const iw = img.naturalWidth || 600;
        const ih = img.naturalHeight || 600;
        const scale = Math.max(artSize / iw, artSize / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(
          img,
          artX + (artSize - dw) / 2,
          artY + (artSize - dh) / 2,
          dw,
          dh
        );
      }
      ctx.restore();

      ctx.save();
      drawRoundedRectPath(ctx, artX, artY, artSize, artSize, 22);
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#853A12";
      ctx.font = "italic 700 24px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${fighter.patakhaName} Clan`,
        x + cardW / 2,
        artY + artSize + 38
      );

      const handleText = `@${fighter.handle}`;
      let hFontSize = 40;
      ctx.font = `900 ${hFontSize}px system-ui, -apple-system, sans-serif`;
      while (ctx.measureText(handleText).width > cardW - 48 && hFontSize > 22) {
        hFontSize -= 2;
        ctx.font = `900 ${hFontSize}px system-ui, -apple-system, sans-serif`;
      }
      ctx.fillStyle = "#1E0B02";
      ctx.fillText(handleText, x + cardW / 2, artY + artSize + 84);

      const pillW = cardW - 64;
      const pillH = 64;
      const pillX = x + 32;
      const pillY = y + cardH - 88;

      drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 20);
      ctx.fillStyle = "#2B051C";
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#FFE600";
      ctx.font = "900 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `${fighter.votes} VOTES`,
        x + cardW / 2,
        pillY + pillH / 2 + 2
      );
    };

    drawFighterPosterColumn(
      leftCardX,
      cardY,
      fighterA,
      imgA,
      "#FF9F1C",
      leader?.handle === fighterA.handle
    );

    drawFighterPosterColumn(
      rightCardX,
      cardY,
      fighterB,
      imgB,
      "#38BDF8",
      leader?.handle === fighterB.handle
    );

    const vsX = W / 2;
    const vsY = cardY + cardH / 2 - 20;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(vsX, vsY, 54, 0, Math.PI * 2);
    ctx.fillStyle = "#FFE600";
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#380726";
    ctx.stroke();

    ctx.fillStyle = "#2B051C";
    ctx.font = "900 42px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("VS", vsX, vsY + 2);
    ctx.restore();

    const barX = 72;
    const barY = cardY + cardH + 56;
    const barW = W - 144;
    const barH = 38;

    ctx.font = "900 24px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFE600";
    ctx.fillText(`@${fighterA.handle}: ${pctA}%`, barX, barY - 22);

    ctx.textAlign = "right";
    ctx.fillStyle = "#38BDF8";
    ctx.fillText(`${pctB}% :@${fighterB.handle}`, barX + barW, barY - 22);

    ctx.save();
    drawRoundedRectPath(ctx, barX, barY, barW, barH, 19);
    ctx.clip();

    const splitX = Math.max(40, Math.min(barW - 40, (barW * pctA) / 100));
    const leftGrad = ctx.createLinearGradient(barX, 0, barX + splitX, 0);
    leftGrad.addColorStop(0, "#FFE600");
    leftGrad.addColorStop(1, "#FF5400");
    ctx.fillStyle = leftGrad;
    ctx.fillRect(barX, barY, splitX, barH);

    const rightGrad = ctx.createLinearGradient(
      barX + splitX,
      0,
      barX + barW,
      0
    );
    rightGrad.addColorStop(0, "#6366F1");
    rightGrad.addColorStop(1, "#38BDF8");
    ctx.fillStyle = rightGrad;
    ctx.fillRect(barX + splitX, barY, barW - splitX, barH);
    ctx.restore();

    drawRoundedRectPath(ctx, barX, barY, barW, barH, 19);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    const ctaY = barY + 76;
    drawRoundedRectPath(ctx, 72, ctaY, W - 144, 132, 28);
    ctx.fillStyle = "rgba(20, 2, 14, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#FFE600";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFE600";
    ctx.font = "900 28px system-ui, -apple-system, sans-serif";
    ctx.fillText(
      countdown.expired && leader
        ? `@${leader.handle.toUpperCase()} CROWNED 1v1 PATAKHA CHAMPION!`
        : `TAG @${fighterA.handle.toUpperCase()} & @${fighterB.handle.toUpperCase()} • VOTE NOW!`,
      W / 2,
      ctaY + 46
    );

    ctx.fillStyle = "#FFFBEB";
    ctx.font = "700 21px monospace";
    ctx.fillText(
      `/?vs=${fighterA.handle},${fighterB.handle}&hours=${sanitizedHours}`,
      W / 2,
      ctaY + 94
    );

    return canvas;
  };

  const handleDownloadBattlePoster = async () => {
    setIsDownloadingPoster(true);
    try {
      const canvas = await buildBattlePosterCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${fighterA.handle}-vs-${fighterB.handle}-${sanitizedHours}h-battle.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to download 1v1 Battle Poster:", e);
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  const handleSharePosterAndBattleLink = async () => {
    setIsSharingPoster(true);
    try {
      const url = getBattleShareUrl();
      const text = getTagChallengeMessage(true);

      const canvas = await buildBattlePosterCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );

      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File(
          [blob],
          `${fighterA.handle}-vs-${fighterB.handle}-battle.png`,
          { type: "image/png" }
        );
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `@${fighterA.handle} vs @${fighterB.handle} • ${sanitizedHours}-Hour Patakha Battle`,
            text,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: `@${fighterA.handle} vs @${fighterB.handle} • ${sanitizedHours}-Hour Patakha Battle`,
          text: getTagChallengeMessage(false),
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      setCopiedTagChallenge(true);
      setTimeout(() => setCopiedTagChallenge(false), 2600);
      await handleDownloadBattlePoster();
    } catch {
      // user cancelled share
    } finally {
      setIsSharingPoster(false);
    }
  };

  const handleCopyBattleLink = async () => {
    try {
      await navigator.clipboard.writeText(getBattleShareUrl());
      setCopiedBattleLink(true);
      setTimeout(() => setCopiedBattleLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyTagChallenge = async () => {
    try {
      await navigator.clipboard.writeText(getTagChallengeMessage(true));
      setCopiedTagChallenge(true);
      setTimeout(() => setCopiedTagChallenge(false), 2600);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsAppBattle = () => {
    const text = getTagChallengeMessage(true);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleShareXTagBattle = () => {
    const url = getBattleShareUrl();
    const text = getTagChallengeMessage(false);
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleQuickHoursChange = async (newHours: number) => {
    const clamped = Math.min(48, Math.max(1, newHours));
    setCustomHoursInput(String(clamped));
    const a = cleanHandleInput(customA) || fighterA.handle;
    const b = cleanHandleInput(customB) || fighterB.handle;
    setIsSwitchingMatchup(true);
    try {
      await onChangeMatchup(a, b, clamped, true);
      setBattleSyncNotice(
        `Updated battle timer to ${clamped} ${
          clamped === 1 ? "hour" : "hours"
        } in Arena DB!`
      );
      setTimeout(() => setBattleSyncNotice(null), 3200);
    } finally {
      setIsSwitchingMatchup(false);
    }
  };

  const handleSelectQuickRival = async (rivalHandle: string) => {
    const cleanRival = cleanHandleInput(rivalHandle);
    const cleanA = cleanHandleInput(customA) || fighterA.handle;
    if (!cleanRival || cleanRival === cleanA) return;

    setCustomB(cleanRival);
    const parsedHours = Math.min(
      48,
      Math.max(1, parseInt(customHoursInput, 10) || 12)
    );
    setIsSwitchingMatchup(true);
    try {
      await onChangeMatchup(cleanA, cleanRival, parsedHours, true);
      setBattleSyncNotice(
        `Battle Live: @${cleanA} vs @${cleanRival} (${parsedHours}h) synced in DB!`
      );
      setTimeout(() => setBattleSyncNotice(null), 3200);
    } finally {
      setIsSwitchingMatchup(false);
    }
  };

  const handleApplyMatchup = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = cleanHandleInput(customA);
    const b = cleanHandleInput(customB);
    const parsedHours = Math.min(
      48,
      Math.max(1, parseInt(customHoursInput, 10) || 12)
    );
    if (!a || !b || a === b) return;
    setIsSwitchingMatchup(true);
    try {
      await onChangeMatchup(a, b, parsedHours, true);
      setShowMatchupPicker(false);
      setBattleSyncNotice(
        `Battle Started: @${a} vs @${b} (${parsedHours}h) is now LIVE for all visitors!`
      );
      setTimeout(() => setBattleSyncNotice(null), 4000);
    } finally {
      setIsSwitchingMatchup(false);
    }
  };

  const renderFighterCard = (
    fighter: RankedArenaProfile,
    side: "left" | "right"
  ) => {
    const isLeading = leader?.handle === fighter.handle;
    const hasVoted = votedHandles.has(fighter.handle.toLowerCase());
    const isVoting = votingHandle === fighter.handle;
    const loadKey = `${fighter.handle}:${fighter.patakhaImageUrl}`;
    const isLoaded = Boolean(loadedImages[loadKey]);

    return (
      <div
        key={`${side}-${fighter.handle}`}
        className={`rounded-[28px] p-1.5 transition-all ${
          isLeading
            ? "bg-gradient-to-b from-[#FFE600] via-[#FF9F1C] to-[#EF233C] shadow-[0_20px_50px_rgba(255,159,28,0.45)]"
            : "bg-[#3A0B27] border-2 border-[#FFE600]/65 shadow-2xl"
        }`}
      >
        <div className="rounded-[23px] bg-[#230417] p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                side === "left"
                  ? "bg-amber-400/20 text-[#FFE600] border border-[#FFE600]/40"
                  : "bg-sky-400/20 text-sky-300 border border-sky-400/40"
              }`}
            >
              {isLeading ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-[#FFE600] fill-[#FFE600]" />
                  <span>
                    {countdown.expired
                      ? `Winner (+${voteDiff})`
                      : `Leading by +${voteDiff}`}
                  </span>
                </>
              ) : leader ? (
                <span>
                  {countdown.expired
                    ? `Runner-Up (-${voteDiff})`
                    : `Trailing by -${voteDiff}`}
                </span>
              ) : (
                <span>Tied Matchup</span>
              )}
            </span>

            <span className="text-xs font-black text-amber-200 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#FFE600]" />
              Overall #{fighter.globalRank}
            </span>
          </div>

          <div className="rounded-[20px] bg-gradient-to-b from-[#FFFDF9] via-[#FFF6E3] to-[#FDE68A] p-2.5 border-2 border-[#B45309]">
            <div className="rounded-[14px] border border-[#F59E0B]/80 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#78350F]">
                <span className="truncate">
                  {fighter.patakhaEmoji} {fighter.patakhaName}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[#B45309] shrink-0">
                  <Users className="w-3 h-3" />#{fighter.clanRank}/
                  {fighter.clanTotalCount}
                </span>
              </div>

              <div className="relative aspect-square w-full rounded-xl overflow-hidden border-2 border-[#D97706] bg-gradient-to-b from-[#ECD2A6] to-[#C89D66] flex items-center justify-center">
                {(!isLoaded || isSwitchingMatchup) && (
                  <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#3A0B27] via-[#590D3B] to-[#260419] flex flex-col items-center justify-center p-4 text-center animate-pulse">
                    <Sparkles className="w-6 h-6 text-[#FFE600] animate-spin mb-1.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FFE600]">
                      Loading @{fighter.handle} ({fighter.patakhaName})...
                    </span>
                  </div>
                )}
                <img
                  key={loadKey}
                  src={fighter.patakhaImageUrl}
                  alt={fighter.patakhaName}
                  fetchPriority="high"
                  decoding="async"
                  onLoad={() =>
                    setLoadedImages((prev) => ({
                      ...prev,
                      [loadKey]: true,
                    }))
                  }
                  onError={() =>
                    setLoadedImages((prev) => ({
                      ...prev,
                      [loadKey]: true,
                    }))
                  }
                  className={`w-full h-full object-cover select-none pointer-events-none transition-opacity duration-200 ${
                    isLoaded && !isSwitchingMatchup ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              <div className="text-center pt-1">
                <div className="font-serif italic font-bold text-xs text-[#853A12] flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#D97706] fill-[#FFE600]" />
                  <span className="truncate">{fighter.patakhaName} Clan</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#1E0B02] truncate px-1">
                  @{fighter.handle}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isVoting || hasVoted}
            onClick={() => onVote(fighter.handle)}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base border-2 shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition ${
              hasVoted
                ? "bg-emerald-600 text-white border-emerald-300"
                : side === "left"
                ? "bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#2B051C] border-white"
                : "bg-gradient-to-r from-[#38BDF8] via-[#6366F1] to-[#EC4899] hover:brightness-110 text-white border-white"
            }`}
          >
            <Flame className="w-5 h-5 fill-current" />
            <span>
              {isVoting
                ? "Voting..."
                : hasVoted
                ? `Upvoted @${fighter.handle}`
                : `Vote @${fighter.handle}`}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-black/35 text-[#FFE600] text-xs">
              {fighter.votes}
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="max-w-5xl mx-auto space-y-5">
      <div className="bg-[#26051A]/95 border-2 border-[#FFE600] rounded-[32px] p-3.5 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-md space-y-5">
        {/* Top Battle Header Bar + Live Countdown Pill + DB Live Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#FFE600]/25">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE600] text-[#380828] text-xs font-black uppercase tracking-wider shadow">
              <Swords className="w-4 h-4" />
              <span>{sanitizedHours}-Hour 1v1 Battle</span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black ${
                countdown.expired
                  ? "bg-amber-500/20 border-[#FFE600] text-[#FFE600]"
                  : "bg-[#15020E] border-emerald-400/50 text-emerald-300"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#FFE600] animate-pulse" />
              <span>{countdown.label}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 text-[11px] font-black">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>LIVE IN ARENA DB</span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowMatchupPicker((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black inline-flex items-center gap-1.5 transition shadow ${
                showMatchupPicker
                  ? "bg-[#FFE600] text-[#380828] border-[#4A1238]"
                  : "bg-[#15020E] hover:bg-white/10 border-[#FFE600]/50 text-[#FFE600]"
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSwitchingMatchup ? "animate-spin" : ""
                }`}
              />
              <span>
                {showMatchupPicker
                  ? "Hide Rival Picker"
                  : "Change Rivals or Hours"}
              </span>
            </button>

            <button
              type="button"
              onClick={onExitToStudio}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-100 text-xs font-extrabold inline-flex items-center gap-1 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Create Card</span>
            </button>
          </div>
        </div>

        {/* Live Sync Confirmation Banner */}
        {battleSyncNotice && (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm text-emerald-200 font-black shadow-lg">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{battleSyncNotice}</span>
            </span>
            <span className="text-[11px] text-[#FFE600]">Countdown Active</span>
          </div>
        )}

        {/* Other Live Battles Switcher Bar */}
        {activeBattles.length > 0 && (
          <div className="bg-[#16020F]/95 border border-[#FFE600]/35 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] shrink-0 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Live Arena Battles ({activeBattles.length}):
            </span>
            {activeBattles.slice(0, 8).map((b) => {
              const isCurrent =
                (b.handleA === fighterA.handle &&
                  b.handleB === fighterB.handle) ||
                (b.handleA === fighterB.handle &&
                  b.handleB === fighterA.handle);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    onChangeMatchup(b.handleA, b.handleB, b.hours, false)
                  }
                  className={`shrink-0 px-3 py-1 rounded-xl text-xs font-extrabold border transition flex items-center gap-1.5 ${
                    isCurrent
                      ? "bg-[#FFE600] text-[#380828] border-[#4A1238] font-black shadow"
                      : "bg-[#240418] text-amber-100 border-[#FFE600]/30 hover:border-[#FFE600]"
                  }`}
                >
                  <span>⚔️</span>
                  <span>
                    @{b.handleA} ({b.fighterA.votes}) vs @{b.handleB} (
                    {b.fighterB.votes})
                  </span>
                  <span className="text-[10px] opacity-80">• {b.hours}h</span>
                </button>
              );
            })}
          </div>
        )}

        {/* COLLAPSIBLE CUSTOM RIVALRY & HOURS PICKER BOX */}
        {showMatchupPicker && (
          <form
            onSubmit={handleApplyMatchup}
            className="bg-gradient-to-b from-[#1B0312] to-[#13010C] border-2 border-[#FFE600] rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1.5">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>
                  Start New Battle or Change Hours (Syncs Live to Arena DB!)
                </span>
              </div>
              <span className="text-[11px] text-emerald-300 font-bold">
                {isSwitchingMatchup
                  ? "Syncing battle with database..."
                  : "Everyone on the site will see this battle live!"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-extrabold uppercase text-amber-200/85 mb-1">
                  Challenger 1 (Your @username)
                </label>
                <input
                  type="text"
                  value={customA}
                  onChange={(e) => setCustomA(e.target.value)}
                  placeholder="Type @yourhandle..."
                  list="arena-handles-list"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#26051A] border-2 border-[#FFE600]/60 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-[#FFE600]"
                />
              </div>

              <div className="sm:col-span-1 text-center font-black text-[#FFE600] text-sm sm:pt-4">
                VS
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-extrabold uppercase text-sky-300 mb-1">
                  Challenger 2 (Rival @username to tag)
                </label>
                <input
                  type="text"
                  value={customB}
                  onChange={(e) => setCustomB(e.target.value)}
                  placeholder="Type or search @friend..."
                  list="arena-handles-list"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#26051A] border-2 border-sky-400/60 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-extrabold uppercase text-emerald-300 mb-1">
                  Battle Hours (1–48 Hrs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={customHoursInput}
                  onChange={(e) => setCustomHoursInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#26051A] border-2 border-emerald-400/60 text-[#FFE600] font-black text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <datalist id="arena-handles-list">
              {allProfiles.slice(0, 40).map((p) => (
                <option key={p.handle} value={p.handle} />
              ))}
            </datalist>

            {/* Quick Tap Rival Selector Pills + Launch Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-extrabold uppercase text-sky-300 shrink-0">
                  Quick Pick Rival:
                </span>
                {allProfiles
                  .filter(
                    (p) =>
                      p.handle.toLowerCase() !== cleanHandleInput(customA)
                  )
                  .slice(0, 6)
                  .map((p) => (
                    <button
                      key={p.handle}
                      type="button"
                      onClick={() => handleSelectQuickRival(p.handle)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                        fighterB.handle.toLowerCase() ===
                        p.handle.toLowerCase()
                          ? "bg-sky-400 text-[#1E0314] border-white font-black shadow"
                          : "bg-[#26051A] text-amber-100 border-sky-400/35 hover:border-sky-300"
                      }`}
                    >
                      @{p.handle}
                    </button>
                  ))}
              </div>

              <button
                type="submit"
                disabled={isSwitchingMatchup}
                className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-lg transition"
              >
                {isSwitchingMatchup
                  ? "Syncing Battle..."
                  : `Launch @${cleanHandleInput(customA) || "you"} vs @${
                      cleanHandleInput(customB) || "rival"
                    } (${customHoursInput || 12}h)`}
              </button>
            </div>
          </form>
        )}

        {/* OFFICIAL WINNER ANNOUNCEMENT BANNER WHEN TIME COMPLETES */}
        {countdown.expired && (
          <div className="bg-gradient-to-r from-[#4A1238] via-[#6E1027] to-[#4A1238] border-2 border-[#FFE600] rounded-3xl p-4 sm:p-6 text-center space-y-3 shadow-[0_0_40px_rgba(255,230,0,0.35)]">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFE600] text-[#380828] text-xs font-black uppercase tracking-wider">
              <Trophy className="w-4 h-4 fill-current" />
              Official {sanitizedHours}-Hour Battle Result Announced!
            </div>

            {leader ? (
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-4xl font-black text-white">
                  Winner: <span className="gold-shimmer">@{leader.handle}</span>!
                </h3>
                <p className="text-xs sm:text-sm text-amber-100 font-bold">
                  @{leader.handle} ({leader.patakhaName}) defeated @
                  {leader.handle === fighterA.handle
                    ? fighterB.handle
                    : fighterA.handle}{" "}
                  by{" "}
                  <strong className="text-[#FFE600]">
                    +{voteDiff} {voteDiff === 1 ? "upvote" : "upvotes"}
                  </strong>{" "}
                  ({fighterA.votes} – {fighterB.votes})!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Official Tie Between @{fighterA.handle} & @{fighterB.handle}!
                </h3>
                <p className="text-xs sm:text-sm text-amber-100 font-bold">
                  Both contenders finished at {fighterA.votes} votes each! Start
                  a rematch below to break the tie.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadBattlePoster}
                className="px-4 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs inline-flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Winner Poster</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeMatchup(
                    fighterA.handle,
                    fighterB.handle,
                    sanitizedHours,
                    true
                  )
                }
                className="px-4 py-2 rounded-xl bg-[#15020E] hover:bg-white/15 text-[#FFE600] border border-[#FFE600]/60 font-black text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Start {sanitizedHours}-Hour Rematch</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Custom Hours Selector Bar (1 to 48 Hours) */}
        <div className="bg-[#16020F]/90 border border-[#FFE600]/35 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-100">
            <Clock className="w-4 h-4 text-[#FFE600] shrink-0" />
            <span>Battle Duration Presets (Hours — Max 2 Days):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {HOUR_PRESETS.map((preset) => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => handleQuickHoursChange(preset.hours)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition border ${
                  sanitizedHours === preset.hours
                    ? "bg-[#FFE600] text-[#380828] border-[#4A1238] shadow"
                    : "bg-[#240418] text-amber-200 border-[#FFE600]/30 hover:border-[#FFE600]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Headline & Live Tug-of-War Power Bar */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-4xl font-black text-white">
            <span className="text-[#FFE600]">@{fighterA.handle}</span>{" "}
            <span className="text-amber-200/70 text-lg sm:text-2xl mx-1">
              vs
            </span>{" "}
            <span className="text-sky-300">@{fighterB.handle}</span>
          </h2>

          <p className="text-xs sm:text-sm font-bold text-amber-100">
            {leader ? (
              <>
                <strong className="text-[#FFE600]">@{leader.handle}</strong>{" "}
                {countdown.expired ? "won" : "leads"} this {sanitizedHours}
                -hour battle by{" "}
                <strong className="text-[#FFE600]">
                  {voteDiff} {voteDiff === 1 ? "upvote" : "upvotes"}
                </strong>
                !
              </>
            ) : (
              <>
                Dead Heat Tie ({fighterA.votes} – {fighterB.votes})! The next
                upvote takes the lead!
              </>
            )}
          </p>

          <div className="max-w-2xl mx-auto pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-[#FFE600]">
                @{fighterA.handle}: {fighterA.votes} votes ({pctA}%)
              </span>
              <span className="text-sky-300">
                ({pctB}%) {fighterB.votes} votes :@{fighterB.handle}
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-black/70 p-0.5 border-2 border-[#FFE600]/50 flex overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#EF233C] transition-all duration-500 rounded-l-full"
                style={{ width: `${pctA}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-[#EC4899] via-[#6366F1] to-[#38BDF8] transition-all duration-500 rounded-r-full"
                style={{ width: `${pctB}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2-Column Side-by-Side Fighter Cards */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 sm:gap-6 items-center">
          <div className="md:col-span-5">
            {renderFighterCard(fighterA, "left")}
          </div>

          <div className="md:col-span-1 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#FFE600] via-[#FF7B00] to-[#EF233C] border-2 border-white text-[#2B051C] font-black text-base sm:text-lg flex items-center justify-center shadow-[0_0_25px_rgba(255,230,0,0.6)] rotate-3">
              VS
            </div>
          </div>

          <div className="md:col-span-5">
            {renderFighterCard(fighterB, "right")}
          </div>
        </div>

        {/* Primary 1v1 Battle Poster Export + Share Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSharePosterAndBattleLink}
            disabled={isSharingPoster}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isSharingPoster
                ? "Generating 1v1 Poster..."
                : "Share 1v1 Poster + Tag Rival"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBattlePoster}
            disabled={isDownloadingPoster}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl flex items-center justify-center gap-2 active:scale-[0.99] transition"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {isDownloadingPoster
                ? "Saving 1v1 Poster..."
                : "Download 1v1 VS Poster PNG"}
            </span>
          </button>
        </div>

        {/* Tag Your Rival Challenge Box */}
        <div className="bg-[#15020E] border-2 border-[#FFE600]/55 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FFE600]">
              <AtSign className="w-4 h-4 text-emerald-400" />
              Tag @{fighterB.handle} to Play This {sanitizedHours}-Hour Battle!
            </div>
            <span className="text-[11px] text-amber-200/80 font-semibold">
              Winner is announced automatically when the {sanitizedHours}h timer
              finishes!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyTagChallenge}
              className="py-2.5 px-3 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs inline-flex items-center justify-center gap-1.5 transition shadow"
            >
              {copiedTagChallenge ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800" />
                  <span>Tag Message Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy @Tag Challenge Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsAppBattle}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 transition shadow"
            >
              <span>Tag on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShareXTagBattle}
              className="py-2.5 px-3 rounded-xl bg-[#2B061D] hover:bg-[#3B0A29] border border-[#FFE600]/45 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 transition shadow"
            >
              <Share2 className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Tag @{fighterB.handle} on X (x.com)</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-[11px] text-amber-100/80 font-mono truncate w-full sm:w-auto">
              {getBattleShareUrl()}
            </div>
            <button
              type="button"
              onClick={handleCopyBattleLink}
              className="w-full sm:w-auto shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFE600] text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
            >
              {copiedBattleLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Raw Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}