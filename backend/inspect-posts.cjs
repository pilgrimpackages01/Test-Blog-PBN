const mongoose = require('mongoose');
require('dotenv').config();

const SiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
});

const PostSchema = new mongoose.Schema({
  siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
});

const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const posts = await Post.find({}).populate('siteId', 'name slug').populate('category', 'name slug');
  console.log(JSON.stringify(posts.map(p => ({
    title: p.title,
    site: p.siteId ? { name: p.siteId.name, slug: p.siteId.slug } : null,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
    slug: p.slug
  })), null, 2));
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
