# OmniCMS Visual & Functional Roadmap

## Core Vision
This roadmap transforms OmniCMS into a premium, responsive multi-tenant platform with exquisite typography, dynamic layout adaptation (fixing empty column gaps when cover images are missing), and a fully tab-consolidated, real-time admin experience.

---

## Part 1: Visual Design & Responsive Layouts (Anti-Slop Alignment)
1. **Dynamic Grid Adaptability (Missing Image Fix)**:
   * Fix the split-grid layout when articles do not have cover images.
   * Add conditional styling to `.featured-story` and `.story-row` to render full-width when there is no cover image, eliminating empty gaps or broken margins.
2. **Asymmetric Editorial Layout**:
   * Center the site layout on a highly balanced canvas.
   * Establish exquisite typography pairing: *Playfair Display* for classic, editorial headlines with generous tracking, and *DM Sans* for highly legible body paragraphs (constrained to `65ch`).
3. **Responsive Visual Polish**:
   * Add beautiful border-radius curves, subtle shadow depths, and hover scaling on images.

---

## Part 2: Unified Tabbed Workspace Admin Dashboard
1. **Tab Consolidated Interface**:
   * Replace the monolithic admin dashboard with a modern, tabbed workspace layout:
     * **Tab 1: Creative Studio (Write & Edit)**: Full-screen post creator, media file inputs, category selectors, and SEO configurations.
     * **Tab 2: Tenant Settings (Themes & SEO)**: Manage site themes, colors, descriptions, and site configurations.
     * **Tab 3: Crawler & Bot Audits (Live Logs)**: Real-time traffic, reverse DNS logs, search engine crawling statistics.
2. **Responsive Dashboard UX**:
   * Upgrade navigation to look extremely polished, responsive, and tactile.

---

## Part 3: Search Indexation & Diagnostics
1. **Sitemap and Robots Dynamic Previews**:
   * Provide immediate visual feedback for dynamic XML sitemaps and search crawl rules per site inside the site settings.
