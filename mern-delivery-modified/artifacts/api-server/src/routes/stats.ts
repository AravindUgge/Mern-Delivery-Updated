import { Router } from "express";
import { eq, sql, count, sum } from "drizzle-orm";
import { db, users, restaurants, orders, menuItems } from "@workspace/db";

const router = Router();

router.get("/stats/platform", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsersResult,
    totalRestaurantsResult,
    activeRestaurantsResult,
    revenueResult,
    totalOrdersResult,
    todayOrdersResult,
  ] = await Promise.all([
    db.select({ cnt: count() }).from(users),
    db.select({ cnt: count() }).from(restaurants),
    db.select({ cnt: count() }).from(restaurants).where(eq(restaurants.isOpen, true)),
    db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(eq(orders.status, "delivered")),
    db.select({ cnt: count() }).from(orders),
    db
      .select({ cnt: count() })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${today}`),
  ]);

  res.json({
    totalUsers: Number(totalUsersResult[0]?.cnt ?? 0),
    totalRestaurants: Number(totalRestaurantsResult[0]?.cnt ?? 0),
    totalOrders: Number(totalOrdersResult[0]?.cnt ?? 0),
    totalRevenue: Math.round(Number(revenueResult[0]?.total ?? 0) * 100) / 100,
    activeRestaurants: Number(activeRestaurantsResult[0]?.cnt ?? 0),
    todayOrders: Number(todayOrdersResult[0]?.cnt ?? 0),
  });
});

router.get("/stats/popular-items", async (_req, res): Promise<void> => {
  const allOrders = await db
    .select({ items: orders.items, restaurantId: orders.restaurantId, restaurantName: orders.restaurantName })
    .from(orders);

  const itemMap = new Map<
    string,
    { name: string; image: string | null; restaurantId: string; restaurantName: string; orderCount: number; price: number }
  >();

  for (const order of allOrders) {
    for (const item of order.items) {
      const existing = itemMap.get(item.menuItemId);
      if (existing) {
        existing.orderCount += item.quantity;
      } else {
        itemMap.set(item.menuItemId, {
          name: item.name,
          image: item.image ?? null,
          restaurantId: order.restaurantId,
          restaurantName: order.restaurantName,
          orderCount: item.quantity,
          price: item.price,
        });
      }
    }
  }

  const sorted = [...itemMap.entries()]
    .sort((a, b) => b[1].orderCount - a[1].orderCount)
    .slice(0, 10);

  const results = await Promise.all(
    sorted.map(async ([menuItemId, data]) => {
      const [menuItem] = await db
        .select({ image: menuItems.image })
        .from(menuItems)
        .where(eq(menuItems.id, menuItemId))
        .limit(1);

      return {
        menuItemId,
        name: data.name,
        restaurantName: data.restaurantName,
        orderCount: data.orderCount,
        price: data.price,
        image: menuItem?.image ?? data.image,
      };
    }),
  );

  res.json(results);
});

export default router;
