import express from 'express';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables from the root .env file in monorepo dev environments
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-me';
const adminPasswordHash = process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : null;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Enable CORS for external frontend applications
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      return;
    } catch (err) {
      console.error('❌ Failed to connect to MONGODB_URI (possibly an IP whitelist issue). Falling back to In-Memory database.', err.message);
    }
  }
  
  console.warn('⚠️ Starting MongoMemoryServer for development.');
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  console.log('✅ Connected to In-Memory MongoDB');
}
connectDB().catch(err => console.error('❌ MongoDB connection error:', err));

// ------------------------------------------------------------------
// Mongoose Schemas & Models
// ------------------------------------------------------------------

const SiteSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  domains: { type: [String], default: [] },
  theme: {
    primary: { type: String, default: '#4f46e5' },
    secondary: { type: String, default: '#f8fafc' },
    accent: { type: String, default: '#fbbf24' },
    bg: { type: String, default: '#ffffff' },
    surface: { type: String, default: '#f1f5f9' },
    textMain: { type: String, default: '#0f172a' },
    textMuted: { type: String, default: '#64748b' },
  },
  seo: {
    title: { type: String },
    description: { type: String }
  }
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
  slug: { type: String, required: true },
  name: { type: String, required: true }
}, { timestamps: true });

CategorySchema.index({ siteId: 1, slug: 1 }, { unique: true });

const PostSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  coverImagePublicId: { type: String, default: '' },
  author: { type: String, default: 'OmniCMS' },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'published' },
  publishedAt: { type: Date, default: Date.now },
  scheduledFor: { type: Date },
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  linkPolicy: { type: String, enum: ['follow', 'nofollow'], default: 'follow' },
  robots: { type: String, enum: ['index', 'noindex'], default: 'index' },
}, { timestamps: true });

PostSchema.index({ siteId: 1, slug: 1 }, { unique: true });

const BotLogSchema = new mongoose.Schema({
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  botType: { type: String, default: '' },
  url: { type: String, default: '' },
  siteSlug: { type: String, default: '' },
}, { timestamps: true });

const Site = mongoose.model('Site', SiteSchema);
const Category = mongoose.model('Category', CategorySchema);
const Post = mongoose.model('Post', PostSchema);
const BotLog = mongoose.model('BotLog', BotLogSchema);

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) return res.status(503).json({ error: 'JWT_SECRET is not configured' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function applyLinkPolicy(content: string, linkPolicy: 'follow' | 'nofollow') {
  return content.replace(/<a\b([^>]*)>/gi, (_match, attributes) => {
    const withoutRel = attributes.replace(/\srel\s*=\s*["'][^"']*["']/i, '');
    return `<a${withoutRel}${linkPolicy === 'nofollow' ? ' rel="nofollow"' : ''}>`;
  });
}

// ------------------------------------------------------------------
// Public API Routes (Tenant-scoped)
// ------------------------------------------------------------------

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

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '\"': '&quot;'
  }[character] || character));
}

async function resolveSiteFromRequest(req: express.Request) {
  const rawHostname = String(
    req.query.hostname ||
    req.headers['x-forwarded-host'] ||
    req.headers.host ||
    ''
  ).trim().toLowerCase();

  const hostname = rawHostname.split(':')[0]; // strip port if present

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'omnicms-backend.vercel.app') {
    return null;
  }

  // 1. Check direct match in site's domains array
  let site = await Site.findOne({ domains: hostname });
  if (site) return site;

  // 2. Check if hostname matches any site slug (e.g. hostname query parameter)
  site = await Site.findOne({ slug: hostname });
  if (site) return site;

  return null;
}

function renderSiteSitemap(site: any, posts: any[], req: express.Request) {
  const siteUrl = getSiteUrl(site, req);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${siteUrl}/${site.slug}`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

  for (const post of posts) {
    xml += `
  <url>
    <loc>${escapeXml(`${siteUrl}/${site.slug}/${post.slug}`)}</loc>
    <lastmod>${post.publishedAt ? post.publishedAt.toISOString() : (post.updatedAt ? post.updatedAt.toISOString() : new Date().toISOString())}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  xml += `
</urlset>`;
  return xml;
}

// Global or Tenant-Specific sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  // Check if request is coming from a specific site domain (e.g. omnicms3.pages.dev)
  const site = await resolveSiteFromRequest(req);
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

// Sitemap Route (Tenant by slug)
app.get('/:siteSlug/sitemap.xml', async (req, res) => {
  const { siteSlug } = req.params;
  const site = await Site.findOne({ slug: siteSlug });
  if (!site) return res.status(404).send('Site not found');

  const posts = await Post.find({ siteId: site._id, status: 'published' }).sort({ publishedAt: -1, createdAt: -1 });
  const xml = renderSiteSitemap(site, posts, req);
  res.type('application/xml').send(xml);
});

