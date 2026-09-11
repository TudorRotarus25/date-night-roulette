import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { Tumble } from "./tumble";
import { Today } from "./today";

export const dynamic = "force-dynamic";

export default async function Home() {
  const pool = await db.select().from(restaurants).where(eq(restaurants.benched, false));

  const needsCuisine = pool.some((r) => r.cuisine === "unknown");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10 gap-2">
      <header className="text-center mb-2">
        <Today />
        <h1 className="font-display home-question">
          Where are we
          <br />
          eating tonight?
        </h1>
      </header>

      {needsCuisine && (
        <Link
          href="/restaurants"
          className="text-xs font-semibold px-3 py-1.5 rounded-full mb-2"
          style={{
            background: "var(--surface-hover)",
            color: "var(--accent)",
            border: "1px solid var(--border)",
          }}
        >
          Some restaurants still need a cuisine →
        </Link>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {pool.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p style={{ color: "var(--text-secondary)" }}>
              Nothing to spin yet. Add the first place you want to try.
            </p>
            <Link href="/add" className="btn btn-primary" style={{ display: "inline-block", width: "auto" }}>
              Add a restaurant
            </Link>
          </div>
        ) : (
          <Tumble pool={pool} />
        )}
      </div>
    </main>
  );
}
