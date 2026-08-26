import { Routes, Route, Link, useParams } from 'react-router-dom';
import { SiteProvider, useSite } from './SiteContext';
import { BookOpen, Loader2, Search, ArrowUpRight, CalendarDays } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  if (error) return <div className="p-10 text-center text-text-muted"><h1 className="text-2xl font-bold text-text-main">Article not found</h1><Link to={backLink} className="text-primary font-bold">Back to articles</Link></div>;
  if (!post) return <div className="p-10 text-center text-text-muted">Loading article...</div>;
  return <article className="max-w-3xl mx-auto p-6 md:p-10"><Link to={backLink} className="text-primary font-bold">Back to articles</Link>{post.coverImage && <img src={post.coverImage} alt="" className="w-full aspect-video object-cover mt-8" />}{post.coverImage && <img src={post.coverImage} alt="" className="hidden" referrerPolicy="no-referrer" /> /* pre-render asset prefetch fallback if needed */}<h1 className="text-4xl font-black text-text-main mt-8 mb-6">{post.title}</h1><div className="prose max-w-none text-text-main leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} /></article>;
};

const BlogFeed = () => {
  const { site, isSharedHost } = useSite();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');

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
  const visiblePosts = posts.filter((post) => `${post.title} ${post.excerpt || ''}`.toLowerCase().includes(search.toLowerCase()));
  const featuredPost = visiblePosts[0];

  return (
    <div className="public-shell p-5 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
          <div><p className="eyebrow">The {site.name} journal</p><h2 className="display-title">Ideas worth keeping.</h2><p className="text-text-muted text-lg max-w-xl">{site.seo?.description || `Insights and updates from ${site.name}.`}</p></div>
          <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search articles" /></label>
        </div>

        {fetching ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-medium">Loading articles...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {featuredPost && !search && (
              <article className="featured-story">
                <div className="featured-copy">
                  <p className="eyebrow">Featured story</p>
                  <h3><Link to={getSiteLink(site.slug, isSharedHost, `/post/${featuredPost.slug}`)}>{featuredPost.title}</Link></h3>
                  <p>{featuredPost.excerpt || featuredPost.content.replace(/<[^>]+>/g, '').slice(0, 180)}</p>
                  <Link to={getSiteLink(site.slug, isSharedHost, `/post/${featuredPost.slug}`)} className="story-link">Read story <ArrowUpRight size={17} /></Link>
                </div>
                {featuredPost.coverImage && <img src={featuredPost.coverImage} alt="" referrerPolicy="no-referrer" />}
              </article>
            )}
            {visiblePosts.slice(search ? 0 : 1).map((post) => (
              <article key={post._id} className="story-row">
                {post.coverImage && <img src={post.coverImage} alt="" referrerPolicy="no-referrer" />}
                <div>
                  <div className="story-meta">
                    <CalendarDays size={15} />
                    {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    <span>{post.author || site.name}</span>
                  </div>
                  <h3><Link to={getSiteLink(site.slug, isSharedHost, `/post/${post.slug}`)}>{post.title}</Link></h3>
                  <p>{post.excerpt || post.content.replace(/<[^>]+>/g, '').slice(0, 180)}...</p>
                  <Link to={getSiteLink(site.slug, isSharedHost, `/post/${post.slug}`)} className="story-link">Continue reading <ArrowUpRight size={17} /></Link>
                </div>
              </article>
            ))}

            {visiblePosts.length === 0 && (
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
              <Route path="/post/:postSlug" element={<PostArticle />} />
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
