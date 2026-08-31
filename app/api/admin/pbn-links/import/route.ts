import { NextResponse } from 'next/server';
import { connectDB, PbnLink } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { rawText, category: defaultCategory = 'General', dofollow: defaultDofollow = true } = await request.json();
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText string is required' }, { status: 400 });
    }

    const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#'));
    let importedCount = 0;
    for (const line of lines) {
      const parts = line.split(',').map((p: string) => p.trim());
      const url = parts[0];
      if (!url) continue;
      const title = parts[1] || '';
      const dofollow = parts[2] !== undefined ? parts[2].toLowerCase() !== 'false' && parts[2].toLowerCase() !== '0' && parts[2].toLowerCase() !== 'nofollow' : defaultDofollow;

      await PbnLink.findOneAndUpdate(
        { url },
        { title, category: 'General', dofollow },
        { upsert: true, new: true }
      );
      importedCount++;
    }

    return NextResponse.json({ success: true, importedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk import failed' }, { status: 500 });
  }
}
