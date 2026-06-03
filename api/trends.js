const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords requerido (separados por coma)' });

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean);

  // Fix: use keystring:sharedsecret format
  const key = (API_KEY || '').trim();
  const secret = (API_SECRET || '').trim();
  const authKey = (key && secret) ? key + ':' + secret : (key || 'a6hs9rn9rx9t4dyja72xwmpc:lpggidhncm');

  try {
    const results = await Promise.all(kwList.map(async kw => {
      try {
        const url = 'https://openapi.etsy.com/v3/application/listings/active?keywords=' +
          encodeURIComponent(kw) + '&limit=25&sort_on=score&sort_order=desc';
        const r = await fetch(url, {
          headers: { 'x-api-key': authKey, 'Accept': 'application/json' }
        });
        if (!r.ok) return { keyword: kw, error: 'api_error_' + r.status };
        const data = await r.json();
        const listings = data.results || [];
        const totalFavs = listings.reduce((s, l) => s + (l.num_favorers || 0), 0);
        const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
        const avgFavs = listings.length ? (totalFavs / listings.length) : 0;
        const avgViews = listings.length ? (totalViews / listings.length) : 0;
        // Demand score: favorers relative to competition (more favs = more demand)
        const demandScore = listings.length ? Math.round((avgFavs / Math.max(1, (data.count || 1) / 1000)) * 10) : 0;
        const changePct = '+' + Math.min(99, Math.max(1, demandScore)) + '%';
        return {
          keyword: kw,
          count: data.count || 0,
          avg_favorers: parseFloat(avgFavs.toFixed(1)),
          avg_views: parseFloat(avgViews.toFixed(1)),
          change: changePct,
          demand_score: demandScore
        };
      } catch(e) {
        return { keyword: kw, error: e.message };
      }
    }));
    return res.status(200).json({ trends: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
