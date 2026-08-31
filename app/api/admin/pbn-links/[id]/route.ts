import { NextResponse } from 'next/server';
import { connectDB, PbnLink } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;
    const { url, title, category, dofollow, sortOrder } = await request.json();

    const link = await PbnLink.findByIdAndUpdate(
      id,
      {
        ...(url && { url: url.trim() }),
        ...(title !== undefined && { title: title.trim() }),
        ...(category && { category: category.trim() }),
        ...(dofollow !== undefined && { dofollow: Boolean(dofollow) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) })
      },
      { new: true }
    );
    if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    return NextResponse.json(link);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not update PBN link' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { id } = await params;
    const link = await PbnLink.findByIdAndDelete(id);
    if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not delete PBN link' }, { status: 500 });
  }
}
