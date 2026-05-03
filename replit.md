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

## Workflows
- **Start application** (webview, port 5000) — `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/zaix-anime run dev`
- **Backend API** (console, port 8080) — `PORT=8080 pnpm --filter @workspace/api-server run dev`

## Important Notes on Server Setup
- Express `app.listen` must use `"0.0.0.0"` as host to bind IPv4 (Replit port detection is IPv4 only)
- `vite.config.ts` defaults: `PORT ?? "5000"`, `BASE_PATH ?? "/"` — no throw if env vars missing
- DB push: `cd lib/db && pnpm run push-force`
- Admin usernames accepted: `zaix` and `adminzaik` (password: `darkdevil_300`)

## Artifacts

### Zaix Anime (`artifacts/zaix-anime`)
Full-screen anime/manga streaming & reading platform. Neon green & black UI.
- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter routing
- **Auth**: JWT-based (stored in localStorage as `zaix_token`), bcryptjs password hashing. Admin token payload: `{ admin, username, role }`. User token payload: `{ userId }`.
- **Pages**: Home (`/`), Watch (`/watch/:id`), Manga Detail (`/manga/:id`), In-App Reader (`/read/:mangaId/:chapterId`), Profile (`/profile/:username`), ToS (`/tos`), DMCA (`/dmca`), Contact (`/contact`)
- **Doraemon Universe Row**: Dedicated horizontal scrolling row on homepage (always visible above content tabs). Fetches Doraemon TV + Movies from Jikan via `/api/anime/search?q=doraemon`. Sky Blue (#00bfff) neon glow title, 🇮🇳 HI badge on each card, sky-blue hover effects via `accentColor` prop on AnimeCard.
- **Home Tabs**: Anime | Manga | Manhwa | Donghua — each tab loads its own content
- **Components**: Navbar (glassmorphism on scroll), AnimeCard (with WatchlistButton), MangaCard, ChatBot, AuthModal (glassmorphism), WatchlistButton (status dropdown), ReviewSection (with ReplySection), NotificationBell (DB-backed for logged-in, localStorage fallback for guests)
- **Watchlist**: DB-backed for logged-in users (`useWatchlist` hook), localStorage fallback for guests
- **Continue Watching**: DB-backed watch progress for logged-in users on homepage
- **Dynamic Recommendations**: Genre-based on homepage using `/api/recommendations`
- **Auto-failover Player**: 15s countdown overlay on watch page; auto-switches provider; toast on switch
- **Review Replies**: Full reply thread on each review card (GET/POST/DELETE)
- **Footer**: Professional 4-column footer with legal links
- **SEO**: Full Open Graph + Twitter Card meta tags in `index.html`

### Video Player Features (watch.tsx)
- **Primary Provider**: VidSrc.to — tested 200 OK, no X-Frame-Options, most reliable
- **Provider list** (in order): VidSrc.to, HiAnime HLS (self-hosted, may fail gracefully), AutoEmbed, VidSrc, 2Embed, MoviesAPI, VidSrc Pro, AnimePahe
- **iframe settings**: `referrerPolicy="no-referrer"`, full `sandbox` attribute, `allow="autoplay; fullscreen; picture-in-picture; encrypted-media"`
- **Self-hosted HLS player** (`/api/anime/player`): Attempts HiAnime via @consumet/extensions; shows graceful error if unavailable (HiAnime uses CloudFlare protection)
- **Skip Intro**: Overlay button appears at 85–110s after episode loads (press I or click)
- **Skip Outro**: Overlay button appears at 1260–1380s (press O or click)
- **Keyboard Shortcuts**: `F` = fullscreen player container, `?` = toggle hints panel, `I` = skip intro, `O` = skip outro, `Esc` = close panels
- **Auto-failover**: 15s timer auto-switches to next provider with toast notification
- **Auto-play**: Optional countdown to next episode
- **Admin Debug Panel**: Visible only to admin above the player — shows active provider, IMDB ID, MAL ID, episode, total providers, and full embed URL
- **Provider buttons**: Dynamically populated from stream API response (no more hardcoded static list)

### Admin Panel (`/xadmin`)
- **Maintenance Mode**: Toggle that shows "Coming Back Soon" to all non-admin users
- **Analytics**: User count, review count, banned users, trending tags
- **Global Alert**: Scrolling announcement visible site-wide
- **Reviews**: Manage/delete any review
- **Users**: Ban/unban by username
- **Reports**: View, resolve, or delete moderation reports
- **Trending**: Tag anime as Trending or Hot

### Notification System
- **DB-backed** for logged-in users (notifications table in Postgres)
- **localStorage** fallback for guests
- **Episode Detection**: On login, checks watchlist against last known episode counts (localStorage cache). Creates DB notification if new episodes detected.
- **Pulsing bell badge** in navbar when unread count > 0
- **Actions**: Mark single read, mark all read, clear all

### Discord Webhook (`DISCORD_WEBHOOK_URL` env var)
- Triggers on: new user registration, 5-star review submitted
- Utility: `artifacts/api-server/src/utils/discord.ts`
- Set env var `DISCORD_WEBHOOK_URL` to activate (silent no-op if not set)

### UI Polish
- **Glassmorphism**: Navbar (on scroll), auth modal, notification bell panel use `backdrop-filter: blur(24–32px) saturate(200%)`
- **Click animations**: `button, [role="button"]` globally gets `active:scale-[0.96] transition-transform` via index.css
- **Glass utilities**: `.glass` and `.glass-strong` CSS classes available globally

### XP & Leveling System
- **DB**: `users.total_xp` integer column (default 0) — added via schema migration
- **Formula**: `level = floor(sqrt(totalXp / 100))`. Level 1 = 100 XP, Level 2 = 400 XP, Level n = n² × 100 XP
- **Earning XP**: 10 XP per 60 seconds watched (heartbeat on `playerSeconds % 60 === 0`); 50 XP per review submitted (authenticated only)
- **Level Badges** (`src/components/level-badge.tsx`): Level 1–10 = 🥉 Bronze, Level 11–30 = 🥈 Silver, Level 31–60 = 💎 Platinum, Level 61+ = 🔥 Master
- **Admin exclusivity**: Gold Crown (`AdminCrown`) shown ONLY for `zaix` username — never shows a level badge
- **Badges shown in**: Review list (from `userTotalXp` JOIN), Live Chat (static on bots, real level for current user), Profile header
- **Level-up toast**: `useXp` hook detects level change and shows styled neon toast via `sonner`
- **XP Progress Bar**: Profile page shows animated fill bar with XP numbers and tier-colored gradient
- **Hook**: `src/hooks/use-xp.ts` — `useXp(isLoggedIn)` returns `{ totalXp, level, progressPct, awardXp, refetchXp }`
- **API**: GET /api/xp (auth), POST /api/xp/award `{ amount: 1–100 }` (auth)

### API Server (`artifacts/api-server`)
Express 5 REST API. All routes under `/api/`.
- **Auth routes**: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- **Auth**: JWT via `jsonwebtoken`, passwords hashed with `bcryptjs`. Helper: `extractUserId(req)` in `src/lib/auth-helpers.ts`
- **DB Schema**: `users` (with `total_xp`), `watchlist`, `watch_progress`, `review_replies`, `notifications` tables
- **Watchlist**: GET /api/watchlist, GET /api/watchlist/check, POST /api/watchlist, DELETE /api/watchlist/:id
- **Progress**: GET /api/progress, GET /api/progress/all, POST /api/progress
- **Recommendations**: GET /api/recommendations?genres=Action&exclude=ids&limit=12 (Jikan genre search, deduped)
- **Profiles**: GET /api/users/:username/profile (public stats + watchlist)
- **Replies**: GET /api/reviews/:reviewId/replies, POST /api/reviews/:reviewId/replies, DELETE /api/reviews/replies/:replyId (registered BEFORE reviewsRouter to avoid route conflict)
- **Notifications**: GET /api/notifications, POST /api/notifications, PATCH /api/notifications/:id/read, POST /api/notifications/read-all, DELETE /api/notifications
- **Anime streaming**: GET /api/anime/stream?malId=&episode=&season= — resolves MAL ID → IMDB ID via ARM API, returns multiple embed provider URLs
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
- `DISCORD_WEBHOOK_URL` env var must be set for Discord notifications to fire
