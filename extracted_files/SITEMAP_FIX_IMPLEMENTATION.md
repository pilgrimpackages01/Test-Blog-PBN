# OmniCMS Sitemap Fix - Implementation Guide

## Summary
Your 3 Cloudflare frontends are serving sitemaps that reference the backend instead of the frontend URLs. This breaks SEO as search engines crawl the wrong domain.

**Problem Flow:**
```
omnicms.pages.dev/sitemap.xml 
  → Backend receives it as "localhost" 
  → Returns sitemaps pointing to omnicms-backend.vercel.app
  → Google crawls backend, not frontend
  → Frontends never get indexed
```

---

## Step 1: Update Each Cloudflare Project (5 minutes per site)

### For **omnicms.pages.dev**:

1. Go to Cloudflare Dashboard
2. Select project → Settings → Environment variables
3. Add new variable:
   - Name: `SITE_SLUG`
   - Value: `travel`
4. Re-deploy (trigger build)

### For **omnicms1.pages.dev**:

1. Add environment variable:
   - Name: `SITE_SLUG`
   - Value: `package`
2. Re-deploy

### For **omnicms2.pages.dev**:

1. Add environment variable:
   - Name: `SITE_SLUG`
   - Value: `design`
2. Re-deploy

**Why?** The SEO proxy in `_seo-proxy.js` checks for `SITE_SLUG` to convert root `/sitemap.xml` → `/{siteSlug}/sitemap.xml`. Without it, always serves the global index.

---

## Step 2: Update Backend Code

### File: `backend/server.ts`

Replace the `getSiteUrl()` function (lines 226-235) with the fixed version:

**Find this:**
```typescript
function getSiteUrl(site: any, req: express.Request) {
  const configuredFrontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  const domain = site.domains && site.domains.length > 0
    ? site.domains[0]
    : configuredFrontendUrl || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `${protocol}://${domain}`;
}
```

**Replace with this:**
```typescript
function getSiteUrl(site: any, req: express.Request) {
  const configuredFrontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  
  // PRIORITY 1: Use forwarded host if it's a frontend domain (not backend)
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost && 
      !forwardedHost.includes('vercel.app') && 
      !forwardedHost.includes('localhost') && 
      !forwardedHost.includes('127.0.0.1')) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    console.log(`✅ Using forwarded host for ${site.slug}: ${forwardedHost}`);
    return `${protocol}://${forwardedHost}`;
  }
  
  // PRIORITY 2: Use site's first custom domain
  const domain = site.domains && site.domains.length > 0
    ? site.domains[0]
    : configuredFrontendUrl;
  
  // PRIORITY 3: Fallback
  if (!domain) {
    console.warn(`⚠️ No domain configured for site ${site.slug}`);
    return configuredFrontendUrl || 'https://example.com';
  }
  
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `${protocol}://${domain}`;
}
```

**Key changes:**
- Prioritizes `X-Forwarded-Host` header (set by Cloudflare)
- Filters out backend domain (vercel.app)
- Falls back to custom domains or FRONTEND_URL env var

---

## Step 3: Update Frontend Proxy (Optional but Recommended)

### File: `frontend/functions/_seo-proxy.js`

Change line 16 from:
```javascript
if (hostname && !targetUrl.searchParams.has('hostname')) {
  targetUrl.searchParams.set('hostname', hostname);
}
```

To:
```javascript
// FIXED: Always pass hostname so backend knows which frontend is requesting
if (hostname) {
  targetUrl.searchParams.set('hostname', hostname);
}
```

**Why?** Ensures backend always knows which frontend made the request, even if query param somehow exists.

---

## Step 4: Deploy & Test

### Deploy Backend:

```bash
cd backend
git add .
git commit -m "fix: use X-Forwarded-Host in getSiteUrl for correct sitemap URLs"
git push
# Vercel will auto-deploy
```

### Test Each Site:

Test without network restrictions (from your local machine or via a proxy):

```bash
# Test travel site sitemap
curl -H "X-Forwarded-Host: omnicms.pages.dev" \
  https://omnicms-backend.vercel.app/travel/sitemap.xml

# Should return:
# <urlset ...>
#   <url>
#     <loc>https://omnicms.pages.dev/travel</loc>
#   </url>
#   <url>
#     <loc>https://omnicms.pages.dev/travel/article-slug</loc>
#   </url>
# </urlset>
```

```bash
# Test package site sitemap
curl -H "X-Forwarded-Host: omnicms1.pages.dev" \
  https://omnicms-backend.vercel.app/package/sitemap.xml

# Should return omnicms1.pages.dev URLs (not backend)
```

```bash
# Test design site sitemap
curl -H "X-Forwarded-Host: omnicms2.pages.dev" \
  https://omnicms-backend.vercel.app/design/sitemap.xml

