import { proxySeoRequest } from './_seo-proxy.js';

export async function onRequest(context) {
  return proxySeoRequest(context.request, context.env, '/robots.txt');
}
