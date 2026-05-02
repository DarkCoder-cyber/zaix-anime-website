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
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Zaix Anime (`artifacts/zaix-anime`)
Full-screen anime/manga streaming & reading platform. Neon green & black UI.
- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter routing
- **Auth**: JWT-based (stored in localStorage as `zaix_token`), bcryptjs password hashing
- **Pages**: Home (`/`), Watch (`/watch/:id`), Manga Detail (`/manga/:id`), In-App Reader (`/read/:mangaId/:chapterId`)
- **Home Tabs**: Anime | Manga | Manhwa | Donghua — each tab loads its own content
- **Components**: Navbar (multi-type search: Anime+Manga+Manhwa tabs), AnimeCard, MangaCard, ChatBot (API-backed smart assistant), AuthModal, WatchPage (multi-provider), MangaPage (chapter list), ReadPage (scroll + paginated reader)
- **Search**: Global search bar supports Anime (Jikan), Manga, and Manhwa (MangaDex) with type filter tabs in the dropdown

### API Server (`artifacts/api-server`)
Express 5 REST API.
- **Auth routes**: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- **Auth**: JWT via `jsonwebtoken`, passwords hashed with `bcryptjs`
- **DB Schema**: `users` table (id, username, email, password_hash, created_at)
- **Anime streaming**: GET /api/anime/stream?malId=&episode=&season= — resolves MAL ID → IMDB ID via ARM API, returns multiple embed provider URLs (2Embed, EmbedSu, VidSrc.xyz, SmashyStream). Falls back to AnimePahe link if no IMDB mapping exists.
- **Manga routes** (MangaDex API `https://api.mangadex.org`):
  - GET /api/manga/trending?type=manga|manhwa|manhua — popular titles by language
  - GET /api/manga/search?q=...&type=... — search with optional type filter
  - GET /api/manga/:id — manga detail with cover, author, genres
  - GET /api/manga/:id/chapters — English chapter list (ordered asc)
  - GET /api/manga/chapter/:chapterId/pages?dataSaver=true|false — CDN page URLs for reader

## Important Notes
- Orval `api-zod` output uses `mode: "single"` (not split) to avoid barrel-index conflicts with TypeScript interfaces
- `lib/api-zod/src/index.ts` exports only from `./generated/api` (no types re-export)
- Frontend auth-modal uses inline Zod schemas (not imported from `@workspace/api-zod`) since that lib is server-only