# Should return omnicms2.pages.dev URLs (not backend)
```

### Verify Frontends:

Once Cloudflare builds are done:

```bash
# Should show omnicms.pages.dev URLs
# (without network restrictions, using: web.archive.org, wayback machine, or proxy service)

# Before: https://omnicms-backend.vercel.app/travel/...
# After:  https://omnicms.pages.dev/travel/...
```

---

## Step 5: Update Search Console

### For each site:

1. Go to Google Search Console
2. Add property for each domain:
   - https://omnicms.pages.dev
   - https://omnicms1.pages.dev
   - https://omnicms2.pages.dev
3. Submit updated sitemaps:
   - https://omnicms.pages.dev/sitemap.xml
   - https://omnicms1.pages.dev/sitemap.xml
   - https://omnicms2.pages.dev/sitemap.xml
4. Wait 24-48 hours for crawl

### Optional: Request indexing:
- Go to URL Inspection tool
- Check: `https://omnicms.pages.dev/travel/a-maintainable-approach-to-php-projects`
- Click "Request indexing"

---

## Verification Checklist

- [ ] Set `SITE_SLUG` env var in all 3 Cloudflare projects
- [ ] Re-deployed all 3 Cloudflare projects
- [ ] Updated backend `getSiteUrl()` function
- [ ] Deployed backend to Vercel
- [ ] Tested sitemap URLs (use X-Forwarded-Host header)
- [ ] Verified each site's sitemap shows correct domain
- [ ] Updated Google Search Console with new sitemaps
- [ ] Checked robots.txt files point to correct URLs
- [ ] Monitored Search Console for crawl success

---

## Expected Results (After 48 hours)

### Google Search Console:
- Each property shows its own URLs indexed
- No 404s for backend domain
- Proper crawl coverage per site

### Sitemaps:
```
omnicms.pages.dev/sitemap.xml
  → Lists omnicms.pages.dev/travel/* URLs ✅

omnicms1.pages.dev/sitemap.xml
  → Lists omnicms1.pages.dev/package/* URLs ✅

omnicms2.pages.dev/sitemap.xml
  → Lists omnicms2.pages.dev/design/* URLs ✅
```

### Bots/Crawlers:
- Crawl frontend Cloudflare URLs (not backend)
- Proper 200 responses from frontends
- All articles appear in each site's index

---

## Troubleshooting

### Sitemap still shows backend URLs?

1. **Check Cloudflare env var:** Go to project → Settings → Environment variables
   - Is `SITE_SLUG` set?
   - Did you re-deploy after adding it?

2. **Check backend deployment:** 
   - Did Vercel finish deploying the updated backend?
   - Check Vercel dashboard for deployment status

3. **Test backend directly:**
   ```bash
   curl -v https://omnicms-backend.vercel.app/travel/sitemap.xml \
     -H "X-Forwarded-Host: omnicms.pages.dev"
   ```
   - Look for `X-Forwarded-Host` in response headers
   - URLs should use `omnicms.pages.dev`

### Still seeing global index instead of site-specific sitemap?

1. Cloudflare's SITE_SLUG env var not set → won't convert /sitemap.xml to /travel/sitemap.xml
2. Check `_seo-proxy.js` is actually reading the env var (add console.log if needed)
3. Make sure you re-deployed Cloudflare after adding env var

### Backend returns 404 for /travel/sitemap.xml?

1. Check if site with slug "travel" exists
2. In admin dashboard, verify site exists and has status "published"
3. Try `/api/admin/sites` to list all sites

---

## Long-term Solution

Consider these improvements:

1. **Store frontend URLs in Site model** - Instead of relying on headers/domains, store the actual frontend URL for each site
   ```typescript
   interface Site {
     slug: string;
     name: string;
     domains: string[];
     frontendUrl?: string; // Add this
   }
   ```

2. **Admin UI for frontend URL configuration** - Let users set the canonical frontend URL per site

3. **Environment-based URL selection** - Use different URLs for production vs staging
   ```
   PRODUCTION_FRONTEND_URL=https://omnicms.pages.dev
   STAGING_FRONTEND_URL=https://staging.omnicms.pages.dev
   ```

4. **Automated sitemap validation** - Periodically check sitemaps return correct URLs

---

## Files to Reference

- `FIXED_getSiteUrl.ts` - The corrected getSiteUrl function
- `FIXED_seo_proxy.js` - The corrected SEO proxy
- `FIXED_sitemap_routes.ts` - The full sitemap routes
- `SITEMAP_PROBLEM_ANALYSIS.md` - Deep technical analysis
