import { Router } from "express";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { db, orders, carts, restaurants, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router = Router();

function formatOrder(order: typeof orders.$inferSelect & { customerName?: string | null }) {
  return {
    id: order.id,
    userId: order.userId,
    customerName: order.customerName ?? null,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    items: order.items,
    status: order.status,
    subtotal: parseFloat(order.subtotal),
    deliveryFee: parseFloat(order.deliveryFee),
    total: parseFloat(order.total),
    deliveryAddress: order.deliveryAddress,
    notes: order.notes ?? null,
    estimatedDelivery: order.estimatedDelivery ?? null,
    paymentStatus: (order as unknown as Record<string, string>).paymentStatus ?? "paid",
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { restaurantId, status, page = 1, limit = 20 } = parsed.data;
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [];

  if (req.user!.role === "customer") {
    // Customers only see their own orders — never restaurant orders
    conditions.push(eq(orders.userId, req.user!.userId));
  } else if (req.user!.role === "restaurant_owner") {
    if (restaurantId) {
      // Verify this restaurant belongs to the owner before returning its orders
      const [ownedRestaurant] = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, req.user!.userId)))
        .limit(1);
      if (!ownedRestaurant) {
        res.status(403).json({ error: "Forbidden: restaurant not owned by you" });
        return;
      }
      conditions.push(eq(orders.restaurantId, restaurantId));
    } else {
      // No restaurantId — return orders from ALL restaurants owned by this user
      const ownedRestaurants = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.ownerId, req.user!.userId));
      if (ownedRestaurants.length === 0) {
        res.json({ orders: [], total: 0, page: Number(page), limit: Number(limit) });
        return;
      }
      const ownedIds = ownedRestaurants.map((r) => r.id);
      conditions.push(inArray(orders.restaurantId, ownedIds));
    }
  } else if (req.user!.role === "admin") {
    // Admins can filter by restaurantId or see all
    if (restaurantId) {
      conditions.push(eq(orders.restaurantId, restaurantId));
    }
  }

  if (status) {
    conditions.push(eq(orders.status, status as typeof orders.$inferSelect["status"]));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db.select({ cnt: count() }).from(orders).where(where),
    db
      .select({
        id: orders.id,
        userId: orders.userId,
        restaurantId: orders.restaurantId,
        restaurantName: orders.restaurantName,
        items: orders.items,
        status: orders.status,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        deliveryAddress: orders.deliveryAddress,
        notes: orders.notes,
        estimatedDelivery: orders.estimatedDelivery,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(Number(limit))
      .offset(offset),
  ]);

  res.json({
    orders: rows.map(formatOrder),
    total: Number(totalResult[0]?.cnt ?? 0),
    page: Number(page),
    limit: Number(limit),
  });
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { restaurantId, deliveryAddress, notes } = parsed.data;

  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, req.user!.userId))
    .limit(1);

  if (!cart || cart.items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  if (cart.restaurantId !== restaurantId) {
    res.status(400).json({ error: "Cart restaurant mismatch" });
    return;
  }

  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const deliveryFee = parseFloat(cart.deliveryFee);
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + deliveryFee;

  const [order] = await db
    .insert(orders)
    .values({
      userId: req.user!.userId,
      restaurantId,
      restaurantName: restaurant.name,
      items: cart.items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image ?? null,
      })),
      status: "pending",
      subtotal: String(Math.round(subtotal * 100) / 100),
      deliveryFee: String(deliveryFee),
      total: String(Math.round(total * 100) / 100),
      deliveryAddress,
      notes,
      estimatedDelivery: restaurant.deliveryTime,
    })
    .returning();

  await db
    .update(carts)
    .set({
      items: [],
      restaurantId: null,
      restaurantName: null,
      deliveryFee: "0",
      updatedAt: new Date(),
    })
    .where(eq(carts.userId, req.user!.userId));

  res.status(201).json(formatOrder(order));
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      restaurantId: orders.restaurantId,
      restaurantName: orders.restaurantName,
      items: orders.items,
      status: orders.status,
      subtotal: orders.subtotal,
      deliveryFee: orders.deliveryFee,
      total: orders.total,
      deliveryAddress: orders.deliveryAddress,
      notes: orders.notes,
      estimatedDelivery: orders.estimatedDelivery,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, params.data.id))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Customers can only see their own orders
  if (req.user!.role === "customer" && order.userId !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Restaurant owners can only see orders for their restaurants
  if (req.user!.role === "restaurant_owner") {
    const [ownedRestaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(and(eq(restaurants.id, order.restaurantId), eq(restaurants.ownerId, req.user!.userId)))
      .limit(1);
    if (!ownedRestaurant) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  res.json(formatOrder(order));
});

router.patch("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify ownership for restaurant_owner
  if (req.user!.role === "restaurant_owner") {
    const [existingOrder] = await db
      .select({ restaurantId: orders.restaurantId })
      .from(orders)
      .where(eq(orders.id, params.data.id))
      .limit(1);
    if (existingOrder) {
      const [ownedRestaurant] = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(and(eq(restaurants.id, existingOrder.restaurantId), eq(restaurants.ownerId, req.user!.userId)))
        .limit(1);
      if (!ownedRestaurant) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
  }

  const [order] = await db
    .update(orders)
    .set({
      status: parsed.data.status as typeof orders.$inferSelect["status"],
      updatedAt: new Date(),
    })
    .where(eq(orders.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(formatOrder(order));
});

export default router;
