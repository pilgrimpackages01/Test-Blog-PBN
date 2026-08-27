// FIXED: backend/server.ts lines 297-371
// This version ensures all sitemap endpoints use the correct frontend URL

// Global or Tenant-Specific sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  // Check if request is coming from a specific site domain (e.g. omnicms.pages.dev)
  const site = await resolveSiteFromRequest(req);
  recordBotHit(req, site?.slug);
  if (site) {
    const posts = await Post.find({ siteId: site._id, status: 'published' }).sort({ publishedAt: -1, createdAt: -1 });
    const xml = renderSiteSitemap(site, posts, req);
    return res.type('application/xml').send(xml);
  }

  // Otherwise, render the global sitemap index for crawlers accessing the backend directly
  const sites = await Site.find({}, { slug: 1, domains: 1, updatedAt: 1 }).sort({ slug: 1 });
  const sitemapUrls = sites.map(s => `  <sitemap>
    <loc>${escapeXml(`${getSiteUrl(s, req)}/${s.slug}/sitemap.xml`)}</loc>
    <lastmod>${s.updatedAt ? s.updatedAt.toISOString() : new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</sitemapindex>`;
  res.type('application/xml').send(xml);
});

// Global or Tenant-Specific robots.txt
app.get('/robots.txt', async (req, res) => {
  const site = await resolveSiteFromRequest(req);
  recordBotHit(req, site?.slug);
  if (site) {
    const siteUrl = getSiteUrl(site, req);
    return res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
Sitemap: ${siteUrl}/${site.slug}/sitemap.xml`);
  }

  // Global robots file for the central backend
  const sites = await Site.find({}, { slug: 1, domains: 1 }).sort({ slug: 1 });
  const sitemapUrls = sites.map(s => `${getSiteUrl(s, req)}/${s.slug}/sitemap.xml`).join('\n');
  const globalSitemap = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/sitemap.xml`;

  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${globalSitemap}${sitemapUrls ? `\n${sitemapUrls.split('\n').map(url => `Sitemap: ${url}`).join('\n')}` : ''}`);
});

// Sitemap Route (Tenant by slug) - FIXED
app.get('/:siteSlug/sitemap.xml', async (req, res) => {
  const { siteSlug } = req.params;
  recordBotHit(req, siteSlug);
  
  const site = await Site.findOne({ slug: siteSlug });
  if (!site) return res.status(404).send('Site not found');

  // FIXED: Ensure hostname from X-Forwarded-Host is available for getSiteUrl()
  // This allows proper URL generation in renderSiteSitemap()
  const posts = await Post.find({ siteId: site._id, status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 });
  
  const xml = renderSiteSitemap(site, posts, req);
  res.type('application/xml').send(xml);
});

// Robots.txt Route (Tenant by slug)
app.get('/:siteSlug/robots.txt', async (req, res) => {
  const { siteSlug } = req.params;
  recordBotHit(req, siteSlug);
  
  const site = await Site.findOne({ slug: siteSlug });
  if (!site) return res.status(404).send('Site not found');

  const siteUrl = getSiteUrl(site, req);
  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/${siteSlug}/sitemap.xml
Sitemap: ${siteUrl}/sitemap.xml`);
});
