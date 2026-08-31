import Link from 'next/link';
import { connectDB, Site } from '@/lib/db';
import { headers } from 'next/headers';

export default async function HubPage() {
  await connectDB();
  const sites = await Site.find().sort({ createdAt: -1 });
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        <header className="bg-indigo-600 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">OmniCMS Network Hub</h1>
            <p className="text-indigo-100 text-sm mt-2">Multi-tenant site & PBN backlink management platform.</p>
          </div>
          <Link href="/admin" className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-md hover:bg-indigo-50 transition-colors">
            Open Admin Publisher
          </Link>
        </header>

        <section className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6">
          <h2 className="text-xl font-black text-slate-800">Connected Tenant Sites</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sites.map((site: any) => (
              <Link key={site._id} href={`/${site.slug}`} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-500 transition-all flex flex-col justify-between group">
                <div>
                  <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{site.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-1 truncate max-w-[200px]" title={`${baseUrl}/${site.slug}`}>
                    {baseUrl}/{site.slug}
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 mt-4 inline-flex items-center gap-1">
                  Visit Site &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
