const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword requerido' });

  try {
    const r = await fetch(
      `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(keyword)}&limit=25&sort_on=score&sort_order=desc`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const data = await r.json();
    const results = (data.results || []).map(l => ({
      id: l.listing_id,
      title: l.title,
      price: l.price ? (l.price.amount / l.price.divisor).toFixed(2) : null,
      currency: l.price?.currency_code,
      tags: l.tags || [],
      num_favorers: l.num_favorers || 0,
      views: l.views || 0,
      url: l.url
    }));

    const tagMap = {};
    results.forEach(l => l.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const tagInsights = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([tag, count]) => ({ tag, count }));
    const prices = results.map(l => parseFloat(l.price || 0)).filter(Boolean);
    const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : null;

    return res.status(200).json({ keyword, total: data.count, results, tag_insights: tagInsights, avg_price: avgPrice });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
