# OmniCMS Sitemap Configuration Problem

## The Issue: Broken PBN Site References in Sitemaps

### Current Flow (Broken)

When you access a sitemap from a Cloudflare frontend:

```
1. Browser: https://omnicms.pages.dev/sitemap.xml
   ↓
2. Cloudflare Functions: frontend/functions/sitemap.xml.js
   → Calls _seo-proxy.js with pathname="/sitemap.xml"
   ↓
3. SEO Proxy (frontend/functions/_seo-proxy.js):
   - No SITE_SLUG env var configured
   - So targetPathname stays as "/sitemap.xml" (not site-specific!)
   - Sends: GET https://omnicms-backend.vercel.app/sitemap.xml
   ↓
4. Backend (backend/server.ts line 298-320):
   - Receives GET /sitemap.xml
   - resolveSiteFromRequest() gets:
     * hostname from query param OR
     * X-Forwarded-Host header OR  
     * req.headers.host (which is 'omnicms-backend.vercel.app')
   - Since hostname is backend's own domain, returns NULL (line 257)
   - Falls back to global sitemap index (lines 308-319)
   ↓
5. Response: Global sitemap index with WRONG URLs
   ```xml
   <sitemapindex>
     <sitemap>
       <loc>https://omnicms-backend.vercel.app/travel/sitemap.xml</loc>
     </sitemap>
     <sitemap>
       <loc>https://omnicms-backend.vercel.app/package/sitemap.xml</loc>
     </sitemap>
   </sitemapindex>
   ```

### The Root Causes

**Issue #1: Missing SITE_SLUG Environment Variable**
- Each Cloudflare frontend deployment needs `SITE_SLUG` env var set
- Without it, the SEO proxy doesn't convert root `/sitemap.xml` → `/{siteSlug}/sitemap.xml`
- Result: Always serves global index instead of site-specific sitemap

**Issue #2: Backend Can't Detect Frontend Hostname**
- `_seo-proxy.js` sets `X-Forwarded-Host` header (line 21)
- Backend's `resolveSiteFromRequest()` checks this header (line 249)
- BUT: Line 257 filters out the backend's own domain
- Problem: When X-Forwarded-Host is set to Cloudflare domain, backend doesn't match it to any site's domains array

**Issue #3: No Hostname in Query Parameters**
- SEO proxy only adds hostname as query param if `!targetUrl.searchParams.has('hostname')` (line 16)
- But Cloudflare hostname (omnicms.pages.dev) is never in the site's `domains` array (which has custom domains)
- So even if passed, it won't find a site match

**Issue #4: getSiteUrl() Uses Incorrect Domain**
- When generating sitemaps, `getSiteUrl()` checks:
  1. FRONTEND_URL env var (if set)
  2. site.domains[0] (first custom domain)
  3. req.headers.host (which is backend domain)
- For Cloudflare deployments, none of these reflect the actual frontend URL
- Result: Sitemaps reference backend URLs instead of frontend URLs

### What Search Engines See

When Google/Bing crawl `omnicms.pages.dev/sitemap.xml`:

```xml
<!-- WRONG: Pointing to backend, not the Cloudflare frontend -->
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://omnicms-backend.vercel.app/travel/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://omnicms-backend.vercel.app/package/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
```

When they follow to `/travel/sitemap.xml`:

```xml
<!-- Also WRONG: Backend URLs in article references -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://omnicms-backend.vercel.app/travel</loc>
  </url>
  <url>
    <loc>https://omnicms-backend.vercel.app/travel/article-slug</loc>
  </url>
