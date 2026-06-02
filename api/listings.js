const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0, limit = 25 } = req.query;
    if (!shop) return res.status(400).json({ error: 'Shop required' });
    if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured in environment variables' });

  try {
        // Step 1: Get shop_id by shop name
      const shopRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(shop)}`,
        { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
            );
        if (!shopRes.ok) {
                const err = await shopRes.json().catch(() => ({}));
                return res.status(shopRes.status).json({ error: err.error_description || 'Failed to find shop', status: shopRes.status });
        }
        const shopData = await shopRes.json();
        const shopId = shopData?.results?.[0]?.shop_id;
        if (!shopId) return res.status(404).json({ error: `Shop "${shop}" not found on Etsy` });

      // Step 2: Fetch active listings with images and tags
      const listRes = await fetch(
              `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}&includes=Images,MainImage`,
        { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
            );
        if (!listRes.ok) {
                const err = await listRes.json().catch(() => ({}));
                return res.status(listRes.status).json({ error: err.error_description || 'Failed to fetch listings', status: listRes.status });
        }
        const data = await listRes.json();

      // Step 3: Enrich listings with views data (fetch individually if needed)
      const results = (data.results || []).map(l => ({
              listing_id: l.listing_id,
              title: l.title,
              description: l.description,
              price: l.price,
              tags: l.tags || [],
              views: l.views || 0,
              num_favorers: l.num_favorers || 0,
              quantity: l.quantity,
              state: l.state,
              url: l.url,
              primary_image: l.primary_image || null,
              images: l.images || [],
              created_timestamp: l.created_timestamp,
              last_modified_timestamp: l.last_modified_timestamp
      }));

      return res.status(200).json({
              count: data.count || 0,
              results,
              shop_id: shopId,
              shop_name: shop
      });
  } catch (e) {
        return res.status(500).json({ error: e.message });
  }
}
