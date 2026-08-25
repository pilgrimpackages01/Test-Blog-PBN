# Multi-Tenant MERN CMS Platform - Architecture Plan

## Overview
This document outlines the architecture for transforming the existing single-tenant MERN application into a robust multi-tenant CMS/blog platform. The platform will support multiple distinct "sites" (e.g., `/travel`, `/tech`), each with its own branding, categories, and posts, all powered by a single frontend and backend deployment.

## Core Constraints & Principles
1. **Hosting**: Frontend on Cloudflare Pages (`myproject.pages.dev`), Backend on Render, Database on MongoDB.
2. **Multi-Tenancy Setup**: Initially path-based (e.g., `myproject.pages.dev/travel`), but architected to support subdomains/custom domains in the future.
3. **Database**: **MongoDB ONLY**. No Redis cache as per project constraints.
4. **Theming**: Light theme ONLY. All colors must be defined as CSS variables (e.g., `--primary-color`) and dynamically injected via React based on the active tenant's settings.
5. **UI Library**: Standard React/Tailwind CSS ONLY. Strictly **NO Radix UI** (or any other headless component libraries).

## 1. Database Architecture (MongoDB)
We will transition from a single `Data` collection to a relational, multi-tenant schema.

### Collections:
*   **Sites**: The core tenant configuration.
    *   `slug` (String, Unique): e.g., "travel", "tech".
    *   `name` (String): e.g., "Travel Explorer".
    *   `theme` (Object): CSS color variables (`primary`, `secondary`, `accent`, `text`, `bg`, `surface`).
    *   `seo` (Object): Title, description.
*   **Categories**:
    *   `siteId` (ObjectId, ref: 'Site'): Hard isolation boundary.
    *   `slug` (String)
    *   `name` (String)
*   **Posts**:
    *   `siteId` (ObjectId, ref: 'Site'): Hard isolation boundary.
    *   `categoryId` (ObjectId, ref: 'Category')
    *   `slug` (String, Unique per site)
    *   `title` (String)
    *   `content` (String) - Rich HTML from Quill.js.

## 2. Backend API Design (Express)
The backend will expose endpoints that strictly filter by the tenant/site slug.

*   `GET /api/sites/:siteSlug` - Retrieves the site configuration, theme, and SEO data.
*   `GET /api/sites/:siteSlug/posts` - Retrieves all posts belonging to the specific site.
*   `GET /api/sites/:siteSlug/posts/:postSlug` - Retrieves a single post.
*   `GET /api/sites/:siteSlug/categories` - Retrieves site categories.

*(Admin endpoints will also be created for CRUD operations on all the above).*

## 3. Frontend Architecture (React)
The frontend will dynamically detect the site being requested and adjust its context.

### Site Resolution
1. React Router catches the first URL segment: `/:siteSlug/*`
2. A `SiteProvider` (Context) extracts `siteSlug`.
3. It fetches `GET /api/sites/:siteSlug`.
4. It injects the returned theme into the document root:
   `document.documentElement.style.setProperty('--primary', site.theme.primary);`

### Routing Structure
*   `/:siteSlug` - Renders the site's Home/Blog feed.
*   `/:siteSlug/post/:postSlug` - Renders a specific article.
*   `/:siteSlug/category/:categorySlug` - Filters articles by category.
*   `/admin` - A global admin dashboard to manage sites and write posts.

## 4. Admin Dashboard
Currently, the admin dashboard is a static HTML file served by Express. We will upgrade this to manage multiple sites.
*   **Site Management**: Create new sites, edit slugs, set brand colors.
*   **Post Management**: Assign posts to specific sites, continue using Quill.js for rich text.
