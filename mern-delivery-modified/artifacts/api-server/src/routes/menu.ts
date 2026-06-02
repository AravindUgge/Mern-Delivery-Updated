import { Router } from "express";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, menuCategories, menuItems } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import {
  ListCategoriesParams,
  CreateCategoryParams,
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
  ListMenuItemsParams,
  ListMenuItemsQueryParams,
  CreateMenuItemParams,
  CreateMenuItemBody,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  DeleteMenuItemParams,
} from "@workspace/api-zod";

const router = Router();

function formatCategory(c: typeof menuCategories.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    restaurantId: c.restaurantId,
    sortOrder: c.sortOrder,
  };
}

function formatMenuItem(item: typeof menuItems.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    price: parseFloat(item.price),
    image: item.image ?? null,
    restaurantId: item.restaurantId,
    categoryId: item.categoryId ?? null,
    isAvailable: item.isAvailable,
    isPopular: item.isPopular,
    isVegetarian: item.isVegetarian,
    calories: item.calories ?? null,
    prepTime: item.prepTime ?? null,
  };
}

router.get("/restaurants/:restaurantId/categories", async (req, res): Promise<void> => {
  const params = ListCategoriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.restaurantId, params.data.restaurantId))
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));

  res.json(rows.map(formatCategory));
});

router.post(
  "/restaurants/:restaurantId/categories",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = CreateCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [category] = await db
      .insert(menuCategories)
      .values({ ...parsed.data, restaurantId: params.data.restaurantId })
      .returning();

    res.status(201).json(formatCategory(category));
  },
);

router.patch(
  "/categories/:id",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = UpdateCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [category] = await db
      .update(menuCategories)
      .set(parsed.data)
      .where(eq(menuCategories.id, params.data.id))
      .returning();

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(formatCategory(category));
  },
);

router.delete(
  "/categories/:id",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = DeleteCategoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [deleted] = await db
      .delete(menuCategories)
      .where(eq(menuCategories.id, params.data.id))
      .returning({ id: menuCategories.id });

    if (!deleted) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({ message: "Category deleted" });
  },
);

router.get("/restaurants/:restaurantId/menu", async (req, res): Promise<void> => {
  const params = ListMenuItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListMenuItemsQueryParams.safeParse(req.query);
  const conditions = [eq(menuItems.restaurantId, params.data.restaurantId)];

  if (query.success && query.data.categoryId) {
    conditions.push(eq(menuItems.categoryId, query.data.categoryId));
  }

  const rows = await db
    .select()
    .from(menuItems)
    .where(and(...conditions))
    .orderBy(desc(menuItems.isPopular), asc(menuItems.name));

  res.json(rows.map(formatMenuItem));
});

router.post(
  "/restaurants/:restaurantId/menu",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = CreateMenuItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateMenuItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [item] = await db
      .insert(menuItems)
      .values({
        ...parsed.data,
        price: String(parsed.data.price),
        restaurantId: params.data.restaurantId,
      })
      .returning();

    res.status(201).json(formatMenuItem(item));
  },
);

router.patch(
  "/menu/:id",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = UpdateMenuItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateMenuItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.price !== undefined) updates["price"] = String(parsed.data.price);

    const [item] = await db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, params.data.id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    res.json(formatMenuItem(item));
  },
);

router.delete(
  "/menu/:id",
  requireAuth,
  requireRole("restaurant_owner", "admin"),
  async (req, res): Promise<void> => {
    const params = DeleteMenuItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [deleted] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, params.data.id))
      .returning({ id: menuItems.id });

    if (!deleted) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }

    res.json({ message: "Menu item deleted" });
  },
);

export default router;
