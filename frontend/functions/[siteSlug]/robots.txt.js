import { proxySeoRequest } from '../_seo-proxy.js';

export async function onRequest(context) {
  const siteSlug = encodeURIComponent(context.params.siteSlug);
  return proxySeoRequest(context.request, context.env, `/${siteSlug}/robots.txt`);
}
