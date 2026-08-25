# OmniCMS

OmniCMS is a multi-tenant blog CMS. One backend and one frontend deployment can serve multiple blogs using URL slugs or custom domains.

## Architecture

- **Frontend:** React, Vite, React Router, Tailwind CSS
- **Backend:** Express, TypeScript, Mongoose
- **Database:** MongoDB
- **Media:** Cloudinary
- **Backend hosting:** Render
- **Frontend hosting:** Cloudflare Pages

A shared frontend URL uses a site slug:

```text
https://omnicms.pages.dev
```

A custom domain is connected to a site from the admin dashboard:

```text
https://travel.example.com
```

## Requirements

- Node.js 20 or newer
- npm
- MongoDB connection string
- Cloudinary account for image uploads

## Local Development

Install all workspace dependencies from the repository root:

```bash
npm install
```

Create a local `.env` file from `.env.example` and configure the values described below.

Start both applications:

```bash
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Admin dashboard/API: `http://localhost:3001`
- Example tenant: `http://localhost:3000`

The frontend uses `VITE_API_URL` to contact the backend. During local development, Vite proxies API requests to port `3001`.

## Environment Variables

Do not commit `.env` or real credentials. Configure production values in Render and Cloudflare Pages environment settings.

### Backend / Render

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/OmniCMS
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-random-password
JWT_SECRET=use-a-long-random-secret

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend / Cloudflare Pages

```env
VITE_API_URL=https://omnicms.onrender.com
```

`FRONTEND_URL` can also be set on Render when generating fallback sitemap and RSS URLs for slug-based sites.

## Admin Dashboard

Open the backend URL:

```text
https://omnicms.onrender.com/
```

Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The dashboard supports:

- Creating and editing sites
- Connecting multiple custom domains to a site
- Publishing to one site
- Publishing to selected sites
- Publishing to all sites
- Draft, published, and scheduled statuses
- Excerpts, authors, and cover images
- Cloudinary image uploads
- Dofollow or nofollow article links
- Index or noindex article pages
- Editing and deleting posts
- Viewing the content library

A domain should be entered without the protocol, one domain per line:

```text
travel.example.com
www.travel.example.com
```

DNS and custom-domain configuration must also point the domain to the Cloudflare Pages project.

## API Overview

### Public endpoints

```text
GET /api/sites/:siteSlug
GET /api/sites/:siteSlug/posts
GET /api/sites/:siteSlug/posts/:postSlug
GET /api/sites/:siteSlug/categories
GET /api/sites/:siteSlug/sitemap.xml
GET /api/sites/:siteSlug/feed.xml
GET /api/sites/resolve?hostname=example.com
```

### Admin endpoints

Admin endpoints require:

```text
Authorization: Bearer <token>
```

The token is returned by the login endpoint.

```text
POST   /api/admin/auth/login
GET    /api/admin/sites
POST   /api/admin/sites
GET    /api/admin/posts
POST   /api/admin/posts
PATCH  /api/admin/posts/:postId
DELETE /api/admin/posts/:postId
POST   /api/admin/uploads
POST   /api/admin/categories
```

## Content Publishing

The admin editor sends one article to one or more site targets. For multiple targets, the backend creates a site-specific post copy for each selected site. Each copy has its own site boundary, slug, status, SEO settings, and category reference.

Links inside content can be saved as:

- `follow`: no `rel="nofollow"` attribute
- `nofollow`: `rel="nofollow"`

Article pages can be saved as:

- `index`: `index, follow`
- `noindex`: `noindex, nofollow`

## Production Builds

Build the backend:

```bash
cd backend
npm run build
```

Build the frontend:

```bash
cd frontend
npm run build
```

Build both workspaces from the root:

```bash
npm run build
```

Run the frontend typecheck:

```bash
npm run lint
```

Start the production processes from the root:

```bash
npm start
```

## Deployment

### Render backend

Use the repository root as the service directory and configure:

- Build command: `npm run build`
- Start command: `cd backend && npm start`
- Environment: Node

Add all backend environment variables to Render. Ensure MongoDB allows connections from the Render service and that the Cloudinary credentials are valid.

### Cloudflare Pages frontend

Configure:

- Framework preset: Vite
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`
- Environment variable: `VITE_API_URL=https://omnicms.onrender.com`

For client-side routes such as `/travel/post/article-slug`, configure SPA fallback behavior so requests serve `frontend/index.html`.

## Security Notes

- Never commit `.env` or production secrets.
- Use a strong `JWT_SECRET` in production.
- Admin APIs are protected by JWT authentication.
- Blog HTML is sanitized in the frontend before rendering.
- Keep Cloudinary secrets on the backend only.
- Configure CORS more narrowly before serving sensitive production data if the deployment architecture permits it.

## Current Limitations

- The current multi-site publisher creates separate post documents rather than a normalized global `Post` plus `PostPublication` model.
- The media UI supports uploading and inserting images, but does not yet provide a full Cloudinary media library with search and deletion.
- Scheduled posts are stored with scheduling metadata; an external scheduler or periodic worker is needed for more advanced publishing automation.
