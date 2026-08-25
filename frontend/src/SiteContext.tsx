import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  textMain: string;
  textMuted: string;
}

export interface SiteConfig {
  _id: string;
  slug: string;
  name: string;
  theme: Theme;
  seo?: {
    title?: string;
    description?: string;
  };
}

interface SiteContextType {
  site: SiteConfig | null;
  loading: boolean;
  error: string | null;
}

const SiteContext = createContext<SiteContextType>({ site: null, loading: true, error: null });

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const location = useLocation();
  // Extract the first path segment as the site slug
  const siteSlug = location.pathname.split('/')[1];

  useEffect(() => {
    // If there's no site slug (e.g. at root '/'), we either redirect or show an error
    // But for now, we'll try to load whatever it is.
    if (!siteSlug || siteSlug === 'admin') {
      setLoading(false);
      return;
    }

    const fetchSite = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/sites/${siteSlug}`);
        if (!res.ok) {
          throw new Error('Site not found');
        }
        const data = await res.json();
        setSite(data);
        
        // Inject Theme CSS Variables
        const root = document.documentElement;
        if (data.theme) {
          root.style.setProperty('--primary', data.theme.primary);
          root.style.setProperty('--primary-hover', data.theme.primary); // We can calculate a hover or just use primary for now
          root.style.setProperty('--secondary', data.theme.secondary);
          root.style.setProperty('--accent', data.theme.accent);
          root.style.setProperty('--bg', data.theme.bg);
          root.style.setProperty('--surface', data.theme.surface);
          root.style.setProperty('--text-main', data.theme.textMain);
          root.style.setProperty('--text-muted', data.theme.textMuted);
        }
        
        document.title = data.name;
        
      } catch (err: any) {
        setError(err.message || 'Failed to load site');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [siteSlug]);

  return (
    <SiteContext.Provider value={{ site, loading, error }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => useContext(SiteContext);
