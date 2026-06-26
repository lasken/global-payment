export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const title = url.searchParams.get('title') || 'Toomuchcoin Blog';
  const excerpt = url.searchParams.get('excerpt') || 'Thoughts on commerce, crypto, culture, and everything in between.';
  const image = url.searchParams.get('image') || 'https://toomuchcoin.com/toomuchcoin.png';
  const type = url.searchParams.get('type') || 'blog';

  let canonical = 'https://www.toomuchcoin.com/';
  if(type === 'blog') canonical += '?blog=' + encodeURIComponent(slug);
  else if(type === 'vendor') canonical += '?vendor=' + encodeURIComponent(slug);
  else if(type === 'listing') canonical += '?listing=' + encodeURIComponent(slug);

  const ua = req.headers.get('user-agent') || '';
  const isBot = /facebookexternalhit|twitterbot|whatsapp|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|applebot/i.test(ua);

  if (!isBot) {
    return new Response(null, {
      status: 302,
      headers: { Location: canonical },
    });
  }

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
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
