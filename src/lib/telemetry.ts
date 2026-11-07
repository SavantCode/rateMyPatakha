import { getMongoDb } from "./mongodb";

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  source: "client" | "server" | "mongodb";
  route: string;
  message: string;
  stack?: string;
  userAgent?: string;
}

export interface EndpointMetric {
  route: string;
  calls: number;
  errors: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  lastCalledAt: string;
}

export interface HourlyBucket {
  hourKey: string; // e.g. "2025-05-12T14:00"
  label: string;   // e.g. "14:00"
  visits: number;
  analyses: number;
  votes: number;
  errors: number;
}

interface GlobalTelemetryState {
  startedAt: number;
  endpoints: Map<string, EndpointMetric>;
  hourly: Map<string, HourlyBucket>;
  errors: ErrorLogEntry[];
}

const globalForTelemetry = globalThis as unknown as {
  patakhaTelemetry?: GlobalTelemetryState;
};

function getTelemetryState(): GlobalTelemetryState {
  if (!globalForTelemetry.patakhaTelemetry) {
    globalForTelemetry.patakhaTelemetry = {
      startedAt: Date.now(),
      endpoints: new Map<string, EndpointMetric>(),
      hourly: new Map<string, HourlyBucket>(),
      errors: [],
    };
  }
  return globalForTelemetry.patakhaTelemetry;
}

function getCurrentHourBucket(state: GlobalTelemetryState): HourlyBucket {
  const now = new Date();
  const isoHour = now.toISOString().slice(0, 13) + ":00";
  const label = now.toISOString().slice(11, 13) + ":00 UTC";

  let bucket = state.hourly.get(isoHour);
  if (!bucket) {
    bucket = {
      hourKey: isoHour,
      label,
      visits: 0,
      analyses: 0,
      votes: 0,
      errors: 0,
    };
    state.hourly.set(isoHour, bucket);

    // Keep last 24 hours in memory
    if (state.hourly.size > 24) {
      const oldestKey = state.hourly.keys().next().value;
      if (oldestKey) state.hourly.delete(oldestKey);
    }
  }
  return bucket;
}

/**
 * Records an API call's latency and status for the `/audit` developer dashboard.
 * Also persists aggregated counters in MongoDB `system_telemetry` collection non-blockingly.
 */
export function recordApiTelemetry(
  route: string,
  latencyMs: number,
  isError = false,
  eventType?: "visit" | "analyze" | "vote"
) {
  try {
    const state = getTelemetryState();
    const nowIso = new Date().toISOString();
    const existing = state.endpoints.get(route) || {
      route,
      calls: 0,
      errors: 0,
      totalLatencyMs: 0,
      avgLatencyMs: 0,
      maxLatencyMs: 0,
      lastCalledAt: nowIso,
    };

    existing.calls += 1;
    if (isError) existing.errors += 1;
    existing.totalLatencyMs += Math.max(0, latencyMs);
    existing.avgLatencyMs = Math.round(existing.totalLatencyMs / existing.calls);
    existing.maxLatencyMs = Math.max(existing.maxLatencyMs, Math.round(latencyMs));
    existing.lastCalledAt = nowIso;
    state.endpoints.set(route, existing);

    const hourBucket = getCurrentHourBucket(state);
    if (eventType === "visit") hourBucket.visits += 1;
    if (eventType === "analyze") hourBucket.analyses += 1;
    if (eventType === "vote") hourBucket.votes += 1;
    if (isError) hourBucket.errors += 1;
  } catch {
    // Never let telemetry throw inside production request handlers
  }
}

/**
 * Records a client-side or server-side crash/exception in memory and MongoDB
 * so the developer can inspect it on `/audit`.
 */
export async function recordSystemError(params: {
  source: "client" | "server" | "mongodb";
  route: string;
  message: string;
  stack?: string;
  userAgent?: string;
}) {
  try {
    const state = getTelemetryState();
    const entry: ErrorLogEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      source: params.source,
      route: params.route.slice(0, 120),
      message: params.message.slice(0, 500),
      stack: params.stack ? params.stack.slice(0, 1500) : undefined,
      userAgent: params.userAgent ? params.userAgent.slice(0, 180) : undefined,
    };

    state.errors = [entry, ...state.errors].slice(0, 50);
    const hourBucket = getCurrentHourBucket(state);
    hourBucket.errors += 1;

    const db = await getMongoDb();
    if (db) {
      const col = db.collection<{
        _id: string;
        recentErrors?: ErrorLogEntry[];
        totalErrors?: number;
      }>("system_telemetry");
      await col
        .updateOne(
          { _id: "error_log" },
          {
            $inc: { totalErrors: 1 },
            $push: {
              recentErrors: {
                $each: [entry],
                $position: 0,
                $slice: 50,
              },
            },
          },
          { upsert: true }
        )
        .catch(() => {});
    }
  } catch {
    // ignore
  }
}

export async function getAuditTelemetrySnapshot() {
  const state = getTelemetryState();

  // Ensure at least the current hour bucket exists for graphs
  getCurrentHourBucket(state);

  let dbConnected = false;
  let dbLatencyMs = -1;
  let mongoProfilesCount = 0;
  let mongoErrorLogs: ErrorLogEntry[] = [];
  let totalHistoricalErrors = state.errors.length;

  const pingStart = Date.now();
  try {
    const db = await getMongoDb();
    if (db) {
      await db.command({ ping: 1 });
      dbLatencyMs = Date.now() - pingStart;
      dbConnected = true;

      const profilesCol = db.collection("profiles");
      mongoProfilesCount = await profilesCol.estimatedDocumentCount();

      const telemetryCol = db.collection<{
        _id: string;
        recentErrors?: ErrorLogEntry[];
        totalErrors?: number;
      }>("system_telemetry");
      const errDoc = await telemetryCol.findOne({ _id: "error_log" });
      if (errDoc?.recentErrors) {
        mongoErrorLogs = errDoc.recentErrors;
      }
      if (typeof errDoc?.totalErrors === "number") {
        totalHistoricalErrors = errDoc.totalErrors;
      }
    }
  } catch (err) {
    dbConnected = false;
    dbLatencyMs = -1;
    await recordSystemError({
      source: "mongodb",
      route: "/api/audit",
      message: err instanceof Error ? err.message : "MongoDB ping failed",
    });
  }

  // Merge in-memory and MongoDB error logs without duplicates
  const seenIds = new Set<string>();
  const mergedErrors: ErrorLogEntry[] = [];
  for (const e of [...state.errors, ...mongoErrorLogs]) {
    if (!seenIds.has(e.id)) {
      seenIds.add(e.id);
      mergedErrors.push(e);
    }
  }

  const mem =
    typeof process !== "undefined" && process.memoryUsage
      ? process.memoryUsage()
      : { rss: 0, heapUsed: 0, heapTotal: 0 };

  return {
    uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
    dbConnected,
    dbLatencyMs,
    mongoProfilesCount,
    memoryUsage: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
    },
    endpoints: Array.from(state.endpoints.values()).sort(
      (a, b) => b.calls - a.calls
    ),
    hourlySeries: Array.from(state.hourly.values()),
    recentErrors: mergedErrors.slice(0, 30),
    totalHistoricalErrors,
  };
}