// Robots.txt Route (Tenant by slug)
app.get('/:siteSlug/robots.txt', async (req, res) => {
  const { siteSlug } = req.params;
  const site = await Site.findOne({ slug: siteSlug });
  if (!site) return res.status(404).send('Site not found');

  const siteUrl = getSiteUrl(site, req);
  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/${siteSlug}/sitemap.xml
Sitemap: ${siteUrl}/sitemap.xml`);
});

// Resolve a tenant from the browser's hostname for custom-domain deployments.
app.get('/api/sites/resolve', async (req, res) => {
  try {
    const hostname = String(req.query.hostname || '').trim().toLowerCase();
    if (!hostname) return res.status(400).json({ error: 'Hostname is required' });

    const site = await Site.findOne({ domains: hostname });
    if (!site) return res.status(404).json({ error: 'No site is connected to this domain' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Site Config
app.get('/api/sites/:siteSlug', async (req, res) => {
  try {
    const site = await Site.findOne({ slug: req.params.siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Categories for a Site
app.get('/api/sites/:siteSlug/categories', async (req, res) => {
  try {
    const site = await Site.findOne({ slug: req.params.siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    const categories = await Category.find({ siteId: site._id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Posts for a Site
app.get('/api/sites/:siteSlug/posts', async (req, res) => {
  try {
    const site = await Site.findOne({ slug: req.params.siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    // Optional category filter
    const query: any = { siteId: site._id, status: 'published', $or: [{ publishedAt: { $lte: new Date() } }, { publishedAt: null }] };
    if (req.query.category) {
      const category = await Category.findOne({ siteId: site._id, slug: req.query.category as string });
      if (category) query.categoryId = category._id;
    }
    
    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific Post for a Site
app.get('/api/sites/:siteSlug/posts/:postSlug', async (req, res) => {
  try {
    const site = await Site.findOne({ slug: req.params.siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    const post = await Post.findOne({ siteId: site._id, slug: req.params.postSlug, status: 'published', $or: [{ publishedAt: { $lte: new Date() } }, { publishedAt: null }] });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------------------------------------------------
// Admin API Routes (For CMS)
// ------------------------------------------------------------------

app.post('/api/admin/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return res.status(503).json({ error: 'Admin credentials are not configured on the server' });
  }
  if (email !== adminEmail || !adminPasswordHash || !(await bcrypt.compare(password || '', adminPasswordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' }) });
});

app.use('/api/admin', requireAdmin);

// Get all sites (Admin)
app.get('/api/admin/sites', async (req, res) => {
  try {
    const sites = await Site.find().sort({ name: 1 });
    res.json(sites);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get posts for the admin dashboard, optionally limited to one site.
app.get('/api/admin/posts', async (req, res) => {
  try {
    const query: any = {};
    if (req.query.siteSlug) {
      const site = await Site.findOne({ slug: req.query.siteSlug as string });
      if (!site) return res.status(404).json({ error: 'Site not found' });
      query.siteId = site._id;
    }
    if (req.query.status && ['draft', 'published', 'scheduled'].includes(req.query.status as string)) query.status = req.query.status;
    const posts = await Post.find(query).populate('siteId', 'name slug').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update a site
app.post('/api/admin/sites', async (req, res) => {
  try {
    const { slug, name, domains = [], theme, seo } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'Slug and name are required' });

    const normalizedDomains = [...new Set(domains
      .map((domain: string) => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))
      .filter(Boolean))];
    
    const site = await Site.findOneAndUpdate(
      { slug },
      { name, domains: normalizedDomains, theme, seo },
      { new: true, upsert: true }
    );
    res.json(site);
  } catch (err) {
    console.error("Error saving site:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a category
app.post('/api/admin/categories', async (req, res) => {
  try {
    const { siteSlug, name, slug } = req.body;
    if (!siteSlug || !name || !slug) return res.status(400).json({ error: 'Missing required fields' });
    
    const site = await Site.findOne({ slug: siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    const category = new Category({ siteId: site._id, name, slug });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all categories
app.get('/api/admin/categories', async (req, res) => {
  try {
    const categories = await Category.find().populate('siteId', 'name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a category
app.delete('/api/admin/categories/:catId', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.catId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/uploads', upload.single('file'), async (req, res) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({ error: 'Cloudinary is not configured' });
  }
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  try {
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'omnicms/blog', resource_type: 'image', use_filename: true, unique_filename: true },
        (error, uploaded) => error ? reject(error) : resolve(uploaded as { secure_url: string; public_id: string })
      );
      stream.end(req.file!.buffer);
    });
    res.status(201).json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Create a post
app.post('/api/admin/posts', async (req, res) => {
  try {
    const { siteSlug, siteSlugs = [], targetMode = 'one', title, slug, content, categoryId, linkPolicy = 'follow', robots = 'index', excerpt = '', coverImage = '', coverImagePublicId = '', author = 'OmniCMS', tags = [], status = 'published', scheduledFor, seoTitle = '', seoDescription = '' } = req.body;
    const targetSlugs = targetMode === 'all' ? (await Site.find().select('slug')).map(site => site.slug) : targetMode === 'selected' ? siteSlugs : [siteSlug];
    if (!targetSlugs.length || !title || !slug || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sites = await Site.find({ slug: { $in: [...new Set(targetSlugs)] } });
    if (sites.length !== new Set(targetSlugs).size) return res.status(404).json({ error: 'One or more sites were not found' });
    const existingPost = await Post.findOne({ siteId: { $in: sites.map(site => site._id) }, slug });
    if (existingPost) return res.status(409).json({ error: 'This slug already exists on one of the selected sites' });
    const posts = [];
    for (const site of sites) {
      posts.push(await Post.create({ siteId: site._id, categoryId, title, slug, content: applyLinkPolicy(content, linkPolicy), linkPolicy, robots, excerpt, coverImage, coverImagePublicId, author, tags, status, scheduledFor, publishedAt: status === 'published' ? new Date() : undefined, seoTitle, seoDescription }));
    }
    res.status(201).json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/posts/:postId', async (req, res) => {
  try {
    const allowed = ['title', 'slug', 'content', 'excerpt', 'coverImage', 'coverImagePublicId', 'author', 'tags', 'status', 'scheduledFor', 'seoTitle', 'seoDescription', 'linkPolicy', 'robots', 'categoryId'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.content && updates.linkPolicy) updates.content = applyLinkPolicy(updates.content as string, updates.linkPolicy as 'follow' | 'nofollow');
    if (updates.status === 'published') updates.publishedAt = new Date();
    const existingPost = await Post.findById(req.params.postId).select('coverImagePublicId');
    if (!existingPost) return res.status(404).json({ error: 'Post not found' });
    const post = await Post.findByIdAndUpdate(req.params.postId, updates, { new: true, runValidators: true });
    if (updates.coverImagePublicId && existingPost.coverImagePublicId && updates.coverImagePublicId !== existingPost.coverImagePublicId && cloudinaryConfigured) {
      await cloudinary.uploader.destroy(existingPost.coverImagePublicId, { resource_type: 'image' });
    }
    res.json(post);
  } catch (err) { res.status(400).json({ error: 'Could not update post' }); }
});

app.delete('/api/admin/posts/:postId', async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.coverImagePublicId && !cloudinaryConfigured) return res.status(503).json({ error: 'Cloudinary is not configured; post was kept' });
  if (post.coverImagePublicId && cloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.destroy(post.coverImagePublicId, { resource_type: 'image' });
      if (result.result !== 'ok' && result.result !== 'not found') return res.status(502).json({ error: 'Image could not be removed; post was kept' });
    } catch (err) {
      console.error('Cloudinary delete failed:', err);
      return res.status(502).json({ error: 'Image could not be removed; post was kept' });
    }
  }
  await post.deleteOne();
  res.status(204).end();
});

app.get('/api/sites/:siteSlug/sitemap.xml', async (req, res) => {
  const site = await Site.findOne({ slug: req.params.siteSlug });
  if (!site) return res.status(404).send('Site not found');
  const posts = await Post.find({ siteId: site._id, status: 'published' }).select('slug updatedAt');
  const base = site.domains?.[0] ? `https://${site.domains[0]}` : `${process.env.FRONTEND_URL || ''}/${site.slug}`;
  const urls = posts.map(post => `<url><loc>${base}/post/${post.slug}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}</loc></url>${urls}</urlset>`);
});

