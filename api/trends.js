const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keywords } = req.query;
  if (!keywords) return res.status(400).json({ error: 'keywords requerido (separados por coma)' });

  const kwList = keywords.split(',').map(k => k.trim()).filter(Boolean);

  try {
    const results = await Promise.all(kwList.map(async kw => {
      const r = await fetch(
        `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(kw)}&limit=25&sort_on=score&sort_order=desc`,
        { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
      );
      if (!r.ok) return { keyword: kw, error: 'error' };
      const data = await r.json();
      const listings = data.results || [];
      const totalFavs = listings.reduce((s, l) => s + (l.num_favorers || 0), 0);
      const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
      return {
        keyword: kw,
        count: data.count || 0,
        avg_favorers: listings.length ? (totalFavs / listings.length).toFixed(1) : 0,
        avg_views: listings.length ? (totalViews / listings.length).toFixed(1) : 0
      };
    }));
    return res.status(200).json({ trends: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
