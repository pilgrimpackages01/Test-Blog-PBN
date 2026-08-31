import { NextResponse } from 'next/server';
import { connectDB, Site } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { slug } = await params;
    const site = await Site.findOneAndDelete({ slug });
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not delete site' }, { status: 500 });
  }
}
