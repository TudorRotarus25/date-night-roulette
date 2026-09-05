"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Restaurant, Visit } from "@/db/schema";
import { CUISINES, cuisineFor } from "@/lib/cuisines";
import { benchRestaurant, deleteRestaurant, restoreRestaurant, updateRestaurant } from "@/lib/actions";

export function RestaurantDetail({
  restaurant,
  visits,
}: {
  restaurant: Restaurant;
  visits: Visit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(restaurant.name);
  const [cuisine, setCuisine] = useState(restaurant.cuisine === "unknown" ? "" : restaurant.cuisine);
  const [note, setNote] = useState(restaurant.note ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      await updateRestaurant(restaurant.id, { name, cuisine: cuisine || "unknown", note });
      router.refresh();
    });
  }

  function handleToggleBench() {
    startTransition(async () => {
      if (restaurant.benched) {
        await restoreRestaurant(restaurant.id);
      } else {
        await benchRestaurant(restaurant.id);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRestaurant(restaurant.id);
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-4xl">{cuisineFor(cuisine || restaurant.cuisine).emoji}</span>
          <h1 className="font-display text-2xl font-bold mt-1">{restaurant.name}</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            {restaurant.benched ? "Benched" : "In the pool"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          />

          <label className="text-sm font-semibold" htmlFor="cuisine">
            Cuisine
          </label>
          <select
            id="cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="">Not sure yet</option>
            {CUISINES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>

          <label className="text-sm font-semibold" htmlFor="note">
            Note
          </label>
          <textarea
            id="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-[14px] border px-4 py-3 text-base outline-none"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          />

          {restaurant.sourceUrl && (
            <a
              href={restaurant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-center"
              style={{ color: "var(--accent)" }}
            >
              Open in Maps →
            </a>
          )}

          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" disabled={isPending} onClick={handleToggleBench}>
              {restaurant.benched ? "Restore to the pool" : "Bench"}
            </button>
          </div>
        </div>

        {visits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold mb-2">Visit history</h2>
            <ul className="flex flex-col gap-1">
              {visits.map((v) => (
                <li key={v.id} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {v.visitedAt.toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 text-center">
          {confirmingDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm" style={{ color: "var(--accent)" }}>
                Delete {restaurant.name} for good? This can&apos;t be undone.
              </p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  disabled={isPending}
                  onClick={handleDelete}
                >
                  Yes, delete it
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-quiet"
              style={{ background: "none", border: "none", fontSize: 13 }}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete this restaurant
            </button>
          )}
        </div>

        <div className="flex justify-center gap-5 text-sm mt-8" style={{ color: "var(--text-secondary)" }}>
          <Link href="/">← Spin</Link>
          <Link href="/restaurants">Pool</Link>
          <Link href="/benched">Benched</Link>
        </div>
      </div>
    </main>
  );
}
