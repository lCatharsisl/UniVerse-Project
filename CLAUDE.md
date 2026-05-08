# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniVerse is a full-stack university campus platform — a monorepo with a React/Vite frontend and an Express/TypeScript backend, backed by PostgreSQL via Supabase and Drizzle ORM.

## Commands

### Root (monorepo orchestration)
```bash
npm run install:all      # Install all workspace dependencies
npm run dev              # Run frontend + backend; Vite listens on 0.0.0.0:5173 (phone/tablet: http://<PC-LAN-IP>:5173)
npm run dev:lan          # Same + prints LAN URLs in the terminal and enables Vite strictPort
npm run ci               # Full CI: backend build/test + frontend lint/test/build
npm run sync:frontend-env  # Propagate BACKEND_PUBLIC_URL into frontend/.env
```

Mobil veya başka cihazdan `http://<bilgisayar-LAN-IP>:5173` ile bağlanırken backend’in `CORS_ORIGINS` (ör. `backend/.env`) içinde bu tam origin’in de olması gerekir; aksi halde API istekleri tarayıcıda engellenir. `npm run dev:lan` çalıştırıldığında terminalde örnek `CORS_ORIGINS=` satırı yazdırılır.

### Backend (`cd backend`)
```bash
npm run build            # tsc → dist/
npm start                # Production server
npm run lint             # tsc --noEmit (type-check only)
npm test                 # Vitest unit tests
npm run test:integration # Vitest integration tests (requires DATABASE_URL)
npm run test:watch       # Vitest watch mode
npm run type-check       # Strict type-check pass
```

### Frontend (`cd frontend`)
```bash
npm run build            # Vite production build
npm run lint             # ESLint
npm test                 # Vitest unit tests
npm run test:smoke       # Fast smoke tests (vitest.smoke.config.ts)
npm run test:e2e         # Playwright cross-browser E2E (mocked API)
npm run test:watch       # Vitest watch mode
npm run generate-translations  # Extract i18n keys
```

### Database / one-off scripts (from `backend/`)
```bash
npm run messages:migrate
npm run messages:post-share-migrate
npm run notifications:migrate
npm run menu:refresh
npm run calendar:parse
npm run db:clear-legacy-uploads
npm run db:recover-profile-urls
```

## Architecture

### Backend

**Entry:** `src/server.ts` (secret preflight) → `src/app.ts` (Express setup)

Middleware order: Helmet → CORS → RequestID → Logging → Rate-limiter → Auth (sessions + bcryptjs) → Routes → Error handler.

**Modules** (`src/modules/`) are feature-scoped:
- `identity/` — auth, registration, sessions
- `social/` — posts, comments, likes, moderation
- `community/` — groups, memberships
- `messaging/` — async messaging
- `academic/` — courses, schedules
- `campus-info/` — menus (cron-refreshed daily at 06:00 TZ=Turkey), calendar, campus data
- `search/` — full-text search
- `services/` — lost-and-found, career services, etc.
- `notifications/` — push notifications
- `bff/` — Backend-for-Frontend aggregation layer

Each module follows: `presentation/http/{routes,controller}` → `infrastructure/{service}` → Drizzle ORM queries.

**Config & secrets:** `src/config/env.ts` is a Zod-validated schema (DATABASE_URL, SESSION_SECRET, FRONTEND_URL, etc.). Secrets are loaded via a provider abstraction that supports env vars, file-based, or Azure Key Vault (`@azure/keyvault-secrets`).

**Database:** Drizzle ORM over `pg` (node-postgres). Migrations live in `/migrations`. Integration tests require a real DATABASE_URL (no mocks).

**Validation:** Zod at all API boundary entry points.

### Frontend

**Entry:** `src/main.tsx` → `src/App.tsx`

**Dev proxy** (vite.config.ts): `/api`, `/auth`, `/lost-items`, `/found-items`, `/uploads` → `http://localhost:3000`.

**Key directories:**
- `api/` — Axios instances and per-feature API call modules
- `components/` — reusable UI components
- `pages/` — route-level views (32 page directories)
- `context/` — React Context for auth, theme, and other global state
- `hooks/` — custom React hooks
- `i18n/` — i18next config + translation files (multilingual)
- `types/` — shared TypeScript types

**PWA:** Service Worker via `vite-plugin-pwa` (Workbox). Strategies: NetworkFirst for pages, StaleWhileRevalidate for assets, CacheFirst for media.

**Bundle splitting** (manual Vite chunks): `react-vendor`, `vendor`, `router`, `forms`, `api`, `i18n`, `motion`, `icons`.

**Forms:** Formik + Yup for validation, react-easy-crop for image cropping.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) — Node 20.19.0, triggers on PR and pushes to `main`.

- **Backend job:** `npm ci` → TypeScript build → unit tests → integration tests
- **Frontend job:** `npm ci` → ESLint → smoke tests → Vite build → Playwright E2E (Chromium + Firefox + WebKit)

Concurrency group cancels in-progress runs on the same branch.

## Deployment

- **Render:** `render.yaml` defines services (backend + frontend static site)
- **Docker Compose:** `docker-compose.yml` for local environment (PostgreSQL, etc.)
