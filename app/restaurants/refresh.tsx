"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Don't refetch again if we already did, this recently. */
const THROTTLE_MS = 10_000;

/**
 * Re-reads the pool. Every page is force-dynamic and queries Postgres directly,
 * so router.refresh() genuinely returns new rows — there is no cache to bust.
 *
 * Needed because restaurants can arrive from outside this tab: the other phone's
 * Maps share sheet posts to /api/intake, and an installed PWA sits in the
 * background for days.
 */
export function RefreshPool() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lastRefresh = useRef(0);

  const refresh = useCallback(() => {
    lastRefresh.current = Date.now();
    startTransition(() => router.refresh());
  }, [router]);

  // Coming back to the app is the most likely moment for the list to be stale.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < THROTTLE_MS) return;
      refresh();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refresh]);

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={refresh}
      disabled={isPending}
      aria-busy={isPending}
      aria-label="Refresh the pool"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-3.4-7.05" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
