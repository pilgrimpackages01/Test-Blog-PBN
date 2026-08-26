// Cloudflare Pages middleware for Prerender.io
// Intercepts search engine crawlers, social media bots, and AI bots, and serves them static pre-rendered HTML from Prerender.io.
// Real human users are bypassed entirely to enjoy the fast client-side React app.

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'discordbot',
  'google page speed',
  'qwantbot',
  'pinterestbot',
  'bitrix link preview',
  'xing-content-receiver',
  'chrome-lighthouse',
  'telegrambot',
  'google-extended',
  'gptbot',
  'chatgpt-user',
  'cohere-crawler',
  'anthropic-ai',
  'perplexitybot',
  'diffbot'
];

const IGNORED_EXTENSIONS = [
  '.js',
  '.css',
  '.xml',
  '.less',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.doc',
  '.txt',
  '.ico',
  '.rss',
  '.zip',
  '.mp3',
  '.rar',
  '.exe',
  '.wmv',
  '.avi',
  '.ppt',
  '.mpg',
  '.mpeg',
  '.tif',
  '.wav',
  '.mov',
  '.psd',
  '.ai',
  '.xls',
  '.mp4',
  '.m4a',
  '.swf',
  '.dat',
  '.dmg',
  '.iso',
  '.flv',
  '.m4v',
  '.torrent',
  '.woff',
  '.woff2',
  '.ttf',
  '.svg',
  '.webmanifest',
  '.map'
];

function isBot(userAgent) {
  if (!userAgent) return false;
  const lowercaseUA = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => lowercaseUA.includes(bot));
}

function hasIgnoredExtension(url) {
  const lowercaseUrl = url.toLowerCase();
  return IGNORED_EXTENSIONS.some(ext => {
    // Ensure extension check is at the end of path or before query parameters
    const extIndex = lowercaseUrl.indexOf(ext);
    if (extIndex === -1) return false;
    
    const afterExt = lowercaseUrl.substring(extIndex + ext.length);
    return afterExt === '' || afterExt.startsWith('?') || afterExt.startsWith('#');
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Prerender.io token should be defined in Cloudflare Pages settings
  const prerenderToken = env.PRERENDER_TOKEN;

  // Only run on GET/HEAD requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return context.next();
  }

  // Bypass if no token configured or request is for a static asset
  if (!prerenderToken || hasIgnoredExtension(url.pathname)) {
    return context.next();
  }

  const userAgent = request.headers.get('user-agent');
  const hasEscapedFragment = url.searchParams.has('_escaped_fragment_');

  // Check if request is from a crawler or has AJAX Crawling parameter
  if (isBot(userAgent) || hasEscapedFragment) {
    const prerenderUrl = `https://service.prerender.io/${encodeURIComponent(request.url)}`;

    const headers = new Headers(request.headers);
    headers.set('X-Prerender-Token', prerenderToken);

    try {
      const response = await fetch(prerenderUrl, {
        headers,
        redirect: 'manual' // Handle redirect responses transparently
      });

      // Return a new response from Prerender.io to the crawler
      const prerenderResponse = new Response(response.body, response);
      prerenderResponse.headers.set('X-Prerender-Cache', 'True');
      return prerenderResponse;
    } catch (err) {
      console.error('Prerender.io request failed:', err);
      return context.next(); // Graceful fallback to raw React page if Prerender.io is down
    }
  }

  // Continue to serve standard React client-side app to humans
  return context.next();
}
