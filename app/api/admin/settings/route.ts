import { NextRequest, NextResponse } from 'next/server';
import { connectDB, PlatformSettings } from '@/lib/db';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = await PlatformSettings.create({});
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const data = await req.json();

  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = new PlatformSettings(data);
  } else {
    settings.telegramUrl = data.telegramUrl;
    settings.packages = data.packages;
  }
  await settings.save();

  return NextResponse.json(settings);
}
