import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants, visits } from "@/db/schema";
import { RestaurantDetail } from "./detail";

export const dynamic = "force-dynamic";

export default async function RestaurantPage({ params }: PageProps<"/restaurants/[id]">) {
  const { id } = await params;

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
  if (!restaurant) notFound();

  const restaurantVisits = await db
    .select()
    .from(visits)
    .where(eq(visits.restaurantId, id))
    .orderBy(visits.visitedAt);

  return <RestaurantDetail restaurant={restaurant} visits={restaurantVisits} />;
}
