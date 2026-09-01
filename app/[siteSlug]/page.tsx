import { connectDB, PlatformSettings, Site, PbnLink } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LandingTemplate } from '@/components/LandingTemplate';

export default async function TenantSitePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  await connectDB();
  const { siteSlug } = await params;
  
  let site = await Site.findOne({ slug: siteSlug });
  if (!site) {
    site = await Site.findOne({ domains: siteSlug.toLowerCase() });
  }
  
  if (!site) {
    notFound();
  }
  
  const sites = await Site.find().sort({ createdAt: -1 });
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  const allPbnLinks = await PbnLink.find().sort({ category: 1, sortOrder: 1, createdAt: -1 });

  return <LandingTemplate site={site} settings={settings} sites={sites} allPbnLinks={allPbnLinks} />;
}
