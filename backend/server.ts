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
const PORT = process.env.PORT || 3001;
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

const Site = mongoose.model('Site', SiteSchema);
const Category = mongoose.model('Category', CategorySchema);
const Post = mongoose.model('Post', PostSchema);

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
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
    
    const post = await Post.findOne({ siteId: site._id, slug: req.params.postSlug });
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

app.post('/api/admin/uploads', upload.single('file'), async (req, res) => {
  if (!cloudinaryConfigured) {
    return res.status(503).json({ error: 'Cloudinary is not configured' });
  }
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'omnicms/blog', resource_type: 'image', use_filename: true, unique_filename: true },
        (error, uploaded) => error ? reject(error) : resolve(uploaded as { secure_url: string })
      );
      stream.end(req.file!.buffer);
    });
    res.status(201).json({ url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Create a post
app.post('/api/admin/posts', async (req, res) => {
  try {
    const { siteSlug, siteSlugs = [], targetMode = 'one', title, slug, content, categorySlug, linkPolicy = 'follow', robots = 'index', excerpt = '', coverImage = '', author = 'OmniCMS', tags = [], status = 'published', scheduledFor, seoTitle = '', seoDescription = '' } = req.body;
    const targetSlugs = targetMode === 'all' ? (await Site.find().select('slug')).map(site => site.slug) : targetMode === 'selected' ? siteSlugs : [siteSlug];
    if (!targetSlugs.length || !title || !slug || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sites = await Site.find({ slug: { $in: [...new Set(targetSlugs)] } });
    if (sites.length !== new Set(targetSlugs).size) return res.status(404).json({ error: 'One or more sites were not found' });
    const posts = [];
    for (const site of sites) {
      let categoryId = null;
      if (categorySlug) {
        const category = await Category.findOne({ siteId: site._id, slug: categorySlug });
        if (category) categoryId = category._id;
      }
      posts.push(await Post.create({ siteId: site._id, categoryId, title, slug, content: applyLinkPolicy(content, linkPolicy), linkPolicy, robots, excerpt, coverImage, author, tags, status, scheduledFor, publishedAt: status === 'published' ? new Date() : undefined, seoTitle, seoDescription }));
    }
    res.status(201).json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/posts/:postId', async (req, res) => {
  try {
    const allowed = ['title', 'slug', 'content', 'excerpt', 'coverImage', 'author', 'tags', 'status', 'scheduledFor', 'seoTitle', 'seoDescription', 'linkPolicy', 'robots'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (updates.content && updates.linkPolicy) updates.content = applyLinkPolicy(updates.content as string, updates.linkPolicy as 'follow' | 'nofollow');
    if (updates.status === 'published') updates.publishedAt = new Date();
    const post = await Post.findByIdAndUpdate(req.params.postId, updates, { new: true, runValidators: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { res.status(400).json({ error: 'Could not update post' }); }
});

app.delete('/api/admin/posts/:postId', async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
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
// Serve Admin Dashboard
// ------------------------------------------------------------------
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on port ${PORT}`);
});
