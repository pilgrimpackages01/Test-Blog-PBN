# OmniCMS Next.js Migration Plan

This document outlines the architecture and step-by-step strategy for migrating the OmniCMS MERN (Express + React Vite) multi-tenant PBN & Site Manager to a full-stack **Next.js App Router** project deployable on **Cloudflare Pages / Vercel**.

---

## 1. Architecture Overview

In a Next.js App Router architecture:
- **Centralized Admin Dashboard**: Hosted at `/admin` to manage all tenant sites, domain mappings, and PBN backlink networks from one single interface.
- **Dynamic Tenant Routing**: Tenant sites are resolved dynamically via dynamic segments `/[siteSlug]` and subpages `/[siteSlug]/[postSlug]`.
- **Database Persistence**: Mongoose connects to MongoDB Atlas for durable multi-tenant data storage.
- **Automated Cross-Interlinking**: Hidden PBN and interlink archives render full domain URLs unconditionally for optimal SEO backlink architecture.

---

## 2. Directory Structure for Next.js

```text
omnicms-next/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── auth/login/route.ts
│   │   │   ├── sites/route.ts
│   │   │   └── pbn-links/route.ts
│   │   ├── sites/[siteSlug]/route.ts
│   │   └── pbn-links/route.ts
│   ├── admin/
│   │   └── page.tsx            # Centralized Admin Dashboard
│   ├── [siteSlug]/
│   │   ├── page.tsx            # Tenant Home / Hub
│   │   └── [postSlug]/
│   │       └── page.tsx        # Tenant Article View
│   ├── layout.tsx
│   └── page.tsx                # Global Network Hub / Root
├── lib/
│   ├── mongodb.ts              # Mongoose singleton connection
│   └── auth.ts                 # Admin JWT verification
├── models/
│   ├── Site.ts
│   ├── Post.ts
│   ├── Category.ts
│   ├── PbnLink.ts
│   └── BotLog.ts
└── public/
```

---

## 3. Multi-Tenant Deployment on Cloudflare Pages / Vercel

- **Single Deployment**: You deploy the Next.js application *once* to Cloudflare Pages or Vercel.
- **Centralized Management**: From any deployed instance, logging into `/admin` allows you to add, edit, and manage all connected tenant properties (e.g., `omnicms1`, `omnicms2.pages.dev`).
- **Global Database**: All tenant sites and PBN links sync in real time across the network via MongoDB Atlas.
