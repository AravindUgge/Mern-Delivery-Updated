import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { restaurants } from "./restaurants";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  restaurantName: text("restaurant_name").notNull(),
  items: jsonb("items").notNull().$type<OrderItem[]>(),
  status: orderStatusEnum("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  notes: text("notes"),
  estimatedDelivery: integer("estimated_delivery"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