</urlset>
```

### SEO Impact

1. **Crawl inefficiency**: Bots crawl backend instead of frontends
2. **Indexation failures**: Pages on omnicms.pages.dev won't be indexed (they point to backend)
3. **Search Console confusion**: You'll see 404s when GSC tries to crawl backend URLs
4. **PBN visibility**: All 3 sites appear to serve from same backend URL
5. **Lost link equity**: No differentiation between sites

---

## The Fix (4-Part Solution)

### Part 1: Set SITE_SLUG in Each Cloudflare Deployment

**For omnicms.pages.dev:**
- Project > Settings > Environment variables
- Add: `SITE_SLUG = travel`

**For omnicms1.pages.dev:**
- Add: `SITE_SLUG = package`

**For omnicms2.pages.dev:**
- Add: `SITE_SLUG = design`

This makes the SEO proxy convert `/sitemap.xml` → `/{siteSlug}/sitemap.xml` (line 8-9 of _seo-proxy.js).

### Part 2: Update Backend getSiteUrl() Logic

Modify `backend/server.ts` line 226-235:

```typescript
function getSiteUrl(site: any, req: express.Request) {
  const configuredFrontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  
  // FIXED: Check if forwarded host is a Cloudflare domain
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost && !forwardedHost.includes('vercel.app') && !forwardedHost.includes('localhost')) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    return `${protocol}://${forwardedHost}`;
  }
  
  // Use site's first custom domain if available
  const domain = site.domains && site.domains.length > 0
    ? site.domains[0]
    : configuredFrontendUrl;
  
  if (!domain) {
    // Fallback for testing only
    console.warn(`⚠️ No domain found for site ${site.slug}`);
    return 'https://example.com'; // Prevents bad URLs in sitemaps
  }
  
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `${protocol}://${domain}`;
}
```

### Part 3: Update SEO Proxy to Pass Hostname

Modify `frontend/functions/_seo-proxy.js` line 16-18:

```javascript
// ALWAYS pass the frontend's hostname to backend
const targetUrl = new URL(`${backendUrl}${targetPathname}`);
targetUrl.searchParams.set('hostname', hostname);
```

### Part 4: Backend Route to Use Hostname Parameter

Modify `backend/server.ts` line 347-356 (/:siteSlug/sitemap.xml):

```typescript
app.get('/:siteSlug/sitemap.xml', async (req, res) => {
  const { siteSlug } = req.params;
  recordBotHit(req, siteSlug);
  
  const site = await Site.findOne({ slug: siteSlug });
  if (!site) return res.status(404).send('Site not found');

  const posts = await Post.find({ siteId: site._id, status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 });
  
  // Pass hostname so getSiteUrl uses the frontend domain
  req.query.hostname = req.headers['x-forwarded-host'] || req.query.hostname;
  const xml = renderSiteSitemap(site, posts, req);
  
  res.type('application/xml').send(xml);
});
```

---

## Expected Results After Fix

### For omnicms.pages.dev/sitemap.xml:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://omnicms.pages.dev/travel</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://omnicms.pages.dev/travel/a-maintainable-approach-to-php-projects</loc>
    <lastmod>2024-08-27T09:12:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### For omnicms1.pages.dev/sitemap.xml:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://omnicms1.pages.dev/package</loc>
    ...
  </url>
  <url>
    <loc>https://omnicms1.pages.dev/package/a-maintainable-approach-to-php-projects</loc>
    ...
  </url>
</urlset>
```

### For omnicms2.pages.dev/sitemap.xml:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://omnicms2.pages.dev/design</loc>
    ...
  </url>
  <url>
    <loc>https://omnicms2.pages.dev/design/a-maintainable-approach-to-php-projects</loc>
    ...
  </url>
</urlset>
```

Each site now correctly references itself, not the backend.

---

## Verification Checklist

- [ ] Set SITE_SLUG env var in all 3 Cloudflare projects
- [ ] Deploy updated backend/server.ts with new getSiteUrl()
- [ ] Test: `curl -H "X-Forwarded-Host: omnicms.pages.dev" https://omnicms-backend.vercel.app/travel/sitemap.xml`
- [ ] Verify sitemap URLs use `omnicms.pages.dev` not `omnicms-backend.vercel.app`
- [ ] Submit updated sitemaps to Google Search Console
- [ ] Monitor coverage: all 3 sites should show unique URLs in GSC
