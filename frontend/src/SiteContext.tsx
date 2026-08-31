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
  domains?: string[];
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
  isSharedHost: boolean;
}

const SiteContext = createContext<SiteContextType>({ site: null, loading: true, error: null, isSharedHost: true });

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const applyTheme = (data: SiteConfig) => {
  const root = document.documentElement;
  if (data.theme) {
    root.style.setProperty('--primary', data.theme.primary);
    root.style.setProperty('--primary-hover', data.theme.primary);
    root.style.setProperty('--secondary', data.theme.secondary);
    root.style.setProperty('--accent', data.theme.accent);
    root.style.setProperty('--bg', data.theme.bg);
    root.style.setProperty('--surface', data.theme.surface);
    root.style.setProperty('--text-main', data.theme.textMain);
    root.style.setProperty('--text-muted', data.theme.textMuted);
  }
  document.title = data.name;
};

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const location = useLocation();
  // Use the path for local/multi-site previews and the hostname for custom domains.
  const siteSlug = location.pathname.split('/')[1];

  const hostname = window.location.hostname;
  const isSharedHost = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.pages.dev')
    || hostname.endsWith('.run.app'); // Include dev/shared run.app domains as shared

  useEffect(() => {
    if (siteSlug === 'admin') {
      setLoading(false);
      return;
    }

    const fetchSite = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = `${API_URL}/api/sites/resolve?hostname=${encodeURIComponent(hostname)}`;
        if (siteSlug && siteSlug !== 'admin') {
          endpoint = `${API_URL}/api/sites/${siteSlug}`;
        } else {
          // If at root, try to fetch all sites and pick the first one
          const listRes = await fetch(`${API_URL}/api/sites`);
          if (listRes.ok) {
            const sites = await listRes.json();
            if (Array.isArray(sites) && sites.length > 0) {
              setSite(sites[0]);
              applyTheme(sites[0]);
              setLoading(false);
              return;
            }
          }
        }

        const res = await fetch(endpoint);
        if (!res.ok) {
          // Fallback to fetch all sites if specific slug failed
          const listRes = await fetch(`${API_URL}/api/sites`);
          if (listRes.ok) {
            const sites = await listRes.json();
            if (Array.isArray(sites) && sites.length > 0) {
              setSite(sites[0]);
              applyTheme(sites[0]);
              setLoading(false);
              return;
            }
          }
          throw new Error('Site not found');
        }
        const data = await res.json();
        setSite(data);
        applyTheme(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load site');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [siteSlug, isSharedHost, hostname]);

  return (
    <SiteContext.Provider value={{ site, loading, error, isSharedHost }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => useContext(SiteContext);
