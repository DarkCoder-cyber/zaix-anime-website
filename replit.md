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
Full-screen anime streaming website. Neon green & black UI, Naruto hero background.
- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter routing
- **Auth**: JWT-based (stored in localStorage as `zaix_token`), bcryptjs password hashing
- **Pages**: Home (`/`), Watch (`/watch/:id`)
- **Components**: Navbar, Hero, AnimeCard, ChatBot (glassmorphism AI chat), AuthModal, WatchPage video player

### API Server (`artifacts/api-server`)
Express 5 REST API.
- **Auth routes**: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- **Auth**: JWT via `jsonwebtoken`, passwords hashed with `bcryptjs`
- **DB Schema**: `users` table (id, username, email, password_hash, created_at)
- **Anime streaming**: GET /api/anime/stream?malId=&episode=&season= — resolves MAL ID → IMDB ID via ARM API, returns multiple embed provider URLs (2Embed, EmbedSu, VidSrc.xyz, SmashyStream). Falls back to AnimePahe link if no IMDB mapping exists.

## Important Notes
- Orval `api-zod` output uses `mode: "single"` (not split) to avoid barrel-index conflicts with TypeScript interfaces
- `lib/api-zod/src/index.ts` exports only from `./generated/api` (no types re-export)
- Frontend auth-modal uses inline Zod schemas (not imported from `@workspace/api-zod`) since that lib is server-only
