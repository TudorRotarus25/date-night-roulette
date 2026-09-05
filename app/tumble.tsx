"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cuisineFor } from "@/lib/cuisines";
import { resolveSpin, type SpinAction } from "@/lib/actions";

export type PoolRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  note: string | null;
};

type ReelItem = { em: string; nm: string };

const ITEM_H = 108;
const FILLER_COUNT = 34;

function rint(n: number) {
  return Math.floor(Math.random() * n);
}

function toReelItem(r: PoolRestaurant): ReelItem {
  return { em: cuisineFor(r.cuisine).emoji, nm: r.name };
}

export function Tumble({ pool: initialPool }: { pool: PoolRestaurant[] }) {
  const [pool, setPool] = useState(initialPool);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"idle" | "rolling" | "result">("idle");
  const [winner, setWinner] = useState<PoolRestaurant | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reelItems, setReelItems] = useState<ReelItem[]>([{ em: "🎲", nm: "Ready when you are" }]);
  const [rollId, setRollId] = useState(0);
  const [isPending, startTransition] = useTransition();

  const reelRef = useRef<HTMLDivElement>(null);
  const pendingWinnerRef = useRef<PoolRestaurant | null>(null);

  const available = pool.filter((r) => !excludedIds.has(r.id));

  function performRoll(poolArg: PoolRestaurant[], excludedArg: Set<string>) {
    const candidates = poolArg.filter((r) => !excludedArg.has(r.id));
    if (candidates.length === 0) {
      setPhase("idle");
      setWinner(null);
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
    setPhase("idle");
    setWinner(null);
    setConfirmed(false);
  }

  const showResult = phase === "result" && winner;

  return (
    <div className="flex flex-col items-center w-full">
      {!showResult && (
        <>
          <div className="slot-frame">
            <div className="slot-window" />
            <div className={`reel${phase === "rolling" ? " blur" : ""}`} ref={reelRef}>
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
        </>
      )}

      {showResult && (
        <div className="result">
          <div className="kicker">Tonight you&apos;re eating</div>
          <div className="em">{cuisineFor(winner.cuisine).emoji}</div>
          <div className="nm">{winner.name}</div>
          <div className="cz">{cuisineFor(winner.cuisine).label}</div>
          {winner.note && <div className="note">{winner.note}</div>}

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
