import React from "react";
import type { Metadata } from "next";
import PatakhaArenaClient from "@/components/PatakhaArenaClient";
import { findRegisteredProfile, sanitizeHandle } from "@/lib/store";

interface PageProps {
  searchParams?: {
    u?: string | string[];
    vote?: string | string[];
    vs?: string | string[];
    hours?: string | string[];
    days?: string | string[];
  };
}

/**
 * Dynamic Server-Side OpenGraph & Twitter Metadata Generator:
 * Ensures WhatsApp, X/Twitter, LinkedIn, and Discord crawlers automatically
 * display the user's live Rank, Patakha Clan, Vote count, Battle Hours, and `/api/og` social card!
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const rawVs = Array.isArray(searchParams?.vs)
    ? searchParams?.vs[0]
    : searchParams?.vs;

  const rawHours = Array.isArray(searchParams?.hours)
    ? searchParams?.hours[0]
    : searchParams?.hours;
  const rawDays = Array.isArray(searchParams?.days)
    ? searchParams?.days[0]
    : searchParams?.days;

  const parsedHours = rawHours
    ? parseInt(rawHours, 10)
    : rawDays
    ? parseInt(rawDays, 10) * 24
    : 12;
  const battleHours = Math.min(48, Math.max(1, parsedHours || 12));

  if (rawVs && rawVs.includes(",")) {
    const [rawA, rawB] = rawVs.split(",");
    const cleanA = sanitizeHandle(rawA || "pragmaticengineer");
    const cleanB = sanitizeHandle(rawB || "aarav");
    const [profA, profB] = await Promise.all([
      findRegisteredProfile(cleanA),
      findRegisteredProfile(cleanB),
    ]);

    const votesA = profA?.votes ?? 10;
    const votesB = profB?.votes ?? 10;
    const title = `⚔️ @${cleanA} (${votesA}) vs @${cleanB} (${votesB}) • ${battleHours}-Hour Patakha Battle!`;
    const description = `Tap to cast your upvote in the ${battleHours}-Hour Diwali Patakha 1v1 Rivalry Battle between @${cleanA} and @${cleanB}!`;
    const ogImageUrl = `/api/og?vs=${encodeURIComponent(
      cleanA
    )},${encodeURIComponent(cleanB)}&hours=${battleHours}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  const rawUser =
    (Array.isArray(searchParams?.u) ? searchParams?.u[0] : searchParams?.u) ||
    (Array.isArray(searchParams?.vote)
      ? searchParams?.vote[0]
      : searchParams?.vote) ||
    "";

  const cleanUser = sanitizeHandle(rawUser);

  if (cleanUser) {
    const profile = await findRegisteredProfile(cleanUser);
    const patakhaLabel = profile
      ? `${profile.patakhaEmoji} ${profile.patakhaName} • Rank #${profile.clanRank}`
      : "🧨 Diwali Patakha Card";
    const voteCount = profile?.votes ?? 10;

    const title = `🔥 Upvote @${cleanUser} (${patakhaLabel}) | Rate My Patakha`;
    const description = `@${cleanUser} has ${voteCount} upvotes on the Diwali Patakha Leaderboard! Tap to cast your upvote & push @${cleanUser} to Rank #1!`;
    const ogImageUrl = `/api/og?u=${encodeURIComponent(cleanUser)}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  const defaultTitle =
    "Rate My Patakha 🧨 | Cracker Cards, Photo/Rangoli Frames & 1v1 Battles";
  const defaultDesc =
    "Enter your username, frame your Photo or Rangoli in handcrafted Diwali frames, or tag a friend in a custom-hour 1v1 Battle!";

  return {
    title: defaultTitle,
    description: defaultDesc,
    openGraph: {
      title: defaultTitle,
      description: defaultDesc,
      images: [{ url: "/api/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDesc,
      images: ["/api/og"],
    },
  };
}

export default function SubstackPatakhaArenaServerPage() {
  return <PatakhaArenaClient />;
}