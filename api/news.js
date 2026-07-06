// /api/news.js — proxies Google News RSS
export default async function handler(req, res) {
  const { q } = req.query;
  const query = q || 'Bitcoin cryptocurrency';
  
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`News ${r.status}`);
    const xml = await r.text();
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 min cache
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(xml);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
