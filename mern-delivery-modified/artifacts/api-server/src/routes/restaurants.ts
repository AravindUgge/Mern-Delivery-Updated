import { Router } from "express";
import { eq, and, or, ilike, sql, desc, count } from "drizzle-orm";
import { db, restaurants, orders } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import {
  ListRestaurantsQueryParams,
  CreateRestaurantBody,
  UpdateRestaurantBody,
  GetRestaurantParams,
  UpdateRestaurantParams,
  DeleteRestaurantParams,
  GetRestaurantStatsParams,
} from "@workspace/api-zod";

const router = Router();

function formatRestaurant(r: typeof restaurants.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    cuisine: r.cuisine,
    image: r.image ?? null,
    coverImage: r.coverImage ?? null,
    address: r.address,
    phone: r.phone ?? null,
    deliveryTime: r.deliveryTime,
    deliveryFee: parseFloat(r.deliveryFee),
    minOrder: parseFloat(r.minOrder),
    rating: parseFloat(r.rating),
    reviewCount: r.reviewCount,
    isOpen: r.isOpen,
    ownerId: r.ownerId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/restaurants", async (req, res): Promise<void> => {
  const parsed = ListRestaurantsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, page = 1, limit = 20 } = parsed.data;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [];
  if (search) {
    conditions.push(
      or(ilike(restaurants.name, `%${search}%`), ilike(restaurants.cuisine, `%${search}%`)),
    );
  }
  if (category) {
    conditions.push(ilike(restaurants.cuisine, `%${category}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(restaurants).where(where),
    db
      .select()
      .from(restaurants)
      .where(where)
      .orderBy(desc(restaurants.rating))
      .limit(Number(limit))
      .offset(offset),
  ]);

  res.json({
    restaurants: rows.map(formatRestaurant),
    total: Number(totalResult[0]?.count ?? 0),
    page: Number(page),
    limit: Number(limit),
  });
});

router.post(
  "/restaurants",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateRestaurantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [restaurant] = await db
      .insert(restaurants)
      .values({
        ...parsed.data,
        deliveryFee: String(parsed.data.deliveryFee ?? 0),
        minOrder: String(parsed.data.minOrder ?? 0),
        ownerId: req.user!.userId,
      })
      .returning();

    res.status(201).json(formatRestaurant(restaurant));
  },
);

router.get("/restaurants/:id", async (req, res): Promise<void> => {
  const params = GetRestaurantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, params.data.id))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json(formatRestaurant(restaurant));
});

router.patch(
  "/restaurants/:id",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = UpdateRestaurantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateRestaurantBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.deliveryFee !== undefined) updates["deliveryFee"] = String(parsed.data.deliveryFee);
    if (parsed.data.minOrder !== undefined) updates["minOrder"] = String(parsed.data.minOrder);

    const [restaurant] = await db
      .update(restaurants)
      .set(updates)
      .where(eq(restaurants.id, params.data.id))
      .returning();

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    res.json(formatRestaurant(restaurant));
  },
);

router.delete(
  "/restaurants/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = DeleteRestaurantParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [deleted] = await db
      .delete(restaurants)
      .where(eq(restaurants.id, params.data.id))
      .returning({ id: restaurants.id });

    if (!deleted) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    res.json({ message: "Restaurant deleted" });
  },
);

router.get("/restaurants/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetRestaurantStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const restaurantId = params.data.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [restaurantRow, allOrders, todayOrdersResult] = await Promise.all([
    db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1),
    db.select().from(orders).where(eq(orders.restaurantId, restaurantId)),
    db
      .select({ cnt: count() })
      .from(orders)
      .where(and(eq(orders.restaurantId, restaurantId), sql`${orders.createdAt} >= ${today}`)),
  ]);

  const restaurant = restaurantRow[0];
  const pendingOrders = allOrders.filter((o) =>
    ["pending", "confirmed", "preparing"].includes(o.status),
  ).length;

  const totalRevenue = allOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  const todayOrders = allOrders.filter((o) => o.createdAt >= today);
  const todayRevenue = todayOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + parseFloat(o.total), 0);

  res.json({
    totalOrders: allOrders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgRating: restaurant ? parseFloat(restaurant.rating) : 0,
    pendingOrders,
    todayOrders: Number(todayOrdersResult[0]?.cnt ?? 0),
    todayRevenue: Math.round(todayRevenue * 100) / 100,
  });
});

export default router;
