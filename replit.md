# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `cd lib/db && pnpm run push-force` — push DB schema changes (dev only, use push-force)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Zaix Anime (`artifacts/zaix-anime`)
Full-screen anime/manga streaming & reading platform. Neon green & black UI.
- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter routing
- **Auth**: JWT-based (stored in localStorage as `zaix_token`), bcryptjs password hashing. Admin token payload: `{ admin, username, role }`. User token payload: `{ userId }`.
- **Pages**: Home (`/`), Watch (`/watch/:id`), Manga Detail (`/manga/:id`), In-App Reader (`/read/:mangaId/:chapterId`), Profile (`/profile/:username`), ToS (`/tos`), DMCA (`/dmca`), Contact (`/contact`)
- **Home Tabs**: Anime | Manga | Manhwa | Donghua — each tab loads its own content
- **Components**: Navbar, AnimeCard (with WatchlistButton), MangaCard, ChatBot, AuthModal, WatchlistButton (status dropdown: watching/completed/plan_to_watch/dropped), ReviewSection (with ReplySection)
- **Watchlist**: DB-backed for logged-in users (`useWatchlist` hook), localStorage fallback for guests
- **Continue Watching**: DB-backed watch progress for logged-in users on homepage
- **Dynamic Recommendations**: Genre-based on homepage using `/api/recommendations`
- **Auto-failover Player**: 15s countdown overlay on watch page; auto-switches provider; toast on switch
- **Review Replies**: Full reply thread on each review card (GET/POST/DELETE)
- **Footer**: Professional 4-column footer with legal links
- **SEO**: Full Open Graph + Twitter Card meta tags in `index.html`

### API Server (`artifacts/api-server`)
Express 5 REST API. All routes under `/api/`.
- **Auth routes**: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- **Auth**: JWT via `jsonwebtoken`, passwords hashed with `bcryptjs`. Helper: `extractUserId(req)` in `auth-helpers.ts`
- **DB Schema**: `users`, `watchlist`, `watch_progress`, `review_replies` tables
- **Watchlist**: GET /api/watchlist, GET /api/watchlist/check, POST /api/watchlist, DELETE /api/watchlist/:id
- **Progress**: GET /api/progress, GET /api/progress/all, POST /api/progress
- **Recommendations**: GET /api/recommendations?genres=Action&exclude=ids&limit=12 (Jikan genre search, deduped)
- **Profiles**: GET /api/users/:username/profile (public stats + watchlist)
- **Replies**: GET /api/reviews/:reviewId/replies, POST /api/reviews/:reviewId/replies, DELETE /api/reviews/replies/:replyId (registered BEFORE reviewsRouter to avoid route conflict)
- **Anime streaming**: GET /api/anime/stream?malId=&episode=&season= — resolves MAL ID → IMDB ID via ARM API, returns multiple embed provider URLs (2Embed, EmbedSu, VidSrc.xyz, SmashyStream)
- **Manga routes** (MangaDex API `https://api.mangadex.org`):
  - GET /api/manga/trending?type=manga|manhwa|manhua
  - GET /api/manga/search?q=...&type=...
  - GET /api/manga/:id
  - GET /api/manga/:id/chapters
  - GET /api/manga/chapter/:chapterId/pages?dataSaver=true|false

## Important Notes
- Route ordering in `routes/index.ts`: `repliesRouter` must come before `reviewsRouter` (both match `/api/reviews/:x/:y`)
- Orval `api-zod` output uses `mode: "single"` (not split) to avoid barrel-index conflicts
- `lib/api-zod/src/index.ts` exports only from `./generated/api` (no types re-export)
- Frontend auth-modal uses inline Zod schemas (not imported from `@workspace/api-zod`) since that lib is server-only
- DB push command: `cd lib/db && pnpm run push-force` (not the workspace-level `pnpm run push`)
