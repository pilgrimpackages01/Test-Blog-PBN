import { Routes, Route } from 'react-router-dom';
import { SiteProvider, useSite } from './SiteContext';
import { BookOpen, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Post {
  _id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
}

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
          <a href={`${API_URL}/`} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs font-bold uppercase tracking-widest text-white no-underline">
            Admin Publisher
          </a>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

const BlogFeed = () => {
  const { site } = useSite();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!site) return;
    const fetchPosts = async () => {
      setFetching(true);
      try {
        const res = await fetch(`${API_URL}/api/sites/${site.slug}/posts`);
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error('Failed to fetch posts');
      } finally {
        setFetching(false);
      }
    };
    fetchPosts();
  }, [site]);

  if (!site) return null;

  return (
    <div className="p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 border-b border-border pb-6">
          <div>
            <h2 className="text-4xl font-black text-text-main mb-2">Latest Articles</h2>
            <p className="text-text-muted text-base">{site.seo?.description || `Insights and updates from ${site.name}.`}</p>
          </div>
        </div>

        {fetching ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-medium">Loading articles...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {posts.map((post, index) => (
              <article key={post._id} className="bg-surface p-8 md:p-10 rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-accent"></div>
                <header className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
                    <span>{new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <h3 className="text-3xl font-black text-text-main leading-tight">{post.title}</h3>
                </header>
                <div 
                  className="prose max-w-none text-text-main leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                ></div>
              </article>
            ))}

            {posts.length === 0 && (
              <div className="border-4 border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-16 text-text-muted text-center">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-text-main mb-2">No Articles Yet</h3>
                <p className="max-w-md mx-auto">There are currently no articles published on {site.name}.</p>
              </div>
            )}
          </div>
        )}
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
