"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArenaSnapshot,
  PatakhaClanSummary,
  RankedArenaProfile,
} from "@/lib/store";
import {
  Camera,
  Download,
  Sparkles,
  ZoomIn,
  Move,
  RotateCcw,
  Share2,
  Award,
  Check,
  Copy,
  Smartphone,
  RectangleVertical,
  Type,
  Palette,
  Shuffle,
  Flame,
  TrendingUp,
  Users,
  CheckCircle2,
  Lock,
  Info,
} from "lucide-react";

interface Props {
  clans: PatakhaClanSummary[];
  activeProfile: RankedArenaProfile | null;
  onProfileSynced: (
    profile: RankedArenaProfile,
    snapshot: ArenaSnapshot
  ) => void;
  onVote: (handle: string) => Promise<void>;
  hasVoted?: boolean;
  isVoting?: boolean;
}

function getCreatorTokenForHandle(handle: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("patakha_creator_tokens_v1");
    if (!raw) return "";
    const map = JSON.parse(raw) as Record<string, string>;
    return map[handle.toLowerCase()] || "";
  } catch {
    return "";
  }
}

function saveCreatorTokenForHandle(handle: string, token: string) {
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

/**
 * Downscales large 12MP-48MP smartphone photos to max 1600px on intake so mobile
 * browsers never run out of GPU/RAM memory during 60fps canvas drag & zoom.
 */
async function downscaleUploadedImageFile(
  file: File,
  maxDim = 1600
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const rawImg = new Image();
    rawImg.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const w = rawImg.naturalWidth || 800;
      const h = rawImg.naturalHeight || 800;
      if (w <= maxDim && h <= maxDim) {
        resolve(rawImg);
        return;
      }
      const scale = maxDim / Math.max(w, h);
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        resolve(rawImg);
        return;
      }
      ctx.drawImage(rawImg, 0, 0, targetW, targetH);
      const scaledImg = new Image();
      scaledImg.onload = () => resolve(scaledImg);
      scaledImg.onerror = () => resolve(rawImg);
      scaledImg.src = offscreen.toDataURL("image/jpeg", 0.92);
    };
    rawImg.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    rawImg.src = objectUrl;
  });
}

type FrameStyleId =
  | "engraved-wood"
  | "rajasthani-arch"
  | "marigold-circle"
  | "golden-polaroid";

type AspectMode = "portrait-4-5" | "story-9-16";
type MobileControlTab = "frame" | "card" | "text";

interface FrameOption {
  id: FrameStyleId;
  name: string;
  subtitle: string;
  badge: string;
  previewGradient: string;
}

const FRAME_OPTIONS: FrameOption[] = [
  {
    id: "engraved-wood",
    name: "Engraved Oak Wood",
    subtitle: "Carved Timber, Hanging Lanterns & Lotus Diya",
    badge: "🪵 Wooden Plaque",
    previewGradient: "from-[#E6BA85] via-[#C89356] to-[#8C5828]",
  },
  {
    id: "rajasthani-arch",
    name: "Crimson Palace Jharokha",
    subtitle: "Scalloped Blue Arch, Mogra Malas & 3 Diyas",
    badge: "🏛️ Royal Arch",
    previewGradient: "from-[#C81E2B] via-[#E11D48] to-[#38BDF8]",
  },
  {
    id: "marigold-circle",
    name: "Marigold & Clay Diya Ring",
    subtitle: "Folk Triangle Ring, Toran & Terracotta Diya",
    badge: "🌼 Festive Circle",
    previewGradient: "from-[#FFAE00] via-[#FF7B00] to-[#78290F]",
  },
  {
    id: "golden-polaroid",
    name: "Golden Cream Polaroid",
    subtitle: "Warm Cream Editorial & Double Gold Foil",
    badge: "✨ Classic Card",
    previewGradient: "from-[#FFFDF7] via-[#FDE68A] to-[#B45309]",
  },
];

const VIBE_CAPTION_PRESETS = [
  "HAPPY DIWALI",
  "SHUBH DIWALI",
  "MY RANGOLI ART",
  "CERTIFIED PATAKHA",
  "FESTIVAL OF LIGHTS",
];

function drawRoundedRect(
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

function drawRealisticWoodPlaque(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
) {
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, "#E7BE8B");
  baseGrad.addColorStop(0.35, "#D9A86E");
  baseGrad.addColorStop(0.7, "#C89255");
  baseGrad.addColorStop(1, "#DCAC74");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for (let y = 0; y < H; y += 5) {
    const wave = Math.sin(y * 0.035) * 8;
    ctx.strokeStyle =
      y % 15 === 0
        ? "rgba(92, 48, 16, 0.16)"
        : y % 10 === 0
        ? "rgba(255, 238, 208, 0.18)"
        : "rgba(120, 64, 22, 0.09)";
    ctx.lineWidth = y % 15 === 0 ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.33, y + wave, W * 0.66, y - wave, W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 243, 219, 0.7)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  ctx.strokeStyle = "rgba(74, 37, 11, 0.55)";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  ctx.strokeStyle = "#4A250B";
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, 34, 34, W - 68, H - 68, 22);
  ctx.stroke();
}

