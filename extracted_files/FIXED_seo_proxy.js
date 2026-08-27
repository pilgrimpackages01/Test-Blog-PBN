// FIXED: frontend/functions/_seo-proxy.js
// This version always passes the frontend hostname to the backend

const DEFAULT_BACKEND_URL = 'https://omnicms-backend.vercel.app';

export async function proxySeoRequest(request, env, pathname) {
  const backendUrl = String(env.BACKEND_URL || env.VITE_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  
  // Handle root sitemap/robots redirection to tenant-specific endpoint if SITE_SLUG is configured
  let targetPathname = pathname;
  if ((pathname === '/sitemap.xml' || pathname === '/robots.txt') && env.SITE_SLUG) {
    targetPathname = `/${env.SITE_SLUG}${pathname}`;
  }

  const url = new URL(request.url);
  const hostname = url.hostname;

  const targetUrl = new URL(`${backendUrl}${targetPathname}`);
  
  // FIXED: ALWAYS pass hostname, don't check if it already exists
  // This ensures backend knows which frontend is requesting the sitemap
  if (hostname) {
    targetUrl.searchParams.set('hostname', hostname);
  }

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('X-Forwarded-Host', hostname);
  reqHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: reqHeaders
  });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
