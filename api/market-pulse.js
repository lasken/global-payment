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

    // 5. Build market pulse notification
    const top = gainers[0];
    const watchCoin = volSpikes[0];

    let title = `${top?.symbol?.toUpperCase()} +${top?.price_change_percentage_24h?.toFixed(1)}% — Today's top mover`;
    let body = '';
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

    const APPWRITE_PROJECT = '6a163159003bd203c63f';
    const APPWRITE_DB     = '6a1631ee00269fc986b8';
    const PUSH_FN_ID      = '6a33308800352853e374';
    const APPWRITE_KEY    = process.env.APPWRITE_API_KEY || '';

    // Helper to call push function
    const callPush = (payload) => fetch(
      `https://cloud.appwrite.io/v1/functions/${PUSH_FN_ID}/executions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': APPWRITE_PROJECT,
          'X-Appwrite-Key': APPWRITE_KEY,
        },
        body: JSON.stringify({ body: JSON.stringify(payload), async: true }),
      }
    ).catch(() => {});

    // 6. Send market pulse notification to all
    await callPush({
      title,
      body,
      icon: 'https://www.toomuchcoin.com/toomuchcoin.png',
      url: 'https://www.toomuchcoin.com/financial/coinmarkets',
      segment: 'All',
    });

    // 7. Send Datum List teaser to all
    const datumAssets = ['Gold','Bitcoin','NVIDIA','Tesla','TSMC','LVMH','S&P 500'];
    const teaserAsset = datumAssets[new Date().getDay() % datumAssets.length];
    const teaserMessages = [
      `📈 ${teaserAsset} is looking very interesting today — open Datum List to see why`,
      `⚡ Something is moving on the Datum List. ${teaserAsset} traders will want to see this`,
      `🟢 All green on the Datum List today? Open the app to check your returns`,
      `👀 ${teaserAsset} just did something worth seeing. Check your Datum List`,
      `💡 Your Datum List has something for you today — ${teaserAsset} especially`,
    ];
    const teaserMsg = teaserMessages[Math.floor(Math.random() * teaserMessages.length)];
    await callPush({
      title: 'Datum List Update 📊',
      body: teaserMsg + '. Only in Toomuchcoin.',
      url: 'https://www.toomuchcoin.com/financial/datumlist',
      segment: 'All',
    });

    // 8. ── Unread notification reminders ──
    // Fetch all unread notifications, group by user, push a reminder to each
    try {
      // Appwrite REST API query format
      const q1 = encodeURIComponent('equal("read", [false])');
      const q2 = encodeURIComponent('limit(500)');
      const unreadRes = await fetch(
        `https://cloud.appwrite.io/v1/databases/${APPWRITE_DB}/collections/notifications/documents?queries[]=${q1}&queries[]=${q2}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': APPWRITE_PROJECT,
            'X-Appwrite-Key': APPWRITE_KEY,
          },
        }
      );
      const unreadData = await unreadRes.json();
      const docs = unreadData?.documents || [];

      // Group unread by userId
      const byUser = {};
      docs.forEach(n => {
        if (!byUser[n.userId]) byUser[n.userId] = { count: 0, latest: n };
        byUser[n.userId].count++;
      });

      // Send individual push to each user with unreads
      let remindCount = 0;
      for (const [userId, data] of Object.entries(byUser)) {
        const count = data.count;
        const latest = data.latest;
        const pushTitle = count === 1
          ? `🔔 You have an unread notification`
          : `🔔 You have ${count} unread notifications`;
        const pushBody = count === 1
          ? `"${latest.title}" — tap to view`
          : `Latest: "${latest.title}" — tap to see all ${count}`;

        await callPush({
          userId,  // routes to this specific user's device via OneSignal external_id
          title: pushTitle,
          body: pushBody,
          url: 'https://www.toomuchcoin.com/profile',
        });
        remindCount++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`Unread reminders sent to ${remindCount} users`);
    } catch (reminderErr) {
      // Non-critical — don't fail the whole cron
      console.warn('Unread reminder block failed:', reminderErr.message);
    }

    return res.status(200).json({ success: true, gainers, watchCoin });

  } catch (e) {
    console.error('Market pulse error:', e);
    return res.status(500).json({ error: e.message });
  }
}
