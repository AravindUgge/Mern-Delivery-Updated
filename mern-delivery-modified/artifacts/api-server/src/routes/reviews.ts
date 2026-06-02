import { Router } from "express";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { db, reviews, restaurants, users } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  ListReviewsParams,
  CreateReviewParams,
  CreateReviewBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/restaurants/:restaurantId/reviews", async (req, res): Promise<void> => {
  const params = ListReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.restaurantId, params.data.restaurantId))
    .orderBy(desc(reviews.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userAvatar: r.userAvatar ?? null,
      restaurantId: r.restaurantId,
      rating: r.rating,
      comment: r.comment ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post(
  "/restaurants/:restaurantId/reviews",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CreateReviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = CreateReviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const existing = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, req.user!.userId),
          eq(reviews.restaurantId, params.data.restaurantId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "You have already reviewed this restaurant" });
      return;
    }

    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, params.data.restaurantId))
      .limit(1);

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    const [currentUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    const [review] = await db
      .insert(reviews)
      .values({
        userId: req.user!.userId,
        userName: currentUser?.name ?? "Anonymous",
        restaurantId: params.data.restaurantId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      })
      .returning();

    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        total: count(),
      })
      .from(reviews)
      .where(eq(reviews.restaurantId, params.data.restaurantId));

    await db
      .update(restaurants)
      .set({
        rating: String(Math.round(Number(stats?.avgRating ?? 0) * 10) / 10),
        reviewCount: Number(stats?.total ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, params.data.restaurantId));

    res.status(201).json({
      id: review.id,
      userId: review.userId,
      userName: review.userName,
      userAvatar: review.userAvatar ?? null,
      restaurantId: review.restaurantId,
      rating: review.rating,
      comment: review.comment ?? null,
      createdAt: review.createdAt.toISOString(),
    });
  },
);

export default router;
