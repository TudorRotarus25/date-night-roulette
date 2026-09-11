"use client";

import { useSyncExternalStore } from "react";

/** Never changes while the page is open — tonight is tonight. */
function subscribe() {
  return () => {};
}

function localDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** The server has no timezone worth trusting, so it renders nothing. */
function serverDate() {
  return "";
}

/**
 * Tonight's date, in the viewer's own timezone.
 *
 * Deliberately client-only: the server renders UTC, so a Friday-evening spin
 * would say "Saturday" to anyone west of it.
 */
export function Today() {
  const label = useSyncExternalStore(subscribe, localDate, serverDate);

  return <p className="kicker-date">{label}</p>;
}
