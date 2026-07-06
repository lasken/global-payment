// /api/market-pulse.js
// Vercel cron: runs daily at 7:00 AM Lagos time (6:00 AM UTC)

export default async function handler(req, res) {
  // Security — only allow Vercel cron or your own calls
  const auth = req.headers['authorization'];
  if (req.method !== 'GET' && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Fetch top coins from CoinGecko
    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h&per_page=250&page=1&sparkline=false&price_change_percentage=24h',
      { headers: { 'Accept': 'application/json' } }
    );
    const coins = await cgRes.json();
    if (!Array.isArray(coins)) throw new Error('CoinGecko fetch failed');

    // 2. Find top gainers
    const gainers = [...coins]
      .filter(c => c.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
      .slice(0, 3);

    // 3. Find volume spikes
    const volSpikes = [...coins]
      .filter(c => c.total_volume && c.market_cap > 0)
      .map(c => ({ ...c, vr: c.total_volume / c.market_cap }))
      .filter(c => c.vr > 0.15)
      .sort((a, b) => b.vr - a.vr)
      .slice(0, 2);

    // 4. Find hot memes
    const MEMES = ['DOGE','SHIB','PEPE','FLOKI','BONK','WIF','MEME','BOME','POPCAT'];
    const hotMeme = [...coins]
      .filter(c => MEMES.includes(c.symbol.toUpperCase()) && c.price_change_percentage_24h > 0)
      .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)[0];

    // 5. Build notification message
    const top = gainers[0];
    const watchCoin = volSpikes[0];
    let title = `🔥 ${top?.symbol?.toUpperCase()} +${top?.price_change_percentage_24h?.toFixed(1)}% — Today's top mover`;
    let body = ``;
    if (gainers.length) {
      body += `Top gainers: ${gainers.map(c => `${c.symbol.toUpperCase()} +${c.price_change_percentage_24h.toFixed(1)}%`).join(', ')}. `;
    }
    if (watchCoin) {
      body += `Watch ${watchCoin.symbol.toUpperCase()} — volume spike detected. `;
    }
    if (hotMeme) {
      body += `Hot meme: ${hotMeme.symbol.toUpperCase()} +${hotMeme.price_change_percentage_24h.toFixed(1)}%.`;
    }
    body += ' Open Toomuchcoin for full analysis.';

    // 6. Send via OneSignal
    const osRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: body },
        url: 'https://www.toomuchcoin.com/financial/coinmarkets',
        chrome_web_icon: 'https://www.toomuchcoin.com/toomuchcoin.png',
        firefox_icon: 'https://www.toomuchcoin.com/toomuchcoin.png',
      }),
    });

    const osData = await osRes.json();
    return res.status(200).json({ success: true, notif: osData, gainers, watchCoin });

  } catch (e) {
    console.error('Market pulse error:', e);
    return res.status(500).json({ error: e.message });
  }
}
