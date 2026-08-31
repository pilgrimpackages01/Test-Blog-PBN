import { Routes, Route, Link, useParams } from 'react-router-dom';
import { SiteProvider, useSite } from './SiteContext';
import { BookOpen, Loader2, Search, ArrowUpRight, CalendarDays } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

const API_URL = import.meta.env.VITE_API_URL || 'https://omnicms-backend.vercel.app';

interface Post {
  _id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  robots?: 'index' | 'noindex';
  excerpt?: string;
  coverImage?: string;
  author?: string;
  status?: 'draft' | 'published' | 'scheduled';
}

interface SiteConfig {
  _id: string;
  slug: string;
  name: string;
  domains?: string[];
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    textMain: string;
    textMuted: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
}

interface PbnLink {
  _id: string;
  url: string;
  title?: string;
  category?: string;
  dofollow: boolean;
  sortOrder?: number;
}

const PbnHiddenFooter = () => {
  const [pbnLinks, setPbnLinks] = useState<PbnLink[]>([]);
  const [sites, setSites] = useState<SiteConfig[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/pbn-links`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPbnLinks(data);
      })
      .catch(() => {});

    fetch(`${API_URL}/api/sites`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSites(data);
      })
      .catch(() => {});
  }, []);

  const grouped = pbnLinks.reduce((acc: Record<string, PbnLink[]>, link) => {
    const cat = link.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(link);
    return acc;
  }, {},);

  return (
    <div style={{ display: 'none' }} aria-hidden="true" className="pbn-hidden-archive">
      {/* Network Site Interlinks */}
      {sites.length > 0 && (
        <div data-category="Network Sites">
          <h4>Network Properties Interlink</h4>
          <ul>
            {sites.map(s => {
              const fullUrl = (s.domains && s.domains[0]) ? `https://${s.domains[0]}` : `${window.location.origin}/${s.slug}`;
              return (
                <li key={s._id}>
                  <a href={fullUrl} rel="dofollow">{fullUrl}</a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* PBN Links */}
      {Object.entries(grouped).map(([category, links]) => (
        <div key={category} data-category={category}>
          <h4>{category} PBN Network</h4>
          <ul>
            {links.map((link) => (
              <li key={link._id}>
                <a href={link.url} rel={link.dofollow ? 'dofollow' : 'nofollow'}>
                  {link.title || link.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const SiteLayout = ({ children }: { children: React.ReactNode }) => {
  const { site, loading, error } = useSite();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
          <BookOpen className="w-16 h-16 mx-auto mb-6 text-slate-300" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">Site Not Found</h1>
          <p className="text-slate-500">The requested tenant site does not exist or is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-bg flex flex-col font-sans transition-colors duration-300">
      <header className="h-16 bg-primary flex items-center justify-between px-8 text-white shadow-lg z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-inner">
            <BookOpen className="w-5 h-5 text-primary" style={{ color: site.theme.primary }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{site.name}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="/admin" className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs font-bold uppercase tracking-widest text-white no-underline">
            Admin Publisher
          </a>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="mt-12 text-center text-xs text-text-muted py-6 border-t border-border">
        {site.name} Platform · Powered by <a href="https://qmlab-indol.vercel.app/" target="_blank" rel="nofollow noopener noreferrer" className="text-primary font-bold hover:underline">QM LABS</a>
      </footer>
      <PbnHiddenFooter />
    </div>
  );
};

const getSiteLink = (siteSlug: string, isSharedHost: boolean, path: string = '') => {
  return isSharedHost ? `/${siteSlug}${path}` : path || '/';
};

const PostArticle = () => {
  const { site, isSharedHost } = useSite();
  const { postSlug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!site || !postSlug) return;
    setPost(null);
    setError(false);
    fetch(`${API_URL}/api/sites/${site.slug}/posts/${postSlug}`).then(async (response) => {
      if (!response.ok) throw new Error('Article not found');
      return response.json();
    }).then(setPost).catch(() => setError(true));
  }, [site, postSlug]);

  useEffect(() => {
    if (!post) return;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
    robots.setAttribute('content', post.robots === 'noindex' ? 'noindex, nofollow' : 'index, follow');
    return () => { robots?.remove(); };
  }, [post]);

  if (!site) return null;
  const backLink = getSiteLink(site.slug, isSharedHost, '');

  if (error) return <div className="p-10 text-center text-text-muted"><h1 className="text-2xl font-bold text-text-main mb-4">Article not found</h1><Link to={backLink} className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-md">Back to articles</Link></div>;
  if (!post) return <div className="p-10 text-center text-text-muted flex items-center justify-center gap-2"><Loader2 className="animate-spin text-primary w-5 h-5" /> Loading article...</div>;
  return (
    <article className="max-w-5xl mx-auto p-6 md:py-16 md:px-10">
      <Link to={backLink} className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline mb-8 group transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:-translate-x-1"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to articles
      </Link>
      
      {post.coverImage && (
        <div className="rounded-2xl overflow-hidden shadow-lg mb-10 border border-border">
          <img src={post.coverImage} alt="" className="w-full aspect-video object-cover transition-transform hover:scale-105 duration-700" />
        </div>
      )}
      {post.coverImage && <img src={post.coverImage} alt="" className="hidden" referrerPolicy="no-referrer" />}
      
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-text-main tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-xs font-semibold text-text-muted mt-6 border-b border-border pb-6 uppercase tracking-wider">
          <span>By {post.author || site.name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-border" />
          <span>{new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </header>
      
      <div 
        className="prose max-w-none text-text-main leading-relaxed text-base md:text-lg font-sans" 
        style={{ maxWidth: '90%' }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} 
      />
    </article>
  );
};

const BlogFeed = () => {
  const { site } = useSite();

  if (!site) return null;

  return (
    <div className="public-shell p-5 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* PBN Agency Hub Hero Section (inspired by seo-anomaly-d-24.xyz) */}
        <div className="bg-surface border border-border p-8 md:p-12 rounded-3xl shadow-xl mb-12">
          <div className="max-w-3xl">
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest rounded-full">Enterprise PBN Network Hub</span>
            <h2 className="text-3xl md:text-5xl font-black text-text-main mt-4 mb-4 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              High-Authority Backlink Architecture & Zero-Footprint Networks
            </h2>
            <p className="text-text-muted text-base md:text-lg mb-6 leading-relaxed">
              Scale your search engine rankings with our ultra-secure Private Blog Network (PBN) hub. Featuring automated Googlebot protection shields, multi-region link syndication, and high-trust dofollow/nofollow link distribution.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="px-6 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                Connect via Telegram
              </a>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Googlebot Crawler Shield & Prerender Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const siteView = (
    <SiteProvider>
      <SiteLayout>
        <Routes>
          <Route path="/" element={<BlogFeed />} />
              <Route path="/:postSlug" element={<PostArticle />} />
        </Routes>
      </SiteLayout>
    </SiteProvider>
  );

  return (
    <Routes>
      <Route path="/" element={siteView} />
      <Route path="/:siteSlug/*" element={siteView} />
    </Routes>
  );
}
