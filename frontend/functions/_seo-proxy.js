const DEFAULT_BACKEND_URL = 'https://omnicms-backend.vercel.app';

export async function proxySeoRequest(request, env, pathname) {
  const backendUrl = String(env.BACKEND_URL || env.VITE_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  const response = await fetch(`${backendUrl}${pathname}`, {
    method: request.method,
    headers: request.headers
  });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
