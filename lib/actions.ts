"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { restaurants, spins, visits } from "@/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { revalidateAll } from "@/lib/revalidate";

export type SpinAction = "went" | "not_tonight" | "again";

export async function addRestaurant(input: {
  name: string;
  cuisine: string;
  note?: string;
  sourceUrl?: string;
}) {
  await requireAuth();

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  await db.insert(restaurants).values({
    name,
    cuisine: input.cuisine.trim() || "unknown",
    note: input.note?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
  });

  revalidateAll();
}

export async function resolveSpin(restaurantId: string, action: SpinAction) {
  await requireAuth();

  const outcome = action === "went" ? "went" : "skipped";

  await db.insert(spins).values({ restaurantId, outcome });

  if (action === "went") {
    await db.insert(visits).values({ restaurantId });
    await db.update(restaurants).set({ benched: true }).where(eq(restaurants.id, restaurantId));
  } else if (action === "not_tonight") {
    await db.update(restaurants).set({ benched: true }).where(eq(restaurants.id, restaurantId));
  }

  revalidateAll();
}

export async function benchRestaurant(id: string) {
  await requireAuth();
  await db.update(restaurants).set({ benched: true }).where(eq(restaurants.id, id));
  revalidateAll();
}

export async function restoreRestaurant(id: string) {
  await requireAuth();
  await db.update(restaurants).set({ benched: false }).where(eq(restaurants.id, id));
  revalidateAll();
}

export async function updateRestaurant(
  id: string,
  input: { name: string; cuisine: string; note?: string },
) {
  await requireAuth();

  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  await db
    .update(restaurants)
    .set({
      name,
      cuisine: input.cuisine.trim() || "unknown",
      note: input.note?.trim() || null,
    })
    .where(eq(restaurants.id, id));

  revalidateAll();
  revalidatePath(`/restaurants/${id}`);
}

export async function deleteRestaurant(id: string) {
  await requireAuth();
  await db.delete(restaurants).where(eq(restaurants.id, id));
  revalidateAll();
  redirect("/restaurants");
}
