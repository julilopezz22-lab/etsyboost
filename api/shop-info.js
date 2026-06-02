const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

const SHOP_IDS = {
      'julietshopp': 46057141,
};

export default async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      if (req.method === 'OPTIONS') return res.status(200).end();

  const shop = (req.query.shop || '').toLowerCase().trim();
      if (!shop) return res.status(400).json({ error: 'shop requerido' });

  if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  const authKey = API_SECRET ? (API_KEY.trim() + ':' + API_SECRET.trim()) : API_KEY.trim();
      const headers = { 'x-api-key': authKey, 'Accept': 'application/json' };

  const shopId = SHOP_IDS[shop];

  try {
          if (shopId) {
                    const [shopRes, listRes] = await Promise.all([
                                fetch('https://openapi.etsy.com/v3/application/shops/' + shopId, { headers }),
                                fetch('https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=1', { headers })
                              ]);
                    const shopData = shopRes.ok ? await shopRes.json() : {};
                    const listData = listRes.ok ? await listRes.json() : { count: 0 };
                    return res.status(200).json({
                                exists: true,
                                shop_id: shopId,
                                shop_name: shopData.shop_name || shop,
                                title: shopData.title || '',
                                listing_count: listData.count || 0,
                                sale_count: shopData.transaction_sold_count || 0,
                                review_count: shopData.review_count || 0,
                                review_average: shopData.review_average || 0
                    });
          }

        const r = await fetch(
                  'https://openapi.etsy.com/v3/application/shops?shop_name=' + encodeURIComponent(shop),
            { headers }
                );
          if (!r.ok) return res.status(404).json({ exists: false, error: 'Shop no encontrada' });
          const d = await r.json();
          const shopData = d.results && d.results[0];
          if (!shopData) return res.status(404).json({ exists: false, error: 'Shop no encontrada' });

        const lr = await fetch(
                  'https://openapi.etsy.com/v3/application/shops/' + shopData.shop_id + '/listings/active?limit=1',
            { headers }
                );
          const ld = lr.ok ? await lr.json() : { count: 0 };

        return res.status(200).json({
                  exists: true,
                  shop_id: shopData.shop_id,
                  shop_name: shopData.shop_name,
                  title: shopData.title || '',
                  listing_count: ld.count || 0,
                  sale_count: shopData.transaction_sold_count || 0,
                  review_count: shopData.review_count || 0,
                  review_average: shopData.review_average || 0
        });
  } catch (e) {
          return res.status(500).json({ error: e.message });
  }
}
