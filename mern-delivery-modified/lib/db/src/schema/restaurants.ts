import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cuisine: text("cuisine").notNull(),
  image: text("image"),
  coverImage: text("cover_image"),
  address: text("address").notNull(),
  phone: text("phone"),
  deliveryTime: integer("delivery_time").notNull().default(30),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  minOrder: numeric("min_order", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  isOpen: boolean("is_open").notNull().default(true),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;
