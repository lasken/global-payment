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
    
    let title = `${top?.symbol?.toUpperCase()} +${top?.price_change_percentage_24h?.toFixed(1)}% — Today's top mover`;
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

    // 6. Trigger existing Appwrite push function
    // Also send Datum List teaser notification
    const datumAssets=['Gold','Bitcoin','NVIDIA','Tesla','TSMC','LVMH','S&P 500'];
    const teaserAsset=datumAssets[new Date().getDay()%datumAssets.length];
    const teaserMessages=[
      `📈 ${teaserAsset} is looking very interesting today — open Datum List to see why`,
      `⚡ Something is moving on the Datum List. ${teaserAsset} traders will want to see this`,
      `🟢 All green on the Datum List today? Open the app to check your returns`,
      `👀 ${teaserAsset} just did something worth seeing. Check your Datum List`,
      `💡 Your Datum List has something for you today — ${teaserAsset} especially`,
    ];
    const teaserMsg=teaserMessages[Math.floor(Math.random()*teaserMessages.length)];
    await fetch(
      'https://cloud.appwrite.io/v1/functions/6a33308800352853e374/executions',
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-Appwrite-Project':'6a163159003bd203c63f',
        },
        body:JSON.stringify({
          body:JSON.stringify({
            title:'Datum List Update 📊',
            body:teaserMsg+'. Only in Toomuchcoin.',
            url:'https://www.toomuchcoin.com/financial/datumlist',
            segment:'All',
          }),
          async:true,
        }),
      }
    ).catch(()=>{});

    const fnRes = await fetch(
      'https://cloud.appwrite.io/v1/functions/6a33308800352853e374/executions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': '6a163159003bd203c63f',
        },
        body: JSON.stringify({
          body: JSON.stringify({
            title,
            body,
            icon: 'https://www.toomuchcoin.com/toomuchcoin.png', 
            url: 'https://www.toomuchcoin.com/financial/coinmarkets',
            segment: 'All',
          }),
          async: true,
        }),
      }
    );

    const fnData = await fnRes.json();
    return res.status(200).json({ success: true, fn: fnData, gainers, watchCoin });

  } catch (e) {
    console.error('Market pulse error:', e);
    return res.status(500).json({ error: e.message });
  }
}
