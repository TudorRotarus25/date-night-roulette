import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { cuisineFor } from "@/lib/cuisines";
import { RefreshPool } from "./refresh";

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
        {/* Absolute, not a flex row: keeps the title centred whatever the button's width. */}
        <div className="relative mb-6">
          <h1 className="font-display text-2xl font-bold text-center">The pool</h1>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <RefreshPool />
          </div>
        </div>

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
                  <Link href={`/restaurants/${r.id}`} className="row">
                    <span className="row-em">{cuisine.emoji}</span>
                    <span className="row-body">
                      <span className="row-nm">{r.name}</span>
                      <span className="row-sub">{cuisine.label}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
