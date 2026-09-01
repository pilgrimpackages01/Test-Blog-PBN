import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let cachedConnection: typeof mongoose | null = null;
let mongoServer: MongoMemoryServer | null = null;

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

const PbnLinkSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  title: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: 'General', index: true },
  dofollow: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });
PbnLinkSchema.index({ category: 1, sortOrder: 1, createdAt: -1 });

const PlatformSettingsSchema = new mongoose.Schema({
  telegramUrl: { type: String, default: 'https://t.me/qmlab_seo' },
  packages: {
    type: [{
      name: String,
      price: String,
      priceSubtext: String,
      description: String,
      features: [String],
      isPopular: Boolean,
      ctaText: String
    }],
    default: [
      {
        name: 'Starter',
        price: '$49',
        priceSubtext: '/ link',
        description: 'Perfect for testing our link power on a single targeted keyword landing page.',
        features: ['1 Permanent Contextual Post', 'High DR 40+ Site Guaranteed', 'Do-Follow Backlink', 'Complete Crawl Guarantee'],
        isPopular: false,
        ctaText: 'Order on Telegram'
      },
      {
        name: 'Growth Pack',
        price: '$199',
        priceSubtext: '/ 5 links',
        description: 'Designed for growing small business networks to cover core keyword profiles.',
        features: ['5 Contextual Placements', 'High Domain Diversity', 'Free Premium Writing Included', 'Dedicated Anchor Audit'],
        isPopular: true,
        ctaText: 'Order on Telegram'
      },
      {
        name: 'Enterprise PBN',
        price: 'Custom',
        priceSubtext: '/ pricing',
        description: 'Connect custom domains, sitemaps directories, or rent full sites.',
        features: ['Dynamic Cross-Interlinking', 'Multiple Domain Mapping', 'Custom Theme Setups', 'Premium Custom Content Plans'],
        isPopular: false,
        ctaText: 'Contact for Custom Quote'
      }
    ]
  }
}, { timestamps: true });

export const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);
export const PbnLink = mongoose.models.PbnLink || mongoose.model('PbnLink', PbnLinkSchema);
export const PlatformSettings = mongoose.models.PlatformSettings || mongoose.model('PlatformSettings', PlatformSettingsSchema);

async function seedDefaultSites() {
  const count = await Site.countDocuments();
  if (count === 0) {
    const defaultSites = [
      { slug: 'travel', name: 'Travel', domains: ['omnicms.pages.dev'] },
    ];
    for (const siteData of defaultSites) {
      await Site.create(siteData);
    }
  }
}

export async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (MONGODB_URI) {
    try {
      cachedConnection = await mongoose.connect(MONGODB_URI);
      await seedDefaultSites();
      return cachedConnection;
    } catch (err: any) {
      console.warn('⚠️ MONGODB_URI connection failed, falling back to Memory Server:', err.message);
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      cachedConnection = null;
    }
  }

  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  cachedConnection = await mongoose.connect(mongoServer.getUri());
  await seedDefaultSites();
  return cachedConnection;
}
