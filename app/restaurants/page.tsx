import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { cuisineFor } from "@/lib/cuisines";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const pool = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.benched, false))
    .orderBy(restaurants.name);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold mb-6 text-center">The pool</h1>

        {pool.length === 0 ? (
          <p className="text-center" style={{ color: "var(--text-secondary)" }}>
            Nothing in the pool right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pool.map((r) => {
              const cuisine = cuisineFor(r.cuisine);
              return (
                <li key={r.id}>
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="flex items-center gap-3 rounded-[14px] border px-4 py-3"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <span className="text-2xl">{cuisine.emoji}</span>
                    <span className="flex-1">
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                        {cuisine.label}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center gap-5 text-sm mt-8" style={{ color: "var(--text-secondary)" }}>
          <Link href="/">← Spin</Link>
          <Link href="/add">Add</Link>
          <Link href="/benched">Benched</Link>
        </div>
      </div>
    </main>
  );
}
