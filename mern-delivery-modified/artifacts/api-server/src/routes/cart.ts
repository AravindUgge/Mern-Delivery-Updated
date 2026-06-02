import { Router } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, carts, menuItems, restaurants, type CartItem } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  AddToCartBody,
  UpdateCartItemParams,
  UpdateCartItemBody,
  RemoveCartItemParams,
} from "@workspace/api-zod";

const router = Router();

function formatCartRow(cart: typeof carts.$inferSelect | null) {
  if (!cart || cart.items.length === 0) {
    return {
      restaurantId: null,
      restaurantName: null,
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
    };
  }

  const deliveryFee = parseFloat(cart.deliveryFee);
  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  return {
    restaurantId: cart.restaurantId ?? null,
    restaurantName: cart.restaurantName ?? null,
    items: cart.items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image ?? null,
      notes: i.notes ?? null,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    total,
  };
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, req.user!.userId))
    .limit(1);

  res.json(formatCartRow(cart ?? null));
});

router.post("/cart/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { menuItemId, restaurantId, quantity, notes } = parsed.data;

  const [menuItem] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, menuItemId))
    .limit(1);

  if (!menuItem) {
    res.status(404).json({ error: "Menu item not found" });
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

  const [existingCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, req.user!.userId))
    .limit(1);

  let currentItems: CartItem[] = existingCart?.items ?? [];

  if (
    existingCart?.restaurantId &&
    existingCart.restaurantId !== restaurantId &&
    currentItems.length > 0
  ) {
    currentItems = [];
  }

  const existingIndex = currentItems.findIndex((i) => i.menuItemId === menuItemId);
  if (existingIndex >= 0) {
    currentItems[existingIndex] = {
      ...currentItems[existingIndex],
      quantity: currentItems[existingIndex].quantity + quantity,
    };
  } else {
    currentItems.push({
      id: randomUUID(),
      menuItemId,
      name: menuItem.name,
      price: parseFloat(menuItem.price),
      quantity,
      image: menuItem.image ?? null,
      notes: notes ?? null,
    });
  }

  const [updatedCart] = await db
    .insert(carts)
    .values({
      userId: req.user!.userId,
      restaurantId,
      restaurantName: restaurant.name,
      deliveryFee: restaurant.deliveryFee,
      items: currentItems,
    })
    .onConflictDoUpdate({
      target: carts.userId,
      set: {
        restaurantId,
        restaurantName: restaurant.name,
        deliveryFee: restaurant.deliveryFee,
        items: currentItems,
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(formatCartRow(updatedCart));
});

router.patch("/cart/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, req.user!.userId))
    .limit(1);

  if (!cart) {
    res.status(404).json({ error: "Cart not found" });
    return;
  }

  let items = cart.items;
  const idx = items.findIndex((i) => i.id === params.data.itemId);
  if (idx < 0) {
    res.status(404).json({ error: "Item not found in cart" });
    return;
  }

  if (parsed.data.quantity <= 0) {
    items = items.filter((i) => i.id !== params.data.itemId);
  } else {
    items[idx] = { ...items[idx], quantity: parsed.data.quantity };
  }

  const clearRestaurant = items.length === 0;

  const [updatedCart] = await db
    .update(carts)
    .set({
      items,
      restaurantId: clearRestaurant ? null : cart.restaurantId,
      restaurantName: clearRestaurant ? null : cart.restaurantName,
      deliveryFee: clearRestaurant ? "0" : cart.deliveryFee,
      updatedAt: new Date(),
    })
    .where(eq(carts.userId, req.user!.userId))
    .returning();

  res.json(formatCartRow(updatedCart));
});

router.delete("/cart/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, req.user!.userId))
    .limit(1);

  if (!cart) {
    res.status(404).json({ error: "Cart not found" });
    return;
  }

  const items = cart.items.filter((i) => i.id !== params.data.itemId);
  const clearRestaurant = items.length === 0;

  const [updatedCart] = await db
    .update(carts)
    .set({
      items,
      restaurantId: clearRestaurant ? null : cart.restaurantId,
      restaurantName: clearRestaurant ? null : cart.restaurantName,
      deliveryFee: clearRestaurant ? "0" : cart.deliveryFee,
      updatedAt: new Date(),
    })
    .where(eq(carts.userId, req.user!.userId))
    .returning();

  res.json(formatCartRow(updatedCart));
});

router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
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

  res.json({ message: "Cart cleared" });
});

export default router;
