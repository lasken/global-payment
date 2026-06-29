export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Parse clean URLs
  let type = url.searchParams.get('type') || 'blog';
  let slug = url.searchParams.get('slug') || '';
  let title = url.searchParams.get('title') || 'Toomuchcoin';
  let excerpt = url.searchParams.get('excerpt') || 'Your passport to trade and access the globe 🌎';
  let image = url.searchParams.get('image') || 'https://www.toomuchcoin.com/toomuchcoin.png';
  let canonical = url.searchParams.get('canonical') || 'https://www.toomuchcoin.com';

  // Handle clean path routing — /blog/slug, /howtoguides/cat/slug, /marketplace/vendorlist/slug
  if(path.startsWith('/blog/') && !url.searchParams.has('type')){
    slug = path.replace('/blog/','').replace(/\/$/,'');
    type = 'blog';
    canonical = `https://www.toomuchcoin.com/blog/${slug}`;
    title = slug.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) + ' — Toomuchcoin Blog';
  } else if(path.startsWith('/howtoguides/')){
    const parts = path.replace('/howtoguides/','').split('/');
    const cat = parts[0]||'';
    slug = parts[1]||'';
    type = 'guide';
    canonical = `https://www.toomuchcoin.com/howtoguides/${cat}/${slug}`;
    title = slug.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) + ' — Toomuchcoin Guide';
    excerpt = 'Free how-to guide from Toomuchcoin — no account required.';
  } else if(path.startsWith('/marketplace/vendorlist/')){
    slug = path.replace('/marketplace/vendorlist/','').replace(/\/$/,'');
    type = 'vendor';
    canonical = `https://www.toomuchcoin.com/marketplace/vendorlist/${slug}`;
    title = slug.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) + ' — Toomuchcoin Vendors';
    excerpt = 'Discover this business on the Toomuchcoin vendor directory.';
  }

  const ua = req.headers.get('user-agent') || '';
  const isBot = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|applebot/i.test(ua);

  // Non-bot — redirect to main app
  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: canonical },
    });
  }

  // Bot — serve OG tags
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)}</title>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(excerpt)}"/>
  <meta property="og:image" content="${esc(image)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${esc(canonical)}"/>
  <meta property="og:site_name" content="Toomuchcoin"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(excerpt)}"/>
  <meta name="twitter:image" content="${esc(image)}"/>
  <link rel="canonical" href="${esc(canonical)}"/>
  <meta http-equiv="refresh" content="0;url=${esc(canonical)}"/>
</head>
<body><p>Redirecting...</p></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
