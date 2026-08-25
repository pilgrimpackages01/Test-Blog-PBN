# Multi-Tenant Migration TODO List

This checklist covers the step-by-step implementation of the `plan.md` architecture.

## Phase 1: Database Redesign (Backend)
- [x] Remove the old `DataModel` in `backend/server.ts`.
- [x] Create a robust `Site` Mongoose schema (slug, name, theme colors, seo).
- [x] Create a `Category` Mongoose schema (siteId, name, slug).
- [x] Create a `Post` Mongoose schema (siteId, categoryId, title, slug, content, publishedAt).
- [x] Ensure indexes are set up on `slug` and `siteId` for fast querying.

## Phase 2: Backend API Expansion
- [x] Implement `GET /api/sites/:siteSlug` to serve site config.
- [x] Implement `GET /api/sites/:siteSlug/posts` to fetch site-specific posts.
- [x] Implement `GET /api/sites/:siteSlug/posts/:postSlug` for single posts.
- [x] Implement Admin REST endpoints (`POST /api/admin/sites`, `POST /api/admin/posts`, etc.).

## Phase 3: Frontend Setup & Context
- [x] Install `react-router-dom` in the frontend for client-side routing.
- [x] Create a `SiteContext.tsx` to handle the fetching of site config based on the URL.
- [x] Create a utility function `injectTheme(theme)` that writes CSS variables to `document.documentElement.style`.
- [x] Ensure `index.css` ONLY uses light theme colors and removes any dark mode overrides.

## Phase 4: Frontend UI Components
- [x] Create `/:siteSlug` route (Home / Blog Feed).
- [x] Create `/:siteSlug/post/:postSlug` route (Single Article view).
- [x] Create a reusable `Header` component that dynamically uses `site.name` and `--primary` colors.
- [x] Build a 404 "Site Not Found" fallback component.

## Phase 5: Admin Dashboard Evolution
- [x] Refactor the existing static HTML `/admin` dashboard into a proper React app (or expand the current HTML/JS to support site selection).
- [x] Add a form to create/edit Sites (specifying slug, name, and color hex codes).
- [x] Update the Quill.js editor form to require a `siteId` before publishing a post.
- [x] Ensure Admin UI has no Radix dependencies and relies purely on Tailwind CSS.

## Phase 6: Testing & Cleanup
- [x] Test cross-tenant data leakage (ensure Site A cannot see Site B's posts).
- [x] Test CORS and Environment variables for Vercel/Cloudflare + Render deployment readiness.
