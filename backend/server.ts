import express from 'express';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables from the root .env file in monorepo dev environments
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

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
}, { timestamps: true });

PostSchema.index({ siteId: 1, slug: 1 }, { unique: true });

const Site = mongoose.model('Site', SiteSchema);
const Category = mongoose.model('Category', CategorySchema);
const Post = mongoose.model('Post', PostSchema);

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
    const query: any = { siteId: site._id };
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

// Create a post
app.post('/api/admin/posts', async (req, res) => {
  try {
    const { siteSlug, title, slug, content, categorySlug } = req.body;
    if (!siteSlug || !title || !slug || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const site = await Site.findOne({ slug: siteSlug });
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    let categoryId = null;
    if (categorySlug) {
      const category = await Category.findOne({ siteId: site._id, slug: categorySlug });
      if (category) categoryId = category._id;
    }
    
    const post = new Post({
      siteId: site._id,
      categoryId,
      title,
      slug,
      content
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
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