function drawWoodEngravedMotifs(
  ctx: CanvasRenderingContext2D,
  W: number,
  topY: number,
  footerY: number
) {
  const burnColor = "#3B1B06";
  ctx.save();
  ctx.strokeStyle = burnColor;
  ctx.fillStyle = burnColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const drops = [
    { x: 110, len: 92, type: "lantern" },
    { x: 195, len: 68, type: "star" },
    { x: 280, len: 82, type: "lantern" },
    { x: W - 280, len: 82, type: "lantern" },
    { x: W - 195, len: 68, type: "star" },
    { x: W - 110, len: 92, type: "lantern" },
  ];

  drops.forEach((d) => {
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(d.x, topY);
    ctx.lineTo(d.x, topY + d.len);
    ctx.stroke();

    if (d.type === "lantern") {
      const ly = topY + d.len;
      ctx.beginPath();
      ctx.moveTo(d.x - 14, ly + 10);
      ctx.lineTo(d.x, ly);
      ctx.lineTo(d.x + 14, ly + 10);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeRect(d.x - 11, ly + 10, 22, 24);
      ctx.beginPath();
      ctx.arc(d.x, ly + 22, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const sy = topY + d.len + 8;
      ctx.lineWidth = 2.5;
      for (let a = 0; a < 4; a++) {
        const rad = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(d.x - Math.cos(rad) * 10, sy - Math.sin(rad) * 10);
        ctx.lineTo(d.x + Math.cos(rad) * 10, sy + Math.sin(rad) * 10);
        ctx.stroke();
      }
    }
  });

  const cx = W / 2;
  const cy = footerY;

  [-220, 220].forEach((offsetX) => {
    const sx = cx + offsetX;
    const sy = cy - 10;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy);
    ctx.lineTo(sx + 18, sy);
    ctx.moveTo(sx, sy - 18);
    ctx.lineTo(sx, sy + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 68);
  ctx.quadraticCurveTo(cx + 18, cy - 44, cx, cy - 26);
  ctx.quadraticCurveTo(cx - 18, cy - 44, cx, cy - 68);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 72, cy - 22);
  ctx.quadraticCurveTo(cx, cy + 36, cx + 72, cy - 22);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = -54; i <= 42; i += 16) {
    ctx.moveTo(cx + i, cy - 14);
    ctx.lineTo(cx + i + 8, cy - 4);
    ctx.lineTo(cx + i + 16, cy - 14);
  }
  ctx.stroke();

  [-1, 1].forEach((dir) => {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 48, cy + 4);
    ctx.quadraticCurveTo(
      cx + dir * 115,
      cy - 26,
      cx + dir * 126,
      cy - 4
    );
    ctx.quadraticCurveTo(
      cx + dir * 95,
      cy + 22,
      cx + dir * 32,
      cy + 14
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + dir * 38, cy + 12);
    ctx.quadraticCurveTo(
      cx + dir * 96,
      cy + 4,
      cx + dir * 108,
      cy + 20
    );
    ctx.quadraticCurveTo(
      cx + dir * 72,
      cy + 32,
      cx + dir * 20,
      cy + 18
    );
    ctx.stroke();
  });

  ctx.restore();
}

function traceRajasthaniArchPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const cx = x + w / 2;
  const archBaseY = y + 170;
  const bottomArchY = y + h - 135;

  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.quadraticCurveTo(cx + w * 0.11, y + 36, cx + w * 0.22, y + 26);
  ctx.quadraticCurveTo(cx + w * 0.32, y + 74, cx + w * 0.41, y + 78);
  ctx.quadraticCurveTo(x + w - 12, y + 122, x + w, archBaseY);
  ctx.lineTo(x + w, bottomArchY);
  ctx.quadraticCurveTo(x + w - 18, y + h - 75, cx + w * 0.34, y + h - 62);
  ctx.quadraticCurveTo(cx + w * 0.2, y + h - 15, cx, y + h);
  ctx.quadraticCurveTo(cx - w * 0.2, y + h - 15, cx - w * 0.34, y + h - 62);
  ctx.quadraticCurveTo(x + 18, y + h - 75, x, bottomArchY);
  ctx.lineTo(x, archBaseY);
  ctx.quadraticCurveTo(x + 12, y + 122, cx - w * 0.41, y + 78);
  ctx.quadraticCurveTo(cx - w * 0.32, y + 74, cx - w * 0.22, y + 26);
  ctx.quadraticCurveTo(cx - w * 0.11, y + 36, cx, y);
  ctx.closePath();
}

