// FIXED: backend/server.ts lines 226-235
// This version correctly prioritizes the forwarded frontend hostname

function getSiteUrl(site: any, req: express.Request) {
  const configuredFrontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
  
  // PRIORITY 1: Use forwarded host if it's a Cloudflare/custom domain (not the backend itself)
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost && 
      !forwardedHost.includes('vercel.app') && 
      !forwardedHost.includes('localhost') && 
      !forwardedHost.includes('127.0.0.1')) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    console.log(`✅ Using forwarded host for ${site.slug}: ${forwardedHost}`);
    return `${protocol}://${forwardedHost}`;
  }
  
  // PRIORITY 2: Use site's first custom domain if available
  const domain = site.domains && site.domains.length > 0
    ? site.domains[0]
    : configuredFrontendUrl;
  
  // PRIORITY 3: Fallback to configured frontend URL
  if (!domain) {
    console.warn(`⚠️ No domain configured for site ${site.slug}. Using fallback.`);
    return configuredFrontendUrl || 'https://example.com';
  }
  
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  return domain.startsWith('http://') || domain.startsWith('https://')
    ? domain
    : `${protocol}://${domain}`;
}
