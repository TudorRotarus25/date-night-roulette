import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { restaurants, visits } from "@/db/schema";
import { cuisineFor } from "@/lib/cuisines";
import { restoreRestaurant } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function BenchedPage() {
  const benched = await db.select().from(restaurants).where(eq(restaurants.benched, true));

  const ids = benched.map((r) => r.id);
  const benchedVisits = ids.length
    ? await db.select().from(visits).where(inArray(visits.restaurantId, ids))
    : [];

  const stats = new Map<string, { count: number; lastVisitedAt: Date | null }>();
  for (const r of benched) stats.set(r.id, { count: 0, lastVisitedAt: null });
  for (const v of benchedVisits) {
    const s = stats.get(v.restaurantId)!;
    s.count += 1;
    if (!s.lastVisitedAt || v.visitedAt > s.lastVisitedAt) s.lastVisitedAt = v.visitedAt;
  }

  const sorted = [...benched].sort((a, b) => {
    const aTime = stats.get(a.id)?.lastVisitedAt?.getTime() ?? -Infinity;
    const bTime = stats.get(b.id)?.lastVisitedAt?.getTime() ?? -Infinity;
    return aTime - bTime;
  });

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold mb-6 text-center">Benched</h1>

        {sorted.length === 0 ? (
          <p className="text-center" style={{ color: "var(--text-secondary)" }}>
            Nothing benched — the whole list is in play.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((r) => {
              const cuisine = cuisineFor(r.cuisine);
              const s = stats.get(r.id)!;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-[14px] border px-4 py-3"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <Link href={`/restaurants/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{cuisine.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{r.name}</span>
                      <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                        {s.count === 0
                          ? "Never been"
                          : `${s.count} visit${s.count === 1 ? "" : "s"} · last ${s.lastVisitedAt!.toLocaleDateString()}`}
                      </span>
                    </span>
                  </Link>
                  <form action={restoreRestaurant.bind(null, r.id)}>
                    <button type="submit" className="btn btn-ghost" style={{ width: "auto", padding: "8px 14px" }}>
                      Restore
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center gap-5 text-sm mt-8" style={{ color: "var(--text-secondary)" }}>
          <Link href="/">← Spin</Link>
          <Link href="/add">Add</Link>
          <Link href="/restaurants">Pool</Link>
        </div>
      </div>
    </main>
  );
}