function drawRajasthaniColorfulDiya(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bowlColor: string,
  scale = 1
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FEF08A";
  ctx.beginPath();
  ctx.arc(0, -34, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#F97316";
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.quadraticCurveTo(22, -30, 0, -10);
  ctx.quadraticCurveTo(-22, -30, 0, -60);
  ctx.fill();

  ctx.fillStyle = "#EA580C";
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.quadraticCurveTo(11, -26, 0, -12);
  ctx.quadraticCurveTo(-11, -26, 0, -44);
  ctx.fill();

  ctx.fillStyle = bowlColor;
  ctx.beginPath();
  ctx.moveTo(-48, -10);
  ctx.quadraticCurveTo(0, 38, 48, -10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = -36; x <= 24; x += 12) {
    ctx.moveTo(x, -6);
    ctx.quadraticCurveTo(x + 6, 8, x + 12, -6);
  }
  ctx.stroke();

  ctx.restore();
}

function drawTerracottaMandalaDiya(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const shadow = ctx.createRadialGradient(0, 48, 10, 0, 48, 130);
  shadow.addColorStop(0, "rgba(69, 26, 3, 0.55)");
  shadow.addColorStop(1, "rgba(69, 26, 3, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 48, 125, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  const flameGlow = ctx.createRadialGradient(0, -76, 4, 0, -76, 68);
  flameGlow.addColorStop(0, "rgba(255, 247, 178, 1)");
  flameGlow.addColorStop(0.5, "rgba(255, 136, 0, 0.55)");
  flameGlow.addColorStop(1, "rgba(255, 136, 0, 0)");
  ctx.fillStyle = flameGlow;
  ctx.beginPath();
  ctx.arc(0, -76, 68, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF8800";
  ctx.beginPath();
  ctx.moveTo(0, -124);
  ctx.quadraticCurveTo(30, -76, 0, -34);
  ctx.quadraticCurveTo(-30, -76, 0, -124);
  ctx.fill();

  ctx.fillStyle = "#FFF7B2";
  ctx.beginPath();
  ctx.moveTo(0, -104);
  ctx.quadraticCurveTo(15, -72, 0, -40);
  ctx.quadraticCurveTo(-15, -72, 0, -104);
  ctx.fill();

  ctx.strokeStyle = "#290F02";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(0, -22);
  ctx.stroke();

  const oilGrad = ctx.createRadialGradient(0, -18, 10, 0, -18, 120);
  oilGrad.addColorStop(0, "#FFE066");
  oilGrad.addColorStop(0.6, "#D97706");
  oilGrad.addColorStop(1, "#78350F");
  ctx.fillStyle = oilGrad;
  ctx.beginPath();
  ctx.ellipse(0, -18, 122, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#92400E";
  ctx.lineWidth = 5;
  ctx.stroke();

  const clayGrad = ctx.createLinearGradient(0, -35, 0, 52);
  clayGrad.addColorStop(0, "#9A4B1A");
  clayGrad.addColorStop(0.5, "#5C2609");
  clayGrad.addColorStop(1, "#2F1103");
  ctx.fillStyle = clayGrad;
  ctx.beginPath();
  ctx.moveTo(-124, -18);
  ctx.quadraticCurveTo(-60, 8, 0, -32);
  ctx.quadraticCurveTo(60, 8, 124, -18);
  ctx.bezierCurveTo(112, 58, -112, 58, -124, -18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#B45309";
  ctx.lineWidth = 3;
  ctx.stroke();

  [
    { x: 0, y: 15, r: 22 },
    { x: -58, y: 18, r: 14 },
    { x: 58, y: 18, r: 14 },
  ].forEach((m) => {
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.restore();
}

export default function DiwaliSnapFrameStudio({
  clans,
  activeProfile,
  onProfileSynced,
  onVote,
  hasVoted = false,
  isVoting = false,
}: Props) {
  const [mobileTab, setMobileTab] = useState<MobileControlTab>("frame");
  const [selectedFrame, setSelectedFrame] =
    useState<FrameStyleId>("engraved-wood");
  const [aspectMode, setAspectMode] = useState<AspectMode>("portrait-4-5");
  const [username, setUsername] = useState(
    activeProfile?.handle || "pragmaticengineer"
  );
  const [vibeTag, setVibeTag] = useState(VIBE_CAPTION_PRESETS[0]);
  const [selectedPatakhaId, setSelectedPatakhaId] = useState<string>(
    activeProfile?.patakhaId || clans[0]?.patakhaId || "murga-bomb"
  );

  const [dbExistingProfile, setDbExistingProfile] =
    useState<RankedArenaProfile | null>(activeProfile);

  const [cardCorner, setCardCorner] = useState<"bottom-right" | "bottom-left">(
    "bottom-right"
  );

  const [loadedUserImg, setLoadedUserImg] = useState<HTMLImageElement | null>(
    null
  );
  const [loadedStickerImg, setLoadedStickerImg] =
    useState<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1.08);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const [isSyncingArena, setIsSyncingArena] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharingPoster, setIsSharingPoster] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setUsername(activeProfile.handle);
      setSelectedPatakhaId(activeProfile.patakhaId);
      setDbExistingProfile(activeProfile);
    }
  }, [activeProfile]);

  const pickRandomPatakhaId = useCallback(
    (excludeId?: string): string => {
      if (clans.length === 0) return "murga-bomb";
      if (clans.length === 1) return clans[0].patakhaId;
      const pool = excludeId
        ? clans.filter((c) => c.patakhaId !== excludeId)
        : clans;
      const chosen = pool[Math.floor(Math.random() * pool.length)] || clans[0];
      return chosen.patakhaId;
    },
    [clans]
  );

  useEffect(() => {
    const clean = username.trim().replace(/^@/, "");
    if (!clean) {
      setDbExistingProfile(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/profile?u=${encodeURIComponent(clean)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.exists && data.profile) {
          setDbExistingProfile(data.profile);
          setSelectedPatakhaId(data.profile.patakhaId);
        } else {
          setDbExistingProfile(null);
        }
      } catch {
        // ignore
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [username]);

  const syncUserWithLeaderboard = useCallback(
    async (
      rawHandle: string,
      cardId: string,
      allowCardUpdate = false
    ) => {
      const clean = rawHandle.trim().replace(/^@/, "");
      if (!clean) return;
      setIsSyncingArena(true);
      try {
        const creatorToken = getCreatorTokenForHandle(clean);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: clean,
            patakhaId: cardId,
            allowCardUpdate,
            creatorToken,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.creatorToken) {
          saveCreatorTokenForHandle(clean, data.creatorToken);
        }
        if (data.profile && data.snapshot) {
          setDbExistingProfile(data.profile);
          setSelectedPatakhaId(data.profile.patakhaId);
          onProfileSynced(data.profile, data.snapshot);
        }
      } catch {
        // ignore
      } finally {
        setIsSyncingArena(false);
      }
    },
    [onProfileSynced]
  );

  useEffect(() => {
    if (
      clans.length > 0 &&
      !clans.some((c) => c.patakhaId === selectedPatakhaId)
    ) {
      setSelectedPatakhaId(clans[0].patakhaId);
    }
  }, [clans, selectedPatakhaId]);

  useEffect(() => {
    const activeClan =
      clans.find((c) => c.patakhaId === selectedPatakhaId) || clans[0];
    if (!activeClan) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedStickerImg(img);
    img.onerror = () => setLoadedStickerImg(null);
    img.src = activeClan.imageUrl;
  }, [clans, selectedPatakhaId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const scaledImg = await downscaleUploadedImageFile(file, 1600);
      setLoadedUserImg(scaledImg);
      setZoom(1.05);
      setPan({ x: 0, y: 0 });

      const cardIdToUse = dbExistingProfile
        ? dbExistingProfile.patakhaId
        : pickRandomPatakhaId();
      setSelectedPatakhaId(cardIdToUse);
      syncUserWithLeaderboard(username, cardIdToUse, false);
    } catch (err) {
      console.error("Failed to process uploaded image:", err);
    }
  };

  const cleanUserHandle =
    username.trim().replace(/^@/, "").replace(/[^a-z0-9_-]/gi, "") ||
    "creator";

  const isLockedByAnotherUser =
    Boolean(dbExistingProfile) && !getCreatorTokenForHandle(cleanUserHandle);

  const handleShuffleRandomCard = () => {
    const nextCardId = pickRandomPatakhaId(selectedPatakhaId);
    setSelectedPatakhaId(nextCardId);
    if (!isLockedByAnotherUser) {
      syncUserWithLeaderboard(username, nextCardId, true);
    }
  };

  const handleSelectSpecificCard = (cardId: string) => {
    setSelectedPatakhaId(cardId);
    if (!isLockedByAnotherUser) {
      syncUserWithLeaderboard(username, cardId, true);
    }
  };

  const activeClan =
    clans.find((c) => c.patakhaId === selectedPatakhaId) || clans[0];

  const syncedProfile =
    dbExistingProfile &&
    dbExistingProfile.handle.toLowerCase() === cleanUserHandle.toLowerCase()
      ? dbExistingProfile
      : activeProfile &&
        activeProfile.handle.toLowerCase() === cleanUserHandle.toLowerCase()
      ? activeProfile
      : null;

  const displayClanRank = syncedProfile ? syncedProfile.clanRank : 1;
  const displayClanTotal = syncedProfile
    ? syncedProfile.clanTotalCount
    : activeClan?.memberCount || 1;
  const displayGlobalRank = syncedProfile ? syncedProfile.globalRank : 1;
  const displayVotes = syncedProfile ? syncedProfile.votes : 10;

  const drawUserPhotoInsideClip = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      photoX: number,
      photoY: number,
      photoW: number,
      photoH: number
    ) => {
      if (loadedUserImg) {
        const imgW = loadedUserImg.naturalWidth || 800;
        const imgH = loadedUserImg.naturalHeight || 800;
        const baseScale = Math.max(photoW / imgW, photoH / imgH);
        const finalScale = baseScale * zoom;
        const drawW = imgW * finalScale;
        const drawH = imgH * finalScale;
        const centerX = photoX + photoW / 2 + pan.x;
        const centerY = photoY + photoH / 2 + pan.y;

        ctx.drawImage(
          loadedUserImg,
          centerX - drawW / 2,
          centerY - drawH / 2,
          drawW,
          drawH
        );
      } else {
        const phGrad = ctx.createLinearGradient(
          photoX,
          photoY,
          photoX + photoW,
          photoY + photoH
        );
        phGrad.addColorStop(0, "#380927");
        phGrad.addColorStop(0.5, "#590D3B");
        phGrad.addColorStop(1, "#240417");
        ctx.fillStyle = phGrad;
        ctx.fillRect(photoX, photoY, photoW, photoH);

        const midX = photoX + photoW / 2;
        const midY = photoY + photoH / 2 - 20;

        ctx.fillStyle = "rgba(255, 230, 0, 0.14)";
        ctx.strokeStyle = "#FFE600";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(midX, midY - 30, 84, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = "72px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("📸", midX, midY - 30);

        ctx.fillStyle = "#FFFBEB";
        ctx.font = "900 32px system-ui, -apple-system, sans-serif";
        ctx.fillText("UPLOAD PHOTO, RANGOLI OR DIYA SNAP", midX, midY + 95);

        ctx.fillStyle = "#FDE68A";
        ctx.font = "600 22px system-ui, -apple-system, sans-serif";
        ctx.fillText(
          "Download Unlimited Times • 100% Private In-Browser",
          midX,
          midY + 138
        );
      }
    },
    [loadedUserImg, zoom, pan]
  );

  const drawOverlappingPatakhaMiniBox = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      boxX: number,
      boxY: number,
      boxW: number,
      boxH: number,
      tiltDeg: number
    ) => {
      if (!activeClan) return;

      ctx.save();
      ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
      ctx.rotate((tiltDeg * Math.PI) / 180);

      ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 10;

      drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 22);
      ctx.fillStyle = "#2A061B";
      ctx.fill();
      ctx.strokeStyle = "#FFE600";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
      ctx.rotate((tiltDeg * Math.PI) / 180);

      drawRoundedRect(
        ctx,
        -boxW / 2 + 7,
        -boxH / 2 + 7,
        boxW - 14,
        boxH - 14,
        16
      );
      ctx.fillStyle = "#FFF6E3";
      ctx.fill();

      ctx.fillStyle = "#78350F";
      ctx.font = "900 13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `🧨 RANK #${displayClanRank} OF ${displayClanTotal}`,
        0,
        -boxH / 2 + 22
      );

      const imgBoxSize = boxW - 28;
      const imgBoxX = -imgBoxSize / 2;
      const imgBoxY = -boxH / 2 + 34;

      ctx.save();
      drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxSize, imgBoxSize, 12);
      ctx.clip();
      ctx.fillStyle = "#E5C185";
      ctx.fillRect(imgBoxX, imgBoxY, imgBoxSize, imgBoxSize);

      if (loadedStickerImg) {
        const sw = loadedStickerImg.naturalWidth || 400;
        const sh = loadedStickerImg.naturalHeight || 400;
        const sScale = Math.max(imgBoxSize / sw, imgBoxSize / sh);
        const dw = sw * sScale;
        const dh = sh * sScale;
        ctx.drawImage(
          loadedStickerImg,
          imgBoxX + (imgBoxSize - dw) / 2,
          imgBoxY + (imgBoxSize - dh) / 2,
          dw,
          dh
        );
      }
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, imgBoxX, imgBoxY, imgBoxSize, imgBoxSize, 12);
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#1E0B02";
      ctx.font = "900 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${activeClan.emoji} ${activeClan.name.slice(0, 14).toUpperCase()}`,
        0,
        boxH / 2 - 20
      );
      ctx.restore();
    },
    [activeClan, displayClanRank, displayClanTotal, loadedStickerImg]
  );

  const renderCompositeToCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      const W = 1080;
      const H = aspectMode === "story-9-16" ? 1920 : 1350;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, W, H);
      const isStory = aspectMode === "story-9-16";
      const cleanHandle = username.trim()
        ? username.trim().startsWith("@")
          ? username.trim()
          : `@${username.trim()}`
        : "@creator";

      if (selectedFrame === "engraved-wood") {
        drawRealisticWoodPlaque(ctx, W, H);

        const photoX = 86;
        const photoY = isStory ? 235 : 175;
        const photoW = W - 172;
        const photoH = isStory ? H - 690 : H - 510;

        ctx.fillStyle = "#3B1B06";
        ctx.font = "900 44px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`— ${vibeTag.toUpperCase()} —`, W / 2, photoY - 82);

        ctx.font = "800 22px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#5C2C0C";
        ctx.fillText(
          `${activeClan?.emoji || "🧨"} ${(
            activeClan?.name || "PATAKHA"
          ).toUpperCase()} • RANK #${displayClanRank} OF ${displayClanTotal} • 🔥 ${displayVotes} VOTES`,
          W / 2,
          photoY - 34
        );

        ctx.save();
        drawRoundedRect(ctx, photoX - 6, photoY - 6, photoW + 12, photoH + 12, 26);
        ctx.fillStyle = "#4A250B";
        ctx.fill();
        ctx.restore();

        ctx.save();
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 22);
        ctx.clip();
        drawUserPhotoInsideClip(ctx, photoX, photoY, photoW, photoH);
        ctx.restore();

        ctx.save();
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 22);
        ctx.strokeStyle = "#3B1B06";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        const boxW = isStory ? 255 : 232;
        const boxH = isStory ? 300 : 274;
        const boxX =
          cardCorner === "bottom-right"
            ? photoX + photoW - boxW - 20
            : photoX + 20;
        const boxY = photoY + photoH - boxH - 20;
        drawOverlappingPatakhaMiniBox(
          ctx,
          boxX,
          boxY,
          boxW,
          boxH,
          cardCorner === "bottom-right" ? -4.5 : 4.5
        );

        const lotusY = H - (isStory ? 140 : 108);
        drawWoodEngravedMotifs(ctx, W, 34, lotusY);

        let uFontSize = 64;
        ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        while (ctx.measureText(cleanHandle).width > W - 200 && uFontSize > 30) {
          uFontSize -= 2;
          ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        }
        ctx.fillStyle = "#2F1403";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cleanHandle, W / 2, photoY + photoH + 68);

        return;
      }

      if (selectedFrame === "rajasthani-arch") {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, "#D61F2C");
        bgGrad.addColorStop(0.5, "#B91522");
        bgGrad.addColorStop(1, "#990F1B");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 14;
        ctx.strokeRect(24, 24, W - 48, H - 48);

        ctx.strokeStyle = "#D61F2C";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 10]);
        ctx.strokeRect(24, 24, W - 48, H - 48);
        ctx.setLineDash([]);

        [
          [74, 74],
          [W - 74, 74],
        ].forEach(([fx, fy]) => {
          for (let a = 0; a < 6; a++) {
            const rad = (a * Math.PI) / 3;
            ctx.fillStyle = "#FACC15";
            ctx.beginPath();
            ctx.arc(
              fx + Math.cos(rad) * 16,
              fy + Math.sin(rad) * 16,
              10,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          ctx.fillStyle = "#EA580C";
          ctx.beginPath();
          ctx.arc(fx, fy, 9, 0, Math.PI * 2);
          ctx.fill();
        });

        [56, W - 56].forEach((gx) => {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 5;
          ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.moveTo(gx, 240);
          ctx.lineTo(gx, H - 360);
          ctx.stroke();
          ctx.setLineDash([]);

          [H * 0.45, H * 0.5, H * 0.55].forEach((py, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? "#FACC15" : "#F97316";
            ctx.beginPath();
            ctx.arc(gx, py, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        });

        const archX = 112;
        const archY = isStory ? 130 : 95;
        const archW = W - 224;
        const archH = isStory ? H - 490 : H - 360;

        ctx.save();
        traceRajasthaniArchPath(ctx, archX - 16, archY - 16, archW + 32, archH + 32);
        ctx.fillStyle = "#0EA5E9";
        ctx.fill();
        ctx.strokeStyle = "#FACC15";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        traceRajasthaniArchPath(ctx, archX - 8, archY - 8, archW + 16, archH + 16);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 4;
        ctx.setLineDash([4, 14]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        traceRajasthaniArchPath(ctx, archX, archY, archW, archH);
        ctx.clip();
        drawUserPhotoInsideClip(ctx, archX, archY, archW, archH);
        ctx.restore();

        ctx.save();
        traceRajasthaniArchPath(ctx, archX, archY, archW, archH);
        ctx.strokeStyle = "#FACC15";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        const boxW = isStory ? 248 : 225;
        const boxH = isStory ? 290 : 266;
        const boxX =
          cardCorner === "bottom-right"
            ? archX + archW - boxW - 14
            : archX + 14;
        const boxY = archY + archH - boxH - 55;
        drawOverlappingPatakhaMiniBox(
          ctx,
          boxX,
          boxY,
          boxW,
          boxH,
          cardCorner === "bottom-right" ? -5 : 5
        );

        const diyaBaseY = archY + archH + 8;
        drawRajasthaniColorfulDiya(ctx, W / 2 - 125, diyaBaseY + 18, "#EC4899", 0.78);
        drawRajasthaniColorfulDiya(ctx, W / 2 + 125, diyaBaseY + 18, "#0EA5E9", 0.78);
        drawRajasthaniColorfulDiya(ctx, W / 2, diyaBaseY + 4, "#16A34A", 1.08);

        const footerY = H - (isStory ? 155 : 115);
        let uFontSize = 58;
        ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        while (ctx.measureText(cleanHandle).width > W - 180 && uFontSize > 28) {
          uFontSize -= 2;
          ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        }
        ctx.fillStyle = "#FFE600";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cleanHandle, W / 2, footerY);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "800 23px system-ui, -apple-system, sans-serif";
        ctx.fillText(
          `${vibeTag.toUpperCase()} • ${activeClan?.emoji || "🧨"} ${(
            activeClan?.name || "PATAKHA"
          ).toUpperCase()} RANK #${displayClanRank} OF ${displayClanTotal}`,
          W / 2,
          footerY + 52
        );
        return;
      }

      if (selectedFrame === "marigold-circle") {
        const bgGrad = ctx.createRadialGradient(
          W / 2,
          H * 0.42,
          60,
          W / 2,
          H * 0.42,
          H * 0.75
        );
        bgGrad.addColorStop(0, "#FFD046");
        bgGrad.addColorStop(0.55, "#FDB022");
        bgGrad.addColorStop(1, "#F5820D");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        for (let row = 0; row < 2; row++) {
          const baseY = 36 + row * 42;
          for (let x = -20; x <= W + 20; x += 36) {
            const curveY =
              baseY + Math.sin((x / W) * Math.PI) * 58 + (x % 72 === 0 ? 4 : 0);
            ctx.fillStyle =
              (x / 36 + row) % 3 === 0 ? "#D62828" : "#F77F00";
            ctx.beginPath();
            ctx.arc(x, curveY, 17, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const cx = W / 2;
        const cy = isStory ? H * 0.44 : H * 0.43;
        const radius = isStory ? 390 : 370;

        const numTeeth = 36;
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < numTeeth; i++) {
          const angle = (i * 2 * Math.PI) / numTeeth;
          ctx.save();
          ctx.rotate(angle);

          ctx.strokeStyle = "#D62828";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-18, -(radius + 14));
          ctx.lineTo(0, -(radius + 48));
          ctx.lineTo(18, -(radius + 14));
          ctx.stroke();

          ctx.fillStyle = "#D62828";
          ctx.beginPath();
          ctx.arc(0, -(radius + 24), 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#F77F00";
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
        ctx.clip();
        drawUserPhotoInsideClip(
          ctx,
          cx - radius,
          cy - radius,
          radius * 2,
          radius * 2
        );
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
        ctx.strokeStyle = "#E85D04";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#4A1D05";
        ctx.fillRect(0, cy - radius - 10, 470, 118);
        ctx.strokeStyle = "#FFE600";
        ctx.lineWidth = 4;
        ctx.strokeRect(-4, cy - radius - 10, 474, 118);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "900 42px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(vibeTag.slice(0, 16).toUpperCase(), 38, cy - radius + 34);

        ctx.fillStyle = "#FFE600";
        ctx.font = "800 22px system-ui, -apple-system, sans-serif";
        ctx.fillText(
          `RANK #${displayClanRank} IN ${(
            activeClan?.name || "PATAKHA"
          ).toUpperCase()}`,
          38,
          cy - radius + 78
        );
        ctx.restore();

        const boxW = 228;
        const boxH = 268;
        const boxX =
          cardCorner === "bottom-right"
            ? cx + radius - boxW + 24
            : cx - radius - 24;
        const boxY = cy + radius - boxH - 10;
        drawOverlappingPatakhaMiniBox(
          ctx,
          boxX,
          boxY,
          boxW,
          boxH,
          cardCorner === "bottom-right" ? -5 : 5
        );

        drawTerracottaMandalaDiya(ctx, cx, cy + radius + 18, 1.15);

        const footerY = H - (isStory ? 160 : 112);
        let uFontSize = 62;
        ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        while (ctx.measureText(cleanHandle).width > W - 180 && uFontSize > 30) {
          uFontSize -= 2;
          ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
        }
        ctx.fillStyle = "#3B1502";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cleanHandle, W / 2, footerY);

        ctx.fillStyle = "#5C2206";
        ctx.font = "800 23px system-ui, -apple-system, sans-serif";
        ctx.fillText(
          `✦ VOTE FOR ${cleanHandle.toUpperCase()} • 🔥 ${displayVotes} UPVOTES ✦`,
          W / 2,
          footerY + 52
        );
        return;
      }

      const padX = isStory ? 76 : 72;
      const photoX = padX;
      const photoY = isStory ? 165 : 122;
      const photoW = W - padX * 2;
      const photoH = isStory ? H - 510 : H - 395;

      ctx.fillStyle = "#3A0B27";
      ctx.fillRect(0, 0, W, H);

      drawRoundedRect(ctx, 16, 16, W - 32, H - 32, 46);
      ctx.fillStyle = "#FFE600";
      ctx.fill();

      drawRoundedRect(ctx, 28, 28, W - 56, H - 56, 38);
      const bg = ctx.createLinearGradient(0, 28, 0, H - 28);
      bg.addColorStop(0, "#FFFDF9");
      bg.addColorStop(0.55, "#FFF6E3");
      bg.addColorStop(1, "#FDE68A");
      ctx.fillStyle = bg;
      ctx.fill();

      drawRoundedRect(ctx, 48, 48, W - 96, H - 96, 26);
      ctx.strokeStyle = "#B45309";
      ctx.lineWidth = 4;
      ctx.stroke();

      drawRoundedRect(ctx, 60, 60, W - 120, H - 120, 20);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (activeClan) {
        ctx.fillStyle = "#78350F";
        ctx.font = "800 22px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(
          `${activeClan.emoji} ${activeClan.name.toUpperCase()} CLAN • RANK #${displayClanRank} OF ${displayClanTotal}`,
          photoX + 6,
          photoY - 22
        );

        ctx.textAlign = "right";
        ctx.fillStyle = "#B45309";
        ctx.fillText(
          `OVERALL #${displayGlobalRank} • 🔥 ${displayVotes}`,
          photoX + photoW - 6,
          photoY - 22
        );
      }

      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 26);
      ctx.clip();
      drawUserPhotoInsideClip(ctx, photoX, photoY, photoW, photoH);
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 26);
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      const boxW = isStory ? 255 : 235;
      const boxH = isStory ? 300 : 278;
      const boxX =
        cardCorner === "bottom-right"
          ? photoX + photoW - boxW - 20
          : photoX + 20;
      const boxY = photoY + photoH - boxH - 20;
      drawOverlappingPatakhaMiniBox(
        ctx,
        boxX,
        boxY,
        boxW,
        boxH,
        cardCorner === "bottom-right" ? -4.5 : 4.5
      );

      const footerCenterY = photoY + photoH + (H - (photoY + photoH)) / 2;
      ctx.fillStyle = "#853A12";
      ctx.font = "italic 700 34px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `✨ ${vibeTag} • ${activeClan?.name || "Patakha"}`,
        W / 2,
        footerCenterY - 42
      );

      let uFontSize = 64;
      ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
      while (ctx.measureText(cleanHandle).width > W - 180 && uFontSize > 30) {
        uFontSize -= 2;
        ctx.font = `900 ${uFontSize}px system-ui, -apple-system, sans-serif`;
      }
      ctx.fillStyle = "#1E0B02";
      ctx.fillText(cleanHandle, W / 2, footerCenterY + 24);

      ctx.fillStyle = "#B45309";
      ctx.font = "800 21px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `✦ VOTE FOR ${cleanHandle.toUpperCase()} • RANK #${displayClanRank} IN ${(
          activeClan?.name || "PATAKHA"
        ).toUpperCase()} ✦`,
        W / 2,
        footerCenterY + 86
      );
    },
    [
      aspectMode,
      selectedFrame,
      activeClan,
      displayClanRank,
      displayClanTotal,
      displayGlobalRank,
      displayVotes,
      drawUserPhotoInsideClip,
      cardCorner,
      drawOverlappingPatakhaMiniBox,
      username,
      vibeTag,
    ]
  );

  useEffect(() => {
    if (!previewCanvasRef.current) return;
    renderCompositeToCanvas(previewCanvasRef.current);
  }, [renderCompositeToCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loadedUserImg) {
      fileInputRef.current?.click();
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: pan.x,
      startY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.clientX) * 2.2;
    const dy = (e.clientY - dragStartRef.current.clientY) * 2.2;
    setPan({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?u=${encodeURIComponent(cleanUserHandle)}`
      : `http://localhost:3005/?u=${encodeURIComponent(cleanUserHandle)}`;

  const handleDownloadFramedSnap = async () => {
    if (!previewCanvasRef.current) return;
    setIsExporting(true);
    try {
      await syncUserWithLeaderboard(cleanUserHandle, selectedPatakhaId, false);
      renderCompositeToCanvas(previewCanvasRef.current);
      const dataUrl = previewCanvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${cleanUserHandle}-${selectedFrame}-poster.png`;
      link.href = dataUrl;
      link.click();
      setDownloadCount((c) => c + 1);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePosterAndVotingLink = async () => {
    if (!previewCanvasRef.current) return;
    setIsSharingPoster(true);
    try {
      await syncUserWithLeaderboard(cleanUserHandle, selectedPatakhaId, false);
      renderCompositeToCanvas(previewCanvasRef.current);

      const text = `🧨 Check out my Diwali Frame & Patakha Card (${
        activeClan?.name || "Patakha"
      } — Rank #${displayClanRank})!\n\n🔥 Upvote @${cleanUserHandle} using my voting link so I rank #1: ${shareUrl}`;

      const blob = await new Promise<Blob | null>((resolve) =>
        previewCanvasRef.current?.toBlob((b) => resolve(b), "image/png")
      );

      if (blob && typeof navigator !== "undefined" && navigator.share) {
        const file = new File(
          [blob],
          `${cleanUserHandle}-${selectedFrame}-poster.png`,
          { type: "image/png" }
        );
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Vote for @${cleanUserHandle} on Rate My Patakha!`,
            text,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: `Vote for @${cleanUserHandle} on Rate My Patakha!`,
          text,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
      await handleDownloadFramedSnap();
    } catch {
      // cancelled share
    } finally {
      setIsSharingPoster(false);
    }
  };

  const handleCopyVotingLink = async () => {
    try {
      await syncUserWithLeaderboard(cleanUserHandle, selectedPatakhaId, false);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // ignore
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* PREVIEW COLUMN */}
      <div className="order-1 lg:order-2 lg:col-span-6 flex flex-col items-center">
        <div className="w-full max-w-[400px] sm:max-w-[420px] space-y-3">
          {/* Quick Top Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#28061C]/95 border-2 border-[#FFE600]/60 rounded-2xl px-3 py-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFE600] to-[#FF9F1C] text-[#380828] font-black text-xs shadow active:scale-95 transition"
              >
                <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                {loadedUserImg ? "Change Photo / Rangoli" : "Upload Photo / Rangoli"}
              </button>

              <button
                type="button"
                onClick={handleShuffleRandomCard}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#14020E] hover:bg-white/15 border border-[#FFE600]/50 text-[#FFE600] font-black text-xs active:scale-95 transition"
                title="Shuffle Random Overlapping Patakha Card"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Random Card</span>
              </button>
            </div>

            <div className="inline-flex rounded-xl bg-[#14020E] p-0.5 border border-[#FFE600]/35">
              <button
                type="button"
                onClick={() => setAspectMode("portrait-4-5")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition ${
                  aspectMode === "portrait-4-5"
                    ? "bg-[#FFE600] text-[#380828]"
                    : "text-amber-200"
                }`}
              >
                <RectangleVertical className="w-3 h-3" />
                4:5
              </button>
              <button
                type="button"
                onClick={() => setAspectMode("story-9-16")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black transition ${
                  aspectMode === "story-9-16"
                    ? "bg-[#FFE600] text-[#380828]"
                    : "text-amber-200"
                }`}
              >
                <Smartphone className="w-3 h-3" />
                9:16
              </button>
            </div>
          </div>

          {/* Live Interactive Canvas */}
          <div className="relative rounded-[28px] overflow-hidden bg-[#3A0B27] border-[3px] border-[#FFE600] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-1.5">
            <canvas
              ref={previewCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full h-auto rounded-[22px] block touch-none ${
                loadedUserImg
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-pointer"
              }`}
            />

            {/* Live Rank & Upvote Bar */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="text-amber-100 font-bold truncate flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />
                <span>
                  Rank #{displayClanRank} of {displayClanTotal} in{" "}
                  <strong className="text-[#FFE600]">
                    {activeClan?.name || "Patakha"}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                disabled={isVoting || hasVoted}
                onClick={async () => {
                  await syncUserWithLeaderboard(
                    cleanUserHandle,
                    selectedPatakhaId,
                    false
                  );
                  await onVote(cleanUserHandle);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs border shadow active:scale-95 transition ${
                  hasVoted
                    ? "bg-emerald-700/90 text-white border-emerald-300/60"
                    : "bg-gradient-to-r from-[#FF9F1C] via-[#FF5400] to-[#EF233C] text-white border-[#FFE600]/70"
                }`}
              >
                <Flame className="w-3.5 h-3.5 fill-current text-[#FFE600]" />
                <span>{hasVoted ? "Upvoted" : "Upvote"}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#FFE600]">
                  {displayVotes}
                </span>
              </button>
            </div>
          </div>

          {/* IMPORTANT PHOTO PRIVACY & DOWNLOAD FIRST NOTICE */}
          <div className="bg-amber-950/85 border-2 border-[#FFE600]/70 rounded-2xl p-3 text-xs text-amber-100 space-y-1 shadow-lg">
            <div className="font-black text-[#FFE600] flex items-center gap-1.5">
              <Info className="w-4 h-4 shrink-0" />
              <span>Important: Download Your Framed Photo First! 📸</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-100/90 leading-relaxed">
              For your privacy, your uploaded photo or Rangoli is{" "}
              <strong>never saved on our servers</strong> and{" "}
              <strong>won&apos;t appear inside the shareable voting link</strong>
              . Please tap <strong>Download Poster</strong> below (you can
              download unlimited times anytime!) and attach your downloaded image
              along with your voting link!
            </p>
          </div>

          {/* Share Poster + Link & Download Poster (Unlimited Downloads) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadFramedSnap}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl active:scale-[0.99] transition"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isExporting
                  ? "Saving..."
                  : downloadCount > 0
                  ? `Download Again (${downloadCount})`
                  : "1. Download Poster"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSharePosterAndVotingLink}
              disabled={isSharingPoster}
              className="inline-flex items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-gradient-to-r from-[#FFE600] via-[#FF9F1C] to-[#FF5400] hover:brightness-110 text-[#380828] font-black text-xs sm:text-sm border-2 border-[#4A1238] shadow-xl active:scale-[0.99] transition"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSharingPoster ? "Sharing..." : "2. Share Poster + Link"}
              </span>
            </button>
          </div>

          {/* Shareable Voting Link Box */}
          <div className="bg-[#230518]/95 border-2 border-[#FFE600]/60 rounded-2xl p-3 space-y-2 shadow-xl">
            <div className="flex items-center justify-between gap-2 text-[11px] font-black text-[#FFE600]">
              <span className="inline-flex items-center gap-1 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                Voting Link for @{cleanUserHandle}
              </span>
              <span className="text-emerald-300">
                {isSyncingArena ? "Syncing DB..." : `🔥 ${displayVotes} Upvotes`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={handleCopyVotingLink}
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#12020C] border border-[#FFE600]/35 text-xs text-amber-100 font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyVotingLink}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs transition"
              >
                {copiedLink ? (
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
        </div>
      </div>

      {/* CONTROLS COLUMN */}
      <div className="order-2 lg:order-1 lg:col-span-6 bg-[#28061C]/92 border-2 border-[#FFE600]/75 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-md space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFE600] text-[#380828] text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 fill-current" />
            Handcrafted Wooden & Festive Diwali Frames
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white mt-1.5">
            Frame Your Photo, Rangoli or Diya Snap 🪵🪔
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/85 mt-1">
            Upload your{" "}
            <strong className="text-[#FFE600]">
              selfie, Rangoli artwork, Diyas, or any festive photograph
            </strong>{" "}
            into our handcrafted frames. Download unlimited times anytime and
            share the image alongside your voting link!
          </p>
        </div>

        {/* DB Registration Status Pill */}
        {dbExistingProfile && (
          <div className="bg-emerald-950/80 border border-emerald-400/50 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-emerald-200 font-bold flex items-center gap-1.5">
              {isLockedByAnotherUser ? (
                <Lock className="w-4 h-4 text-[#FFE600] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>
                <strong>@{dbExistingProfile.handle}</strong> is registered in DB
                with <strong>{dbExistingProfile.patakhaName}</strong> (Rank #
                {dbExistingProfile.clanRank})
              </span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black shrink-0">
              🔥 {dbExistingProfile.votes}
            </span>
          </div>
        )}

        {/* 3 Thumb-Friendly Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#14020E] p-1.5 rounded-2xl border border-[#FFE600]/35">
          <button
            type="button"
            onClick={() => setMobileTab("frame")}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              mobileTab === "frame"
                ? "bg-[#FFE600] text-[#380828] shadow"
                : "text-amber-200 hover:text-white"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>1. Frame Style</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("card")}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              mobileTab === "card"
                ? "bg-[#FFE600] text-[#380828] shadow"
                : "text-amber-200 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>2. Corner Card</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("text")}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
              mobileTab === "text"
                ? "bg-[#FFE600] text-[#380828] shadow"
                : "text-amber-200 hover:text-white"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>3. @Username</span>
          </button>
        </div>

        {/* TAB 1: FRAME STYLE & PHOTO ZOOM */}
        {mobileTab === "frame" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FRAME_OPTIONS.map((frame) => {
                const active = selectedFrame === frame.id;
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => setSelectedFrame(frame.id)}
                    className={`text-left p-3 rounded-2xl border-2 transition flex items-center gap-3 ${
                      active
                        ? "bg-[#3D0A2B] border-[#FFE600] shadow-lg scale-[1.01]"
                        : "bg-[#16020F]/85 border-[#FFE600]/25 hover:border-[#FFE600]/60"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${frame.previewGradient} border-2 border-white/50 shrink-0 shadow`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-white truncate">
                        {frame.name}
                      </div>
                      <div className="text-[11px] text-amber-200/80 truncate">
                        {frame.subtitle}
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] font-extrabold text-[#FFE600]">
                        {frame.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#16020F]/85 border border-[#FFE600]/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span className="inline-flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-[#FFE600]" />
                  Photo / Rangoli Zoom ({Math.round(zoom * 100)}%)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.05);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[#FFE600] underline"
                >
                  <RotateCcw className="w-3 h-3" /> Center Image
                </button>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.4"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#FFE600] cursor-pointer"
              />
              <p className="text-[11px] text-amber-200/70 flex items-center gap-1">
                <Move className="w-3 h-3 text-[#FFE600]" />
                Tip: Drag directly on the preview canvas to position your photo
                or Rangoli!
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: OVERLAPPING PATAKHA CARD BOX & SHUFFLE */}
        {mobileTab === "card" && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#14020E] p-3 rounded-2xl border border-[#FFE600]/40">
              <div>
                <div className="text-[11px] font-extrabold uppercase text-amber-200/75">
                  Overlapping Corner Patakha Card:
                </div>
                <div className="text-sm sm:text-base font-black text-[#FFE600]">
                  {activeClan?.emoji} {activeClan?.name} (Rank #
                  {displayClanRank})
                </div>
              </div>

              <button
                type="button"
                onClick={handleShuffleRandomCard}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FFE600] to-[#FF9F1C] text-[#380828] font-black text-xs shadow active:scale-95 transition"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Roll Random Card</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-amber-200 bg-[#14020E]/70 px-3.5 py-2 rounded-xl border border-white/10">
              <span>Mini Card Box Corner:</span>
              <div className="inline-flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCardCorner("bottom-left")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                    cardCorner === "bottom-left"
                      ? "bg-[#FFE600] text-[#380828]"
                      : "bg-white/10 text-amber-200"
                  }`}
                >
                  Bottom Left
                </button>
                <button
                  type="button"
                  onClick={() => setCardCorner("bottom-right")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                    cardCorner === "bottom-right"
                      ? "bg-[#FFE600] text-[#380828]"
                      : "bg-white/10 text-amber-200"
                  }`}
                >
                  Bottom Right
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200/80 mb-1.5">
                Or Pick Any of the {clans.length} Patakha Cards:
              </div>
              <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {clans.map((clan) => {
                  const active = selectedPatakhaId === clan.patakhaId;
                  return (
                    <button
                      key={clan.patakhaId}
                      type="button"
                      onClick={() => handleSelectSpecificCard(clan.patakhaId)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                        active
                          ? "bg-[#FFE600] text-[#380828] border-[#4A1238] font-black shadow"
                          : "bg-[#14020E]/85 text-amber-100 border-[#FFE600]/30 font-bold hover:border-[#FFE600]"
                      }`}
                    >
                      <img
                        src={clan.imageUrl}
                        alt={clan.name}
                        loading="lazy"
                        className="w-9 h-9 rounded-lg object-cover bg-[#FFF6E3] border border-[#D97706] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs truncate">{clan.name}</div>
                        <div
                          className={`text-[10px] ${
                            active ? "text-[#380828]/80" : "text-amber-300/75"
                          }`}
                        >
                          {clan.memberCount} users
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: @USERNAME & VIBE CAPTION */}
        {mobileTab === "text" && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#FFE600] mb-1">
                Your @Username (Checked in DB & Ranked on Leaderboard)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() =>
                    syncUserWithLeaderboard(username, selectedPatakhaId, false)
                  }
                  placeholder="@yourhandle"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#14020E] border-2 border-[#FFE600]/50 text-white font-bold text-sm focus:outline-none focus:border-[#FFE600]"
                />
                <button
                  type="button"
                  onClick={() =>
                    syncUserWithLeaderboard(username, selectedPatakhaId, false)
                  }
                  className="px-4 py-2.5 rounded-xl bg-[#FFE600] text-[#380828] font-black text-xs shrink-0"
                >
                  Sync DB
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#FFE600] mb-1">
                Frame Header / Greeting Title
              </label>
              <input
                type="text"
                value={vibeTag}
                onChange={(e) => setVibeTag(e.target.value)}
                placeholder="HAPPY DIWALI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#14020E] border-2 border-[#FFE600]/50 text-white font-bold text-sm focus:outline-none focus:border-[#FFE600]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {VIBE_CAPTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setVibeTag(preset)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                    vibeTag === preset
                      ? "bg-[#FFE600] text-[#380828] border-[#4A1238]"
                      : "bg-[#14020E]/80 text-amber-200 border-[#FFE600]/30"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}