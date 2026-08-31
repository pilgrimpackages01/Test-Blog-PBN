import { NextResponse } from 'next/server';
import { connectDB, PbnLink } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const links = await PbnLink.find().sort({ category: 1, sortOrder: 1, createdAt: -1 });
    return NextResponse.json(links);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { url, title, category, dofollow, sortOrder } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const link = await PbnLink.create({
      url: url.trim(),
      title: title ? title.trim() : '',
      category: category ? category.trim() : 'General',
      dofollow: dofollow !== undefined ? Boolean(dofollow) : true,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not create PBN link' }, { status: 500 });
  }
}