app.get('/api/sites/:siteSlug/feed.xml', async (req, res) => {
  const site = await Site.findOne({ slug: req.params.siteSlug });
  if (!site) return res.status(404).send('Site not found');
  const posts = await Post.find({ siteId: site._id, status: 'published' }).sort({ publishedAt: -1 }).limit(50);
  const base = site.domains?.[0] ? `https://${site.domains[0]}` : `${process.env.FRONTEND_URL || ''}/${site.slug}`;
  const items = posts.map(post => `<item><title><![CDATA[${post.title}]]></title><link>${base}/post/${post.slug}</link><description><![CDATA[${post.excerpt || post.content.slice(0, 240)}]]></description><pubDate>${(post.publishedAt || post.createdAt).toUTCString()}</pubDate></item>`).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title><![CDATA[${site.name}]]></title><link>${base}</link><description><![CDATA[${site.seo?.description || site.name}]]></description>${items}</channel></rss>`);
});

// ------------------------------------------------------------------
// Crawler Bot Log Tracking
// ------------------------------------------------------------------
app.post('/api/public/bot-logs', async (req, res) => {
  try {
    const { ip, userAgent, botType, url, siteSlug } = req.body;
    const log = new BotLog({ ip, userAgent, botType, url, siteSlug });
    await log.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record bot log' });
  }
});

app.get('/api/admin/bot-logs', requireAdmin, async (req, res) => {
  try {
    const logs = await BotLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bot logs' });
  }
});

// ------------------------------------------------------------------
// Serve Admin Dashboard
// ------------------------------------------------------------------
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

export default app;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}
