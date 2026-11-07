"use client";

import { useEffect } from "react";

/**
 * Global browser crash & unhandled promise rejection listener.
 * Automatically forwards any runtime client crash to `POST /api/audit`
 * so the developer can see exact stack traces on `/audit`.
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      try {
        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "client",
            route: window.location.pathname + window.location.search,
            message: event.message || "Unhandled window.onerror",
            stack: event.error?.stack || `${event.filename}:${event.lineno}`,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason =
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason || "Unhandled Promise Rejection");
        const stack =
          event.reason instanceof Error ? event.reason.stack : undefined;

        fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "client",
            route: window.location.pathname + window.location.search,
            message: reason,
            stack,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return null;
}