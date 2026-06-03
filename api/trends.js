const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords requerido (separados por coma)' });

  // Limit to 8 keywords max to respect rate limits
  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 8);

  const key = (API_KEY || '').trim();
  const secret = (API_SECRET || '').trim();
  const authKey = (key && secret) ? key + ':' + secret : (key || 'a6hs9rn9rx9t4dyja72xwmpc:lpggidhncm');

  try {
    const results = [];
    // Sequential with delay to avoid 429 rate limit (5 QPS)
    for (const kw of kwList) {
      try {
        const url = 'https://openapi.etsy.com/v3/application/listings/active?keywords=' +
          encodeURIComponent(kw) + '&limit=25&sort_on=score&sort_order=desc';
        const r = await fetch(url, {
          headers: { 'x-api-key': authKey, 'Accept': 'application/json' }
        });
        if (!r.ok) {
          results.push({ keyword: kw, count: 0, avg_favorers: 0, avg_views: 0, change: '+1%', demand_score: 0 });
        } else {
          const data = await r.json();
          const listings = data.results || [];
          const totalFavs = listings.reduce((s, l) => s + (l.num_favorers || 0), 0);
          const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
          const avgFavs = listings.length ? (totalFavs / listings.length) : 0;
          const avgViews = listings.length ? (totalViews / listings.length) : 0;
          const demandScore = (data.count || 0) > 0 
            ? Math.round((avgFavs / Math.max(1, (data.count || 1) / 1000)) * 10) 
            : 0;
          results.push({
            keyword: kw,
            count: data.count || 0,
            avg_favorers: parseFloat(avgFavs.toFixed(1)),
            avg_views: parseFloat(avgViews.toFixed(1)),
            change: '+' + Math.min(99, Math.max(1, demandScore)) + '%',
            demand_score: demandScore
          });
        }
      } catch(e) {
        results.push({ keyword: kw, count: 0, avg_favorers: 0, avg_views: 0, change: '+1%', demand_score: 0 });
      }
      // 250ms delay between calls to stay under 5 QPS
      await sleep(250);
    }
    return res.status(200).json({ trends: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
