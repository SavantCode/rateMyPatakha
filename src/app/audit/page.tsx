"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Eye,
  Flame,
  Github,
  RefreshCw,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
  Bug,
} from "lucide-react";

interface AuditResponse {
  status: string;
  timestamp: string;
  arena: {
    visitorCount: number;
    totalCreators: number;
    totalVotes: number;
    dbConnected: boolean;
    clans: {
      patakhaId: string;
      name: string;
      emoji: string;
      memberCount: number;
      totalVotes: number;
      clanRank: number;
    }[];
    topProfiles: {
      handle: string;
      patakhaName: string;
      patakhaEmoji: string;
      votes: number;
      globalRank: number;
      clanRank: number;
    }[];
    recentEvents: {
      id: string;
      type: "vote" | "join";
      handle: string;
      patakhaName: string;
      votes: number;
      timestamp: string;
    }[];
  };
  telemetry: {
    uptimeSeconds: number;
    dbConnected: boolean;
    dbLatencyMs: number;
    mongoProfilesCount: number;
    memoryUsage: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    endpoints: {
      route: string;
      calls: number;
      errors: number;
      avgLatencyMs: number;
      maxLatencyMs: number;
      lastCalledAt: string;
    }[];
    hourlySeries: {
      hourKey: string;
      label: string;
      visits: number;
      analyses: number;
      votes: number;
      errors: number;
    }[];
    recentErrors: {
      id: string;
      timestamp: string;
      source: "client" | "server" | "mongodb";
      route: string;
      message: string;
      stack?: string;
      userAgent?: string;
    }[];
    totalHistoricalErrors: number;
  };
}

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function DeveloperAuditDashboardPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [simulatingError, setSimulatingError] = useState(false);

  const fetchAuditData = useCallback(async () => {
    try {
      const res = await fetch("/api/audit", { cache: "no-store" });
      if (!res.ok) return;
      const json: AuditResponse = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to fetch audit metrics:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAuditData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAuditData]);

  const handleSimulateCrashReport = async () => {
    setSimulatingError(true);
    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "client",
          route: "/audit (Developer Test)",
          message:
            "Simulated Production Crash Check: Verified error logging pipeline to MongoDB & Memory",
          stack:
            "Error: Simulated Crash Check\n    at handleSimulateCrashReport (/audit:142:15)",
        }),
      });
      await fetchAuditData();
    } finally {
      setSimulatingError(false);
    }
  };

  const arena = data?.arena;
  const telemetry = data?.telemetry;

  const maxHourlyActivity = Math.max(
    1,
    ...(telemetry?.hourlySeries.map(
      (b) => b.visits + b.analyses + b.votes + b.errors
    ) || [1])
  );

  const maxClanVotes = Math.max(
    1,
    ...(arena?.clans.map((c) => c.totalVotes) || [1])
  );

  return (
    <div className="min-h-screen bg-[#12020B] text-amber-50 p-3 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Navigation & Status Bar */}
        <header className="bg-[#240518] border-2 border-[#FFE600]/70 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE600]/15 border border-[#FFE600]/50 text-[#FFE600] text-xs font-black uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Production Developer Audit & Crash Telemetry (`/audit`)
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white">
              🧨 Rate My Patakha — System Health & Traffic Monitor
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80">
              Real-time visitor metrics, MongoDB connection diagnostics, API
              latency graphs, and client/server crash logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`px-3 py-2 rounded-xl border text-xs font-black inline-flex items-center gap-1.5 transition ${
                autoRefresh
                  ? "bg-emerald-950 border-emerald-400 text-emerald-300"
                  : "bg-[#14020E] border-white/20 text-amber-200"
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`}
              />
              <span>{autoRefresh ? "Live Polling (5s)" : "Polling Paused"}</span>
            </button>

            <button
              type="button"
              onClick={fetchAuditData}
              className="px-3.5 py-2 rounded-xl bg-[#FFE600] hover:bg-amber-300 text-[#380828] font-black text-xs inline-flex items-center gap-1.5 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Now</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#FFE600]/40 text-amber-100 font-black text-xs inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Back to Arena</span>
            </Link>
          </div>
        </header>

        {loading && !data ? (
          <div className="bg-[#1E0313] border border-[#FFE600]/40 rounded-3xl p-12 text-center font-black text-amber-200">
            Loading Real-Time Production Audit & MongoDB Diagnostics...
          </div>
        ) : (
          <>
            {/* Top 6 KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#1E0313] border border-emerald-400/50 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-extrabold uppercase text-emerald-300 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Total Visitors
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {arena?.visitorCount.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-emerald-300/80 font-bold">
                  Unique IP/Client Tracked
                </div>
              </div>

              <div className="bg-[#1E0313] border border-[#FFE600]/45 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-extrabold uppercase text-[#FFE600] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Registered Cards
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {arena?.totalCreators.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-amber-200/75 font-bold">
                  DB Docs: {telemetry?.mongoProfilesCount ?? 0}
                </div>
              </div>

              <div className="bg-[#1E0313] border border-orange-400/50 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-extrabold uppercase text-orange-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Total Upvotes
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {arena?.totalVotes.toLocaleString() ?? 0}
                </div>
                <div className="text-[10px] text-orange-200/80 font-bold">
                  SHA-256 Deduplicated
                </div>
              </div>

              <div
                className={`bg-[#1E0313] border rounded-2xl p-4 space-y-1 ${
                  telemetry?.dbConnected
                    ? "border-emerald-400/60"
                    : "border-amber-400/60"
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase text-amber-200 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-[#FFE600]" /> MongoDB
                  Status
                </div>
                <div className="text-lg sm:text-xl font-black flex items-center gap-1.5">
                  {telemetry?.dbConnected ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-5 h-5" /> CONNECTED
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-5 h-5" /> MEMORY MODE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-amber-200/80 font-bold">
                  Ping:{" "}
                  {telemetry?.dbLatencyMs && telemetry.dbLatencyMs >= 0
                    ? `${telemetry.dbLatencyMs} ms`
                    : "In-Memory Store"}
                </div>
              </div>

              <div className="bg-[#1E0313] border border-sky-400/45 rounded-2xl p-4 space-y-1">
                <div className="text-[11px] font-extrabold uppercase text-sky-300 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Server Memory
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {telemetry?.memoryUsage.heapUsedMb ?? 0} MB
                </div>
                <div className="text-[10px] text-sky-200/80 font-bold">
                  RSS: {telemetry?.memoryUsage.rssMb ?? 0} MB • Up{" "}
                  {formatUptime(telemetry?.uptimeSeconds ?? 0)}
                </div>
              </div>

              <div
                className={`bg-[#1E0313] border rounded-2xl p-4 space-y-1 ${
                  (telemetry?.recentErrors.length || 0) > 0
                    ? "border-rose-500/70"
                    : "border-emerald-400/45"
                }`}
              >
                <div className="text-[11px] font-extrabold uppercase text-rose-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Crash / Error Count
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {telemetry?.totalHistoricalErrors ?? 0}
                </div>
                <div className="text-[10px] text-amber-200/80 font-bold">
                  {(telemetry?.recentErrors.length || 0) === 0
                    ? "0 Active Crashes"
                    : `${telemetry?.recentErrors.length} Logged Events`}
                </div>
              </div>
            </div>

            {/* Graphs Row: Hourly Traffic Graph + Clan Distribution Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Hourly Traffic & Error Bar Graph */}
              <div className="lg:col-span-7 bg-[#210416] border-2 border-[#FFE600]/45 rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Hourly Traffic, Card Generations, Votes & Errors
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-white">
                      📊 Live Hourly Activity Graph (UTC)
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                      Visits
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#FFE600]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#FFE600]" />
                      Cards
                    </span>
                    <span className="inline-flex items-center gap-1 text-orange-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                      Votes
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                      Errors
                    </span>
                  </div>
                </div>

                <div className="h-52 bg-[#13010C] border border-[#FFE600]/25 rounded-2xl p-4 flex items-end gap-3 overflow-x-auto">
                  {(telemetry?.hourlySeries || []).map((bucket) => {
                    const total =
                      bucket.visits +
                      bucket.analyses +
                      bucket.votes +
                      bucket.errors;
                    const heightPct = Math.max(
                      10,
                      Math.round((total / maxHourlyActivity) * 100)
                    );

                    return (
                      <div
                        key={bucket.hourKey}
                        className="flex-1 min-w-[56px] h-full flex flex-col justify-end items-center gap-1.5"
                      >
                        <div className="text-[10px] font-black text-amber-200">
                          {total}
                        </div>
                        <div
                          className="w-full max-w-[42px] rounded-t-xl overflow-hidden flex flex-col justify-end bg-white/5 border border-white/10 transition-all"
                          style={{ height: `${heightPct}%` }}
                          title={`Visits: ${bucket.visits} | Cards: ${bucket.analyses} | Votes: ${bucket.votes} | Errors: ${bucket.errors}`}
                        >
                          {bucket.errors > 0 && (
                            <div
                              className="w-full bg-rose-500"
                              style={{
                                height: `${Math.max(
                                  15,
                                  (bucket.errors / Math.max(1, total)) * 100
                                )}%`,
                              }}
                            />
                          )}
                          {bucket.votes > 0 && (
                            <div
                              className="w-full bg-orange-500"
                              style={{
                                height: `${Math.max(
                                  15,
                                  (bucket.votes / Math.max(1, total)) * 100
                                )}%`,
                              }}
                            />
                          )}
                          {bucket.analyses > 0 && (
                            <div
                              className="w-full bg-[#FFE600]"
                              style={{
                                height: `${Math.max(
                                  15,
                                  (bucket.analyses / Math.max(1, total)) * 100
                                )}%`,
                              }}
                            />
                          )}
                          {bucket.visits > 0 && (
                            <div
                              className="w-full bg-emerald-400"
                              style={{
                                height: `${Math.max(
                                  15,
                                  (bucket.visits / Math.max(1, total)) * 100
                                )}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-amber-200/70">
                          {bucket.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Patakha Clan Distribution Graph */}
              <div className="lg:col-span-5 bg-[#210416] border-2 border-[#FFE600]/45 rounded-3xl p-4 sm:p-6 space-y-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Database Distribution by Patakha Clan
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-white">
                    🧨 Clan Votes & Member Share
                  </h2>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {(arena?.clans || []).map((clan) => {
                    const widthPct = Math.max(
                      8,
                      Math.round((clan.totalVotes / maxClanVotes) * 100)
                    );
                    return (
                      <div key={clan.patakhaId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-white truncate">
                            {clan.emoji} {clan.name}{" "}
                            <span className="text-amber-200/70">
                              ({clan.memberCount} users)
                            </span>
                          </span>
                          <span className="text-[#FFE600] font-black">
                            🔥 {clan.totalVotes}
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-black/60 overflow-hidden p-0.5 border border-[#FFE600]/20">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#FFE600] via-[#FF7B00] to-[#EF233C]"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Crash / Exception Log & API Endpoint Latency Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Crash / Exception Monitor (7 Cols) */}
              <div className="lg:col-span-7 bg-[#210416] border-2 border-[#FFE600]/45 rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                      <Bug className="w-3.5 h-3.5" />
                      Real-Time Client & Server Exception Feed
                    </div>
                    <h2 className="text-base sm:text-xl font-black text-white">
                      🚨 Production Crash & Error Logs
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateCrashReport}
                    disabled={simulatingError}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 border border-rose-300/50 text-white text-xs font-black inline-flex items-center gap-1.5 shadow transition"
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>
                      {simulatingError
                        ? "Logging Test..."
                        : "Simulate Test Error"}
                    </span>
                  </button>
                </div>

                {(telemetry?.recentErrors.length || 0) === 0 ? (
                  <div className="bg-emerald-950/50 border border-emerald-400/40 rounded-2xl p-6 text-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <div className="font-black text-emerald-200 text-sm">
                      Zero Crashes Detected! All Client & Server Routes Healthy
                    </div>
                    <p className="text-xs text-emerald-200/75">
                      If any user browser throws an unhandled runtime error or a
                      server API fails, the full stack trace will appear here
                      automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {telemetry?.recentErrors.map((err) => (
                      <div
                        key={err.id}
                        className="bg-[#14010C] border border-rose-500/45 rounded-2xl p-3.5 space-y-1.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-rose-300 font-black uppercase text-[10px]">
                            {err.source} • {err.route}
                          </span>
                          <span className="text-[11px] font-mono text-amber-200/70">
                            {new Date(err.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="font-bold text-white break-words">
                          {err.message}
                        </div>
                        {err.stack && (
                          <pre className="text-[10px] font-mono text-amber-200/70 bg-black/60 p-2 rounded-xl overflow-x-auto">
                            {err.stack}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Endpoint Latency Table (5 Cols) */}
              <div className="lg:col-span-5 bg-[#210416] border-2 border-[#FFE600]/45 rounded-3xl p-4 sm:p-6 space-y-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                    <Server className="w-3.5 h-3.5" />
                    API Route Performance & Error Rates
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-white">
                    ⚡ Endpoint Latency Telemetry
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/15 text-amber-200/75 uppercase text-[10px]">
                        <th className="py-2 pr-2">Route</th>
                        <th className="py-2 px-2">Calls</th>
                        <th className="py-2 px-2">Avg</th>
                        <th className="py-2 px-2">Max</th>
                        <th className="py-2 pl-2">Err</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 font-semibold">
                      {(telemetry?.endpoints || []).map((ep) => (
                        <tr key={ep.route}>
                          <td className="py-2.5 pr-2 font-mono text-[#FFE600]">
                            {ep.route}
                          </td>
                          <td className="py-2.5 px-2 text-white">{ep.calls}</td>
                          <td className="py-2.5 px-2 text-emerald-300">
                            {ep.avgLatencyMs}ms
                          </td>
                          <td className="py-2.5 px-2 text-amber-200">
                            {ep.maxLatencyMs}ms
                          </td>
                          <td
                            className={`py-2.5 pl-2 font-black ${
                              ep.errors > 0
                                ? "text-rose-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {ep.errors}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live Recent Events Stream */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#FFE600] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Recent User Actions in Database
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {(arena?.recentEvents || []).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs bg-[#14010C] border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {ev.type === "vote" ? "🔥 Upvote:" : "🧨 Card:"}{" "}
                          <strong className="text-[#FFE600]">
                            @{ev.handle}
                          </strong>{" "}
                          ({ev.patakhaName})
                        </span>
                        <span className="text-[10px] font-mono text-amber-200/70 shrink-0">
                          {ev.votes} votes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer with GitHub Link */}
        <footer className="bg-[#1C0313] border border-[#FFE600]/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-amber-200/85 font-semibold">
             Direct Audit URL: <code className="text-[#FFE600]">/audit</code> •
            JSON Telemetry API:{" "}
            <code className="text-[#FFE600]">/api/audit</code>
          </span>
          <a
            href="https://github.com/SavantCode/rateMyPatakha"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#FFE600] text-[#380828] font-black inline-flex items-center gap-1.5 shadow"
          >
            <Github className="w-4 h-4" />
            <span>github.com/SavantCode/rateMyPatakha</span>
          </a>
        </footer>
      </div>
    </div>
  );
}