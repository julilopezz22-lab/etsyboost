const SHOP_IDS = {
    'julietshopp': 46057141,
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

  const shop = (req.query.shop || '').toLowerCase().trim();
    if (!shop) return res.status(400).json({ error: 'Shop required' });

  const API_KEY = process.env.ETSY_API_KEY || '';
    if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  const shopId = SHOP_IDS[shop];
    if (!shopId) {
          return res.status(404).json({ error: shop + ' not found. Available: ' + Object.keys(SHOP_IDS).join(', ') });
    }

  try {
        let allListings = [];
        let offset = 0;
        let total = null;

      do {
              const r = await fetch(
                        'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=100&offset=' + offset,
                { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
                      );
              if (!r.ok) {
                        const errText = await r.text();
                        return res.status(r.status).json({ error: 'Etsy API error', detail: errText.substring(0, 300) });
              }
              const d = await r.json();
              if (total === null) total = d.count || 0;
              allListings = allListings.concat(d.results || []);
              offset += 100;
      } while (allListings.length < total && offset < 500);

      const scored = allListings.map(l => {
              const tags = l.tags || [];
              const title = l.title || '';
              const titleScore = Math.min(100, Math.round((title.length / 140) * 100));
              const tagScore = Math.round((tags.length / 13) * 100);
              const hasDesc = (l.description || '').length > 100 ? 100 : 50;
              const overall = Math.round(titleScore * 0.4 + tagScore * 0.4 + hasDesc * 0.2);
              return {
                        listing_id: l.listing_id,
                        title: l.title,
                        url: l.url || 'https://www.etsy.com/listing/' + l.listing_id,
                        score: overall,
                        title_score: titleScore,
                        tag_score: tagScore,
                        tags_count: tags.length,
                        views: l.views || 0,
                        num_favorers: l.num_favorers || 0,
                        price: l.price,
                        state: l.state
              };
      });

      scored.sort((a, b) => a.score - b.score);

      return res.status(200).json({
              shop,
              total: allListings.length,
              listings: scored
      });
  } catch (e) {
        return res.status(500).json({ error: e.message });
  }
}
