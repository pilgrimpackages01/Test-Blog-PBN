'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'sites' | 'pbn' | 'settings'>('sites');

  // Sites state
  const [sites, setSites] = useState<any[]>([]);
  const [siteName, setSiteName] = useState('');
  const [siteSlug, setSiteSlug] = useState('');
  const [siteDomains, setSiteDomains] = useState('');
  const [editingSiteSlug, setEditingSiteSlug] = useState('');
  const [siteMsg, setSiteMsg] = useState('');

  // PBN state
  const [pbnLinks, setPbnLinks] = useState<any[]>([]);
  const [pbnId, setPbnId] = useState('');
  const [pbnUrl, setPbnUrl] = useState('');
  const [pbnTitle, setPbnTitle] = useState('');
  const [pbnDofollow, setPbnDofollow] = useState(true);
  const [pbnSortOrder, setPbnSortOrder] = useState(0);
  const [pbnImportText, setPbnImportText] = useState('');
  const [pbnImportMsg, setPbnImportMsg] = useState('');

  // Search states
  const [sitesSearch, setSitesSearch] = useState('');
  const [pbnSearch, setPbnSearch] = useState('');

  // Settings state
  const [telegramUrl, setTelegramUrl] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('omnicms_admin_token');
    if (token) {
      setAuthToken(token);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      loadSites();
      loadPbnLinks();
      loadSettings();
    }
  }, [authToken]);

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    });
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    if (!email.trim() || !password) {
      setLoginError('Email and password are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setAuthToken(data.token);
      localStorage.setItem('omnicms_admin_token', data.token);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('omnicms_admin_token');
    setAuthToken(null);
  };

  const loadSites = async () => {
    try {
      const res = await apiFetch('/api/admin/sites');
      const data = await res.json();
      if (Array.isArray(data)) setSites(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPbnLinks = async () => {
    try {
      const res = await apiFetch('/api/admin/pbn-links');
      const data = await res.json();
      if (Array.isArray(data)) setPbnLinks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        setTelegramUrl(data.telegramUrl || '');
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg('');
    try {
      const res = await apiFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUrl, packages })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setSettingsMsg('Settings saved successfully!');
      setTimeout(() => setSettingsMsg(''), 3000);
    } catch (err: any) {
      setSettingsMsg(`Error: ${err.message}`);
    }
  };

  const handleSlugChange = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (clean.includes('.')) {
      const domain = clean;
      const sub = domain.split('.')[0];
      setSiteDomains(prev => prev ? prev + '\n' + domain : domain);
      setSiteSlug(sub.replace(/[^a-z0-9-_]/g, '-'));
    } else {
      setSiteSlug(clean);
    }
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteMsg('');
    const domains = siteDomains.split('\n').map(d => d.trim()).filter(Boolean);
    try {
      const res = await apiFetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName, slug: siteSlug, domains })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSiteMsg('Site successfully saved!');
      setEditingSiteSlug('');
      setSiteName('');
      setSiteSlug('');
      setSiteDomains('');
      loadSites();
    } catch (err: any) {
      setSiteMsg(err.message || 'Could not save site');
    }
  };

  const handleDeleteSite = async (slug: string) => {
    if (!confirm(`Are you sure you want to delete site "${slug}"?`)) return;
    try {
      const res = await apiFetch(`/api/admin/sites/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      loadSites();
    } catch (err) {
      alert('Could not delete site.');
    }
  };

  const handleSavePbn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        url: pbnUrl,
        title: pbnTitle,
        category: 'General',
        dofollow: pbnDofollow,
        sortOrder: Number(pbnSortOrder || 0)
      };
      const res = await apiFetch(pbnId ? `/api/admin/pbn-links/${pbnId}` : '/api/admin/pbn-links', {
        method: pbnId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save PBN link');
      setPbnId('');
      setPbnUrl('');
      setPbnTitle('');
      setPbnDofollow(true);
      setPbnSortOrder(0);
      loadPbnLinks();
    } catch (err) {
      alert('Could not save PBN link');
    }
  };

  const handleDeletePbn = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PBN link?')) return;
    try {
      const res = await apiFetch(`/api/admin/pbn-links/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      loadPbnLinks();
    } catch (err) {
      alert('Could not delete link');
    }
  };

  const handleImportPbn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPbnImportMsg('');
    try {
      const res = await apiFetch('/api/admin/pbn-links/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pbnImportText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setPbnImportMsg(`Successfully imported ${data.importedCount} links!`);
      setPbnImportText('');
      loadPbnLinks();
    } catch (err: any) {
      setPbnImportMsg(err.message || 'Import failed');
    }
  };

  if (!authToken) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-5">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Admin Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">Please enter your admin credentials to login.</p>
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email address"
            className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-slate-200 focus:border-indigo-600 text-slate-900"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Password"
            className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none border-2 border-slate-200 focus:border-indigo-600 text-slate-900"
          />
          <button
            type="button"
            onClick={() => handleLogin()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-md transition-colors"
          >
            Sign In
          </button>
          {loginError && <p className="text-sm text-red-600 font-medium">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <header className="h-16 bg-indigo-600 flex items-center justify-between px-8 text-white shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-900 rounded-sm rotate-45"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">OmniCMS <span className="text-indigo-200 font-normal text-sm ml-2">Admin Dashboard</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="px-3 py-1.5 bg-indigo-700 rounded-lg text-xs font-bold uppercase tracking-widest text-white no-underline">
            View Website
          </Link>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold uppercase tracking-widest text-white cursor-pointer border-none">
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* Tab Bar */}
          <div className="flex border-b border-slate-200 gap-1 bg-white px-6 pt-4 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('sites')}
              className={`px-6 py-3 border-b-2 font-bold text-sm cursor-pointer transition-all ${activeTab === 'sites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              Sites Management
            </button>
            <button
              onClick={() => setActiveTab('pbn')}
              className={`px-6 py-3 border-b-2 font-bold text-sm cursor-pointer transition-all ${activeTab === 'pbn' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              PBN Links Management
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 border-b-2 font-bold text-sm cursor-pointer transition-all ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              Platform Settings
            </button>
          </div>

          {activeTab === 'sites' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl h-fit">
                <h3 className="text-xl font-black text-slate-900 mb-1">{editingSiteSlug ? 'Edit Connected Site' : 'Connect New Site'}</h3>
                <p className="text-slate-500 text-xs mb-6">Register a new tenant site or domain mapping.</p>
                <form onSubmit={handleSaveSite} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 uppercase">Site Name</label>
                    <input
                      required
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                      placeholder="Tech Pulse"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 uppercase">URL Slug / Domain</label>
                    <input
                      required
                      value={siteSlug}
                      onChange={e => handleSlugChange(e.target.value)}
                      readOnly={Boolean(editingSiteSlug)}
                      placeholder="tech-pulse or omnicms2.pages.dev"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 uppercase">Connected Domains</label>
                    <textarea
                      rows={2}
                      value={siteDomains}
                      onChange={e => setSiteDomains(e.target.value)}
                      placeholder="techpulse.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                    />
                  </div>
                  <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow-md">
                    {editingSiteSlug ? 'Update Site' : 'Save Site'}
                  </button>
                  {siteMsg && <p className="text-xs font-bold text-center mt-2 text-indigo-600">{siteMsg}</p>}
                </form>
              </div>

              <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900">Connected Sites List</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search sites..."
                      value={sitesSearch}
                      onChange={e => setSitesSearch(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm"
                    />
                    <button onClick={loadSites} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Refresh</button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                        <th className="p-4">Site Name</th>
                        <th className="p-4">Slug / URL</th>
                        <th className="p-4">Domains</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {sites.filter(s => s.name.toLowerCase().includes(sitesSearch.toLowerCase()) || s.slug.toLowerCase().includes(sitesSearch.toLowerCase())).map(site => (
                        <tr key={site._id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold">{site.name}</td>
                          <td className="p-4 font-mono text-xs text-indigo-600 max-w-xs truncate" title={typeof window !== 'undefined' ? `${window.location.origin}/${site.slug}` : `/${site.slug}`}>
                            <Link href={`/${site.slug}`} target="_blank" className="hover:underline">
                              {typeof window !== 'undefined' ? `${window.location.origin}/${site.slug}` : `/${site.slug}`}
                            </Link>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500">
                            {site.domains?.join(', ') || 'None'}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => handleDeleteSite(site.slug)} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold cursor-pointer">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {!sites.filter(s => s.name.toLowerCase().includes(sitesSearch.toLowerCase()) || s.slug.toLowerCase().includes(sitesSearch.toLowerCase())).length && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No connected sites found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pbn' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl h-fit">
                <h3 className="text-xl font-black text-slate-900 mb-1">{pbnId ? 'Edit PBN Link' : 'Add PBN Link'}</h3>
                <p className="text-slate-500 text-xs mb-6">Create or update private network backlink.</p>
                <form onSubmit={handleSavePbn} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 uppercase">Target URL</label>
                    <input
                      required
                      type="url"
                      value={pbnUrl}
                      onChange={e => setPbnUrl(e.target.value)}
                      placeholder="https://target.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 uppercase">Anchor Title / Keyword</label>
                    <input
                      value={pbnTitle}
                      onChange={e => setPbnTitle(e.target.value)}
                      placeholder="Best SEO Services"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-indigo-600 uppercase">Sort Order</label>
                      <input
                        type="number"
                        value={pbnSortOrder}
                        onChange={e => setPbnSortOrder(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="dofollowCb"
                      checked={pbnDofollow}
                      onChange={e => setPbnDofollow(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    <label htmlFor="dofollowCb" className="text-xs font-bold text-slate-900 cursor-pointer">Dofollow Link</label>
                  </div>
                  <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm cursor-pointer shadow-md">
                    {pbnId ? 'Update Link' : 'Save Link'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-3xl shadow-xl flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">PBN Links List</h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search PBN..."
                      value={pbnSearch}
                      onChange={e => setPbnSearch(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-sm"
                    />
                    <button onClick={loadPbnLinks} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">Refresh</button>
                  </div>
                </div>

                <details className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <summary className="text-xs font-bold text-indigo-600 uppercase cursor-pointer select-none">Bulk Import Links (CSV Format)</summary>
                  <form onSubmit={handleImportPbn} className="mt-3 space-y-3">
                    <textarea
                      rows={3}
                      value={pbnImportText}
                      onChange={e => setPbnImportText(e.target.value)}
                      placeholder="https://site1.com, SEO Tool, true"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs font-mono text-slate-900"
                    />
                    <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer">Import Bulk Links</button>
                    {pbnImportMsg && <p className="text-xs font-bold text-center text-emerald-600">{pbnImportMsg}</p>}
                  </form>
                </details>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                        <th className="p-4">Anchor / Title</th>
                        <th className="p-4">URL</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {pbnLinks.filter(link => link.title?.toLowerCase().includes(pbnSearch.toLowerCase()) || link.url?.toLowerCase().includes(pbnSearch.toLowerCase())).map(link => (
                        <tr key={link._id} className="hover:bg-slate-50">
                          <td className="p-4 font-semibold">{link.title || '(No title)'}</td>
                          <td className="p-4 font-mono text-xs text-slate-500 max-w-xs truncate"><a href={link.url} target="_blank" className="hover:underline text-indigo-600">{link.url}</a></td>
                          <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${link.dofollow ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{link.dofollow ? 'Dofollow' : 'Nofollow'}</span></td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={() => handleDeletePbn(link._id)} className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold cursor-pointer">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {!pbnLinks.filter(link => link.title?.toLowerCase().includes(pbnSearch.toLowerCase()) || link.url?.toLowerCase().includes(pbnSearch.toLowerCase())).length && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No PBN links found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid lg:grid-cols-1 gap-8 max-w-4xl">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
                <h3 className="text-xl font-black text-slate-900 mb-1">Global Settings</h3>
                <p className="text-slate-500 text-xs mb-6">Manage global platform configurations, telegram CTA links, and pricing packages.</p>
                {settingsMsg && <div className="mb-6 p-4 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700">{settingsMsg}</div>}
                
                <form onSubmit={handleSaveSettings} className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-800">Global Telegram URL</label>
                    <input
                      value={telegramUrl}
                      onChange={e => setTelegramUrl(e.target.value)}
                      placeholder="https://t.me/qmlab_seo"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Pricing Packages</h4>
                    <div className="space-y-8">
                      {packages.map((pkg, index) => (
                        <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                          <h5 className="font-bold text-indigo-600">Package {index + 1}</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                              <input
                                value={pkg.name}
                                onChange={e => {
                                  const newPackages = [...packages];
                                  newPackages[index].name = e.target.value;
                                  setPackages(newPackages);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Price</label>
                              <input
                                value={pkg.price}
                                onChange={e => {
                                  const newPackages = [...packages];
                                  newPackages[index].price = e.target.value;
                                  setPackages(newPackages);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Price Subtext</label>
                              <input
                                value={pkg.priceSubtext}
                                onChange={e => {
                                  const newPackages = [...packages];
                                  newPackages[index].priceSubtext = e.target.value;
                                  setPackages(newPackages);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">CTA Text</label>
                              <input
                                value={pkg.ctaText}
                                onChange={e => {
                                  const newPackages = [...packages];
                                  newPackages[index].ctaText = e.target.value;
                                  setPackages(newPackages);
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                            <textarea
                              value={pkg.description}
                              onChange={e => {
                                const newPackages = [...packages];
                                newPackages[index].description = e.target.value;
                                setPackages(newPackages);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Features (comma separated)</label>
                            <textarea
                              value={pkg.features.join(', ')}
                              onChange={e => {
                                const newPackages = [...packages];
                                newPackages[index].features = e.target.value.split(',').map((f: string) => f.trim());
                                setPackages(newPackages);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={pkg.isPopular}
                              onChange={e => {
                                const newPackages = [...packages];
                                newPackages[index].isPopular = e.target.checked;
                                setPackages(newPackages);
                              }}
                              id={`popular-${index}`}
                            />
                            <label htmlFor={`popular-${index}`} className="text-xs font-bold text-slate-600">Mark as Popular / Best Seller</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-indigo-600/30">
                      Save Global Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200">
            OmniCMS Multi-Tenant Platform · Powered by <a href="https://qmlab-indol.vercel.app/" target="_blank" rel="nofollow noopener noreferrer" className="text-indigo-600 font-bold hover:underline">QM LABS</a>
          </footer>
        </div>
      </main>
    </div>
  );
}
