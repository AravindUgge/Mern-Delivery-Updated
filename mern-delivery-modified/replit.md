# QuickBite

A production-ready food delivery app where customers browse restaurants and order food, restaurant owners manage orders, and admins oversee the platform.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/food-delivery run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to Neon (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **API**: Express 5 + JWT auth via `SESSION_SECRET`
- **DB**: Neon PostgreSQL + Drizzle ORM (secrets: `MONGODB_URI` renamed → `SESSION_SECRET` + `MONGODB_URI` as Neon `DATABASE_URL`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Frontend**: React + Vite + TanStack Query + shadcn/ui + Tailwind
- **Routing**: wouter

## Where things live

- `lib/db/src/schema/` — all Drizzle schemas (users, restaurants, menu, orders, cart, reviews)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/` — generated TanStack Query hooks + Zod schemas (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, restaurants, menu, cart, orders, reviews, stats)
- `artifacts/food-delivery/src/` — React frontend
  - `lib/auth.tsx` — JWT auth context (token in localStorage key `qb_token`)
  - `components/header.tsx` — sticky nav with cart badge
  - `pages/` — home, restaurant, cart, orders, order-detail, login, register, dashboard, admin

## Architecture decisions

- **JWT stored in localStorage** (`qb_token`): `setAuthTokenGetter` from api-client-react wires it into every fetch automatically.
- **Drizzle numeric columns return strings from Neon** — all API routes use `parseFloat()` when formatting numeric fields in responses.
- **Cart stored as JSONB** — single row per user with items array; upserted via `onConflictDoUpdate`.
- **Codegen barrel fix** — after `orval`, `lib/api-zod/src/index.ts` is overwritten with `export * from "./generated/api"` (hardcoded in codegen npm script, do NOT revert).
- **Orval mutation convention**: simple body → `mutate({ data: body })`; path param + body → `mutate({ pathParam, data: body })`. TQ v5 requires `queryKey` in `UseQueryOptions` — always pass the generated `getXxxQueryKey()` helper alongside `enabled`.

## Product

- **Customers**: browse 7+ restaurants, search by name/cuisine, filter by category, view menus with photos and nutrition info, add to cart, checkout with delivery address, track order status
- **Restaurant owners**: view stats (orders, revenue, ratings), manage incoming orders, advance order through status workflow
- **Admin**: platform-wide stats (users, restaurants, orders, revenue), popular items leaderboard, restaurant directory

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@quickbite.com | admin123 |
| Restaurant owner | mario@qb.com | pass123 |
| Restaurant owner | chen@qb.com | pass123 |
| Customer | (register new) | — |

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use individual workflow restarts.
- `pnpm --filter @workspace/food-delivery run typecheck` to verify frontend (not `build`, which needs PORT env).
- `OrderStatusUpdateStatus` enum does NOT include `"ready"` — valid values: pending, confirmed, preparing, out_for_delivery, delivered, cancelled.
- Drizzle `push` targets Neon via `DATABASE_URL` secret (same value as `MONGODB_URI` secret in Replit — the secret was repurposed).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
