import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing. Please set it in your .env file or environment variables.');
  process.exit(1);
}

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

// Avoid OverwriteModelError
const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);

async function runSeed() {
  console.log('🔄 Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully.\n');

    const TOTAL_SITES = 88;
    let successCount = 0;

    for (let i = 1; i <= TOTAL_SITES; i++) {
      const paddedNum = String(i).padStart(3, '0'); // e.g. 001, 002
      const slug = `omnicms-${paddedNum}`;
      const domain = `${slug}.vercel.app`;
      const name = `OmniCMS ${paddedNum}`;

      await Site.findOneAndUpdate(
        { slug: slug },
        { 
          $set: {
            name: name,
            domains: [domain],
            theme: {
              primary: '#4f46e5',
              secondary: '#f8fafc',
              accent: '#fbbf24',
              bg: '#ffffff',
              surface: '#f1f5f9',
              textMain: '#0f172a',
              textMuted: '#64748b'
            },
            seo: {
              title: `Welcome to ${name}`,
              description: 'Unlock the true ranking potential of your websites. Zero-footprint, niche-relevant, in-content links with full domain authority.'
            }
          }
        },
        { upsert: true, new: true }
      );
      
      console.log(`[OK] Created / Updated: ${domain}`);
      successCount++;
    }

    console.log(`\n🎉 Successfully provisioned ${successCount} sites.`);
  } catch (error) {
    console.error('❌ Error seeding sites:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
}

runSeed();
