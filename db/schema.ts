import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull().default("unknown"),
  note: text("note"),
  sourceUrl: text("source_url"),
  benched: boolean("benched").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spins = pgTable("spins", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  outcome: text("outcome", { enum: ["went", "skipped"] }).notNull(),
  spunAt: timestamp("spun_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type Spin = typeof spins.$inferSelect;
