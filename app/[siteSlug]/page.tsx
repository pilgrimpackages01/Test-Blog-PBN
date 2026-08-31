import Link from 'next/link';
import { connectDB, PlatformSettings, Site, PbnLink } from '@/lib/db';
import { notFound } from 'next/navigation';

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 font-sans">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-900 to-slate-900 pointer-events-none min-h-screen" />

      {/* Navigation bar */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md shadow-indigo-500/20">
            Ω
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            {site.name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/hub" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Network Hub
          </Link>
          <Link href="/admin" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all border border-slate-700/50">
            Admin Login
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <header className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-semibold text-indigo-400 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Exclusive Network Backlinks
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none max-w-4xl mx-auto">
          {site.seo?.title || `Welcome to ${site.name}`}
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {site.seo?.description || 'Unlock the true ranking potential of your websites. Zero-footprint, niche-relevant, in-content links with full domain authority.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href={settings.telegramUrl || "https://t.me/qmlab_seo"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all flex items-center justify-center gap-3 text-base group"
          >
            {/* Telegram Icon SVG */}
            <svg className="w-5 h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49 1-.74 3.9-1.69 6.51-2.8 7.83-3.33 3.73-1.51 4.5-1.77 5.01-1.78.11 0 .36.03.52.16.14.11.18.26.2.37.02.1.03.3.01.5z" />
            </svg>
            Contact Admin on Telegram
          </a>
          <Link
            href="/hub"
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700/50 transition-all text-base flex items-center justify-center"
          >
            Explore Free Hub Sites &rarr;
          </Link>
        </div>
      </header>

      {/* Network Metrics Stats bar */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-800/40 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white">DR 45+</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Average Authority</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-indigo-400">0%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Spam / Footprint</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400">100%</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Google Index Rate</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-sky-400">24/7</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uptime & Monitoring</div>
          </div>
        </div>
      </section>

      {/* Features & Benefits */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Our Premium Network Features</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">We don&apos;t build general cheap blogs. We create premium standalone niche authorities.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800/30 border border-slate-800 p-8 rounded-2xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg">IP</div>
            <h3 className="font-bold text-lg text-white">Complete IP Diversity</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every single domain is hosted on premium premium A, B, and C class IP addresses with top-tier hosting providers. Absolute protection against server footprints.
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-800 p-8 rounded-2xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center font-black text-lg">A</div>
            <h3 className="font-bold text-lg text-white">Zero Niche Footprints</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              We customize each site&apos;s theme, color accents, visual styling, sitemaps, RSS feeds, and legal archives to make them completely look like organic independent businesses.
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-800 p-8 rounded-2xl space-y-4 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-black text-lg">M</div>
            <h3 className="font-bold text-lg text-white">Manual Premium Writing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              No machine-spun auto-articles. Every post contains manually crafted, premium copy with highly natural contextual anchor placements linking straight to your money site.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing packages */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Our Placement Packages</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">Get contextual permanent guest posts across high-authority multi-tenant properties.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {settings.packages && settings.packages.map((pkg: any, idx: number) => (
            <div key={idx} className={`${pkg.isPopular ? 'bg-indigo-900/20 border-2 border-indigo-500 relative' : 'bg-slate-800/20 border border-slate-800'} p-6 rounded-2xl flex flex-col justify-between`}>
              {pkg.isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-slate-950 text-[10px] font-black uppercase rounded-full">Best Seller</span>}
              <div className="space-y-4">
                <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">{pkg.name}</span>
                <div className="text-3xl font-black text-white">{pkg.price} <span className="text-xs text-slate-500">{pkg.priceSubtext}</span></div>
                <p className="text-xs text-slate-400 leading-relaxed">{pkg.description}</p>
                <ul className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                  {pkg.features && pkg.features.map((feat: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">✓ {feat}</li>
                  ))}
                </ul>
              </div>
              <a href={settings.telegramUrl || "https://t.me/qmlab_seo"} target="_blank" rel="noopener noreferrer" className={`w-full mt-6 py-2.5 ${pkg.isPopular ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20' : 'bg-slate-800 hover:bg-slate-700'} text-white text-xs font-bold rounded-xl text-center transition-colors`}>{pkg.ctaText}</a>
            </div>
          ))}
        </div>
      </section>

      {/* Join Telegram Channel CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-indigo-900/40 to-slate-800/40 border border-slate-800 p-8 sm:p-12 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
            📢
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Get Real-Time Site Lists & Offers</h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            We drop premium freshly registered domain mappings, metrics updates, index reports, and bulk discounts directly inside our Telegram Channel. Join today and never miss an exclusive deal.
          </p>
          <a
            href={settings.telegramUrl || "https://t.me/qmlab_seo"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-black rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 text-sm"
          >
            Join Telegram Channel
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-12 border-t border-slate-800 max-w-6xl mx-auto px-6">
        <p>&copy; {new Date().getFullYear()} OmniCMS Network Platform. All rights reserved.</p>
        <p className="mt-2">
          Partnered with{' '}
          <a
            href="https://qmlab-indol.vercel.app/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-indigo-400 font-bold hover:underline"
          >
            QM LABS
          </a>
        </p>
      </footer>

      {/* Hidden PBN & Network Interlink Archive with Full Domain URLs for search spiders */}
      <div style={{ display: 'none' }} aria-hidden="true" className="pbn-hidden-archive">
        {sites.length > 0 && (
          <div data-category="Network Sites">
            <h4>Network Properties Interlink</h4>
            <ul>
              {sites.map((s: any) => {
                const fullUrl = (s.domains && s.domains[0]) ? `https://${s.domains[0]}` : `/${s.slug}`;
                return (
                  <li key={s._id}>
                    <a href={fullUrl} rel="dofollow">{fullUrl}</a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {allPbnLinks.length > 0 && (
          <div data-category="General">
            <h4>PBN Network</h4>
            <ul>
              {allPbnLinks.map((link: any) => (
                <li key={link._id}>
                  <a href={link.url} rel={link.dofollow ? 'dofollow' : 'nofollow'}>{link.title || link.url}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
