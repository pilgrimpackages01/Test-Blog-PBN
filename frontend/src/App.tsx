import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Server } from 'lucide-react';

interface DataItem {
  _id: string;
  heading: string;
  content: string;
  createdAt: string;
}

export default function App() {
  const [data, setData] = useState<DataItem[]>([]);
  const [fetching, setFetching] = useState(true);

  // In production (Cloudflare), you will set VITE_API_URL to the Render backend URL
  // In local dev (AI Studio), this falls back to an empty string to use the Vite proxy
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchData = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${apiUrl}/api/data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen w-full bg-bg flex flex-col font-sans">
      <header className="h-16 bg-primary flex items-center justify-between px-8 text-white shadow-lg z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tech Chronicles</h1>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="/admin" className="flex items-center gap-2 px-3 py-1.5 bg-primary-hover rounded-lg transition-colors text-xs font-bold uppercase tracking-widest border border-indigo-500 text-white no-underline">
            <Server className="w-3 h-3" />
            Admin Publisher
          </a>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 border-b border-border pb-6">
            <div>
              <h2 className="text-4xl font-black text-text-main mb-2">Latest Articles</h2>
              <p className="text-text-muted text-base">Insights, updates, and tutorials from the team.</p>
            </div>
            <div className="flex gap-2 items-center mt-4 sm:mt-0">
              <button 
                onClick={fetchData} 
                disabled={fetching}
                className="px-4 py-2 bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-xs font-bold text-primary border border-border shadow-sm transition-colors cursor-pointer"
              >
                Refresh Feed
              </button>
            </div>
          </div>

          {fetching && (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p className="font-medium">Loading articles...</p>
            </div>
          )}

          <div className="space-y-12">
            {!fetching && data.map((item, index) => (
              <article key={item._id} className="bg-surface p-8 md:p-10 rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${index % 3 === 0 ? 'bg-accent' : index % 3 === 1 ? 'bg-primary' : 'bg-emerald-400'}`}></div>
                
                <header className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
                    <span>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <h3 className="text-3xl font-black text-text-main leading-tight">{item.heading}</h3>
                </header>

                <div 
                  className="prose prose-indigo max-w-none text-text-main leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                ></div>
                
                <footer className="mt-8 pt-6 border-t border-border flex items-center justify-between text-xs font-medium text-text-muted">
                  <span>ID: {item._id}</span>
                  <button className="text-primary hover:text-primary-hover font-bold uppercase tracking-widest transition-colors">Read More &rarr;</button>
                </footer>
              </article>
            ))}

            {!fetching && data.length === 0 && (
              <div className="border-4 border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-16 text-text-muted text-center">
                <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-text-main mb-2">No Articles Yet</h3>
                <p className="max-w-md mx-auto">There are currently no articles published. Head over to the Admin Publisher to write your first post.</p>
                <a href="/admin" className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors inline-block">
                  Write an Article
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
