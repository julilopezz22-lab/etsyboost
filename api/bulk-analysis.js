const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop required' });

  try {
    const shopRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const shopData = await shopRes.json();
    const shopId = shopData?.results?.[0]?.shop_id;
    if (!shopId) return res.status(404).json({ error: 'Shop not found' });

    let allListings = [];
    let offset = 0;
    let total = 0;

    do {
      const r = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&offset=${offset}`,
        { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
      );
      const data = await r.json();
      total = data.count || 0;
      allListings = allListings.concat(data.results || []);
      offset += 100;
    } while (allListings.length < total && offset < 500);

    const prices = allListings.map(l => parseFloat((l.price?.amount || 0) / (l.price?.divisor || 100)));
    const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 0;
    const maxPrice = Math.max(...prices).toFixed(2);
    const minPrice = Math.min(...prices).toFixed(2);

    const tagMap = {};
    allListings.forEach(l => (l.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, count]) => ({ tag, count }));

    const topByViews = [...allListings]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(l => ({ id: l.listing_id, title: l.title, views: l.views || 0 }));

    return res.status(200).json({
      total: allListings.length,
      price_stats: { avg: avgPrice, min: minPrice, max: maxPrice },
      top_tags: topTags,
      top_by_views: topByViews
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
