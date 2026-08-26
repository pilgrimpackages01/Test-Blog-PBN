# OmniCMS Implementation Task List

## Step 1: Fix Visual Layout & Empty Column Gaps (Frontend)
- [x] Add conditional `.has-image` and `.no-image` classes to `.featured-story` in `frontend/src/App.tsx`.
- [x] Add conditional `.has-image` and `.no-image` classes to `.story-row` in `frontend/src/App.tsx`.
- [x] Update `frontend/src/index.css` to define grid behaviors for `.no-image` states, ensuring text gracefully spans full width.
- [x] Elevate design styling: add refined shadows, modern border curves, and letter spacing to the public blog feed.

## Step 2: Build Unified Tabbed Workspace in Admin Panel (Backend/Public UI)
- [x] Refactor the admin dashboard in `backend/public/index.html` to introduce Tab navigation (Publishing, Sites/Themes, Bot Audit).
- [x] Group existing forms into separate, clean tab contents:
  * **Tab 1**: "Publishing Studio" (Post Writer and list of published articles).
  * **Tab 2**: "Site Configuration" (Connecting new sites, themes, branding).
  * **Tab 3**: "Search Crawler & Bot Audits" (Traffic metrics and real-time reverse DNS audits).
- [x] Ensure perfect tab-state synchronization and visually elegant buttons.

## Step 3: Enhance Post Rendering & Typography
- [x] Apply the standard `Playfair Display` display font to post headlines and titles.
- [x] Apply maximum character width boundaries (`max-w-3xl prose mx-auto`) to the article reader to guarantee readability.
- [x] Run compiler and verify all modules are building beautifully.
