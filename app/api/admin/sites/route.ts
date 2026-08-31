import { NextResponse } from 'next/server';
import { connectDB, Site } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await connectDB();
    const sites = await Site.find().sort({ createdAt: -1 });
    return NextResponse.json(sites);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { slug, name, domains = [], theme, seo } = await request.json();
    if (!slug || !name) {
      return NextResponse.json({ error: 'Slug and name are required' }, { status: 400 });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const normalizedDomains = [...new Set(domains
      .map((domain: string) => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))
      .filter(Boolean))];

    if (normalizedDomains.length > 0) {
      await Site.updateMany(
        {},
        { $pull: { domains: { $in: normalizedDomains } } }
      );
    }

    const site = await Site.findOneAndUpdate(
      { slug: cleanSlug },
      { name: name.trim(), domains: normalizedDomains, theme, seo },
      { new: true, upsert: true }
    );

    return NextResponse.json(site);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not save site' }, { status: 400 });
  }
}
