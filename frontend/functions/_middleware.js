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

function getIPv6ReverseDnsName(ip) {
  const parts = ip.split('::');
  let left = parts[0] ? parts[0].split(':') : [];
  let right = parts[1] ? parts[1].split(':') : [];
  
  left = left.map(block => block.padStart(4, '0'));
  right = right.map(block => block.padStart(4, '0'));
  
  const totalBlocks = 8;
  const missingBlocks = totalBlocks - (left.length + right.length);
  const middle = Array(missingBlocks).fill('0000');
  const fullHex = [...left, ...middle, ...right].join('');
  
  return fullHex.split('').reverse().join('.') + '.ip6.arpa';
}

async function verifyCrawlerIPDNS(ip, domains) {
  let reverseName;
  if (ip.includes(':')) {
    try {
      reverseName = getIPv6ReverseDnsName(ip);
    } catch (e) {
      return false;
    }
  } else {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    reverseName = parts.reverse().join('.') + '.in-addr.arpa';
  }

  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${reverseName}&type=PTR`, {
      headers: { 'accept': 'application/dns-json' }
    });
    const json = await res.json();
    if (!json.Answer || json.Answer.length === 0) return false;

    const hostname = json.Answer[0].data.toLowerCase().replace(/\.$/, '');
    const matched = domains.some(d => hostname === d || hostname.endsWith('.' + d));
    if (!matched) return false;

    const forwardType = ip.includes(':') ? 'AAAA' : 'A';
    const forwardRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=${forwardType}`, {
      headers: { 'accept': 'application/dns-json' }
    });
    const forwardJson = await forwardRes.json();
    if (!forwardJson.Answer || forwardJson.Answer.length === 0) return false;

    return forwardJson.Answer.some(ans => ans.data.toLowerCase().replace(/\.$/, '') === ip.toLowerCase());
  } catch (err) {
    console.error('DNS-over-HTTPS check failed:', err);
    return false;
  }
}

async function verifyCrawler(userAgent, ip) {
  if (!userAgent || !ip) return false;
  const lowercaseUA = userAgent.toLowerCase();

  // 1. Googlebot verification
  if (lowercaseUA.includes('googlebot')) {
    // Fast IPv4 prefix checks
    const googleIpv4Prefixes = [
      '66.249.', '64.233.', '74.125.', '209.85.', 
      '66.102.', '172.217.', '172.253.', '216.239.'
    ];
    if (googleIpv4Prefixes.some(prefix => ip.startsWith(prefix))) {
      return true;
    }

    // Fast IPv6 prefix checks
    const googleIpv6Prefixes = [
      '2001:4860:', '2a00:1450:', '2c0f:fb50:', '2001:4800:', '2404:6800:', '2607:f8b0:', '2800:3f0:', '2a03:2880:'
    ];
    if (googleIpv6Prefixes.some(prefix => ip.startsWith(prefix))) {
      return true;
    }

    // Full rDNS check for spoofing protection
    return await verifyCrawlerIPDNS(ip, ['googlebot.com', 'google.com']);
  }

  // 2. Bingbot verification
  if (lowercaseUA.includes('bingbot')) {
    const bingIpv4Prefixes = ['40.77.', '157.55.', '157.56.', '207.46.', '13.107.', '52.167.'];
    if (bingIpv4Prefixes.some(prefix => ip.startsWith(prefix))) {
      return true;
    }
    return await verifyCrawlerIPDNS(ip, ['search.msn.com']);
  }

  // 3. Other generic bots
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
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  const hasEscapedFragment = url.searchParams.has('_escaped_fragment_');

  // Verify if it is a legitimate crawler
  const isVerifiedBot = await verifyCrawler(userAgent, clientIp);

  // Check if request is from a crawler or has AJAX Crawling parameter
  if (isVerifiedBot || hasEscapedFragment) {
    const prerenderUrl = `https://service.prerender.io/${encodeURIComponent(request.url)}`;

    const headers = new Headers(request.headers);
    headers.set('X-Prerender-Token', prerenderToken);

    try {
      const response = await fetch(prerenderUrl, {
        headers,
        redirect: 'manual' // Handle redirect responses transparently
      });

      // Async logging to backend so crawlers don't wait
      const DEFAULT_BACKEND_URL = 'https://omnicms-backend.vercel.app';
      const backendUrl = String(env.BACKEND_URL || env.VITE_API_URL || env.APP_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
      if (backendUrl) {
        let botType = 'Other Bot / Crawler';
        const uaLower = (userAgent || '').toLowerCase();
        if (uaLower.includes('googlebot')) {
          botType = 'Googlebot';
        } else if (uaLower.includes('bingbot')) {
          botType = 'Bingbot';
        } else if (uaLower.includes('gptbot') || uaLower.includes('chatgpt')) {
          botType = 'ChatGPT-Bot';
        } else {
          const matchedBot = BOT_USER_AGENTS.find(bot => uaLower.includes(bot));
          if (matchedBot) {
            botType = matchedBot.charAt(0).toUpperCase() + matchedBot.slice(1);
          }
        }

        const siteSlug = url.pathname.split('/')[1] || '';
        const logPromise = fetch(`${backendUrl}/api/public/bot-logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: clientIp,
            userAgent,
            botType,
            url: request.url,
            siteSlug
          })
        }).catch(err => console.error('Error logging bot visit:', err));

        context.waitUntil(logPromise);
      }

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
