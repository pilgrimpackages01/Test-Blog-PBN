import { connectDB, PlatformSettings, Site, PbnLink } from '@/lib/db';
import { headers } from 'next/headers';
import { LandingTemplate } from '@/components/LandingTemplate';

export default async function AdvertisePage() {
  await connectDB();
  
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});

  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Try to find if this root domain belongs to a specific tenant
  let site = null;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    site = await Site.findOne({ domains: host.toLowerCase() });
  }

  const sites = await Site.find().sort({ createdAt: -1 });
  const allPbnLinks = await PbnLink.find().sort({ category: 1, sortOrder: 1, createdAt: -1 });

  return <LandingTemplate site={site} settings={settings} sites={sites} allPbnLinks={allPbnLinks} />;
}
