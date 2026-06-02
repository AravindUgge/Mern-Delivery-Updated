import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { restaurants } from "./restaurants";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  notes?: string | null;
}

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  restaurantName: text("restaurant_name"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  items: jsonb("items").notNull().$type<CartItem[]>().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Cart = typeof carts.$inferSelect;
export type InsertCart = typeof carts.$inferInsert;
