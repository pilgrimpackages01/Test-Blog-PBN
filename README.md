# OmniPBN – Multi-Tenant Network Platform

OmniPBN is an elite, full-stack Next.js application designed to manage and orchestrate a multi-tenant Private Blog Network (PBN). A single unified codebase allows you to serve multiple highly-optimized partner directory sites, managing them all from a centralized, secure admin dashboard.

## 🚀 Key Features

- **Multi-Tenant Architecture**: Serve unlimited domain properties (`/site-slug`) from a single Next.js application.
- **Organic Partner Directory**: Displays your PBN links openly as authentic partner resources to maintain legitimacy.
- **Zero-Footprint SEO Engine**: Silently injects promotional metrics, dynamic network cross-links, and do-follow backlinks inside a `<div style="display: none">` wrapper. Perfect for Googlebot crawling without exposing strategies to competitors.
- **Secure Admin Dashboard**: 
  - Centralized login with JWT session tokens.
  - Global Search for both Sites and PBN links.
  - CSV Bulk Import for instant network link scaling.
- **Modern Stack**: Built with Next.js 15+ (App Router), Tailwind CSS, and MongoDB (Mongoose).

## 🛠 Tech Stack

- **Frontend/Backend:** Next.js 15+ (TypeScript, React, App Router)
- **Styling:** Tailwind CSS
- **Database:** MongoDB
- **Authentication:** Custom JWT-based Admin Auth
- **Icons:** Lucide React

## 📦 Getting Started

### 1. Requirements
- Node.js 20 or newer
- npm or bun
- A MongoDB Connection String

### 2. Environment Setup
Rename `.env.example` to `.env` and fill out your variables:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/OmniCMS?retryWrites=true&w=majority"
ADMIN_EMAIL="admin@omnicms.com"
ADMIN_PASSWORD="password123"
JWT_SECRET="your-secure-random-secret"
```

### 3. Installation & Run
Install all workspace dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Local URLs:
- **Main Hub:** `http://localhost:3000`
- **Admin Dashboard:** `http://localhost:3000/admin`
- **Example Tenant Site:** `http://localhost:3000/any-site-slug`

## 🔐 Admin Dashboard

Access the secure publisher at `/admin`.
Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you configured in your `.env` file.

**Capabilities:**
- Add, Edit, and Delete Tenant Sites.
- Map custom domains (for external proxy routing setups).
- Create, Import, and Manage PBN Links.
- Filter and search through vast amounts of network properties instantly.

## 🕸 SEO Spider & Crawler Logic

OmniPBN is engineered for aggressive backlink juice flow:
- Each tenant site dynamically maps to `/app/[siteSlug]/page.tsx`.
- Visually, the site renders a clean, high-end "Recommended Resources" directory.
- Structurally, it compiles a hidden HTML DOM tree containing all deep-indexable keywords, packages, and direct do-follow links to Telegram channels (`@qmlab_seo`) or your primary money sites.
- This design ensures real human visitors see a legitimate platform, while Googlebot parses dense keyword contexts.

## 🚀 Deployment

This application is ready to be deployed on Vercel, Google Cloud Run, or any Node.js hosting provider.

For standard deployments (like Vercel):
1. Connect your GitHub repository.
2. Add the environment variables from your `.env` file.
3. Vercel automatically detects the Next.js framework and builds with `npm run build`.

For Docker / Container environments, set your container's startup command to:
```bash
npm start
```
