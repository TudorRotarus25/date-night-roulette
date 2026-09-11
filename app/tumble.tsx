"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { cuisineFor } from "@/lib/cuisines";
import { resolveSpin, type SpinAction } from "@/lib/actions";

export type PoolRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  note: string | null;
  sourceUrl: string | null;
};

type ReelItem = { em: string; nm: string };

const ITEM_H = 108;
const FILLER_COUNT = 34;
/** Repeats of the pool in the idle strip. 3 is enough to fill the frame. */
const IDLE_REPEATS = 3;
/** Seconds each restaurant spends crossing the window while idle. */
const IDLE_SECONDS_PER_ITEM = 2.6;

function rint(n: number) {
  return Math.floor(Math.random() * n);
}

function toReelItem(r: PoolRestaurant): ReelItem {
  return { em: cuisineFor(r.cuisine).emoji, nm: r.name };
}

/**
 * The pre-roll strip: the real pool, repeated, drifting past the window.
 * Repeating means translating by exactly one pool cycle lands on an identical
 * item, so the loop has no visible seam.
 */
function idleStrip(pool: PoolRestaurant[]): ReelItem[] {
  if (pool.length === 0) return [{ em: "🍽️", nm: "Nothing left in the pool" }];
  const out: ReelItem[] = [];
  for (let i = 0; i < IDLE_REPEATS * pool.length; i++) {
    out.push(toReelItem(pool[i % pool.length]));
  }
  return out;
}

export function Tumble({ pool: initialPool }: { pool: PoolRestaurant[] }) {
  const [pool, setPool] = useState(initialPool);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"idle" | "rolling" | "result">("idle");
  const [winner, setWinner] = useState<PoolRestaurant | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reelItems, setReelItems] = useState<ReelItem[]>(() => idleStrip(initialPool));
  const [rollId, setRollId] = useState(0);
  const [isPending, startTransition] = useTransition();

  const reelRef = useRef<HTMLDivElement>(null);
  const pendingWinnerRef = useRef<PoolRestaurant | null>(null);

  const available = pool.filter((r) => !excludedIds.has(r.id));

  /**
   * Drop the inline transform the roll left behind. The idle drift is a CSS
   * animation starting from translateY(0), so a stale transform would make it
   * jump on the first frame.
   */
  function backToIdle(poolArg: PoolRestaurant[]) {
    const reel = reelRef.current;
    if (reel) {
      reel.style.transition = "none";
      reel.style.transform = "";
    }
    setReelItems(idleStrip(poolArg));
    setPhase("idle");
    setWinner(null);
  }

  function performRoll(poolArg: PoolRestaurant[], excludedArg: Set<string>) {
    const candidates = poolArg.filter((r) => !excludedArg.has(r.id));
    if (candidates.length === 0) {
      backToIdle(poolArg);
      return;
    }
    const win = candidates[rint(candidates.length)];
    const strip: ReelItem[] = [];
    for (let i = 0; i < FILLER_COUNT; i++) {
      strip.push(toReelItem(poolArg[rint(poolArg.length)]));
    }
    strip.push(toReelItem(win));

    pendingWinnerRef.current = win;
    setReelItems(strip);
    setConfirmed(false);
    setPhase("rolling");
    setRollId((id) => id + 1);
  }

  useEffect(() => {
    if (phase !== "rolling") return;
    const reel = reelRef.current;
    const win = pendingWinnerRef.current;
    if (!reel || !win) return;

    const stripLen = reelItems.length;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    reel.style.transition = "none";
    reel.style.transform = "translateY(0)";
    reel.classList.add("blur");
    void reel.offsetHeight;

    if (reduceMotion) {
      reel.classList.remove("blur");
      reel.style.transform = `translateY(-${(stripLen - 1) * ITEM_H}px)`;
      setWinner(win);
      setPhase("result");
      return;
    }

    const t1 = setTimeout(() => {
      reel.style.transition = "transform 3.6s cubic-bezier(0.13,0.72,0.12,1)";
      reel.style.transform = `translateY(-${(stripLen - 1) * ITEM_H}px)`;
    }, 20);
    const t2 = setTimeout(() => reel.classList.remove("blur"), 3000);
    const t3 = setTimeout(() => {
      setWinner(win);
      setPhase("result");
    }, 3750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // Fires once per roll, keyed on rollId — reelItems/phase are read via refs/state at commit time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  function handleAction(action: SpinAction) {
    if (!winner || isPending) return;
    const id = winner.id;

    startTransition(async () => {
      await resolveSpin(id, action);
    });

    if (action === "went") {
      setPool((p) => p.filter((r) => r.id !== id));
      setConfirmed(true);
      return;
    }

    if (action === "not_tonight") {
      const nextPool = pool.filter((r) => r.id !== id);
      setPool(nextPool);
      performRoll(nextPool, excludedIds);
      return;
    }

    // "again": exclude for the rest of tonight only, never persisted.
    const nextExcluded = new Set(excludedIds);
    nextExcluded.add(id);
    setExcludedIds(nextExcluded);
    performRoll(pool, nextExcluded);
  }

  function finishForTonight() {
    backToIdle(pool);
    setConfirmed(false);
  }

  const showResult = phase === "result" && winner;

  return (
    <div className="flex flex-col items-center w-full">
      {!showResult && (
        <div className="spin-column">
          <div className="slot-frame">
            <div className="slot-window" />
            <div
              className={`reel${phase === "rolling" ? " blur" : ""}${
                phase === "idle" && pool.length > 0 ? " drifting" : ""
              }`}
              ref={reelRef}
              style={
                {
                  "--drift-dist": `${pool.length * ITEM_H}px`,
                  "--drift-time": `${Math.round(pool.length * IDLE_SECONDS_PER_ITEM * 10) / 10}s`,
                } as CSSProperties
              }
            >
              {reelItems.map((item, i) => (
                <div className="reel-item" key={i}>
                  <div className="em">{item.em}</div>
                  <div className="nm">{item.nm}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={phase === "rolling" || available.length === 0}
              onClick={() => performRoll(pool, excludedIds)}
            >
              {phase === "rolling" ? "Rolling…" : "Roll it"}
            </button>
          </div>
          <p className="pool-note">
            {available.length === 0
              ? "Nothing left to spin tonight."
              : `${available.length} in the pool`}
          </p>
        </div>
      )}

      {showResult && (
        <div className="result">
          <div className="kicker">Tonight you&apos;re eating</div>
          <div className="em">{cuisineFor(winner.cuisine).emoji}</div>
          <div className="nm">{winner.name}</div>
          <div className="cz">{cuisineFor(winner.cuisine).label}</div>
          {winner.note && <div className="note">{winner.note}</div>}
          {winner.sourceUrl && (
            <a
              href={winner.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm"
              style={{ color: "var(--accent)", marginTop: 12 }}
            >
              Open in Maps →
            </a>
          )}

          {confirmed ? (
            <>
              <div className="toast">🥂 Logged as a visit — and benched</div>
              <div className="btn-row">
                <button type="button" className="btn btn-primary" onClick={finishForTonight}>
                  Done
                </button>
              </div>
            </>
          ) : (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={isPending}
                onClick={() => handleAction("went")}
              >
                We&apos;re going!
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isPending}
                onClick={() => handleAction("not_tonight")}
              >
                Not tonight
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                disabled={isPending}
                onClick={() => handleAction("again")}
              >
                Spin again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
