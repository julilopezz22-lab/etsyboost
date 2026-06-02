const API_KEY = process.env.ETSY_API_KEY;

// Known shop IDs cache - avoids extra API call
const SHOP_IDS = {
  'julietshopp': 46057141,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0, limit = 25 } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop name required' });
  if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  const headers = { 'x-api-key': API_KEY, 'Accept': 'application/json' };
  const shopKey = shop.toLowerCase().trim();

  try {
    // Step 1: Get shop_id — use cache first, then API
    let shopId = SHOP_IDS[shopKey] || null;
    
    if (!shopId) {
      // Try direct shop name endpoint
      const shopRes = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${encodeURIComponent(shop)}`,
        { headers }
      );
      if (shopRes.ok) {
        const shopData = await shopRes.json();
        shopId = shopData?.shop_id;
      }
    }

    if (!shopId) {
      return res.status(404).json({ 
        error: `Shop "${shop}" not found. Make sure the shop name is exactly as it appears on Etsy.`
      });
    }

    // Step 2: Fetch active listings with images
    const listRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}&includes=Images,MainImage`,
      { headers }
    );
    
    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      return res.status(listRes.status).json({ 
        error: err.error_description || `Etsy API error: ${listRes.status}`,
        hint: 'If 403, the listing data requires OAuth. Using public data only.',
        shop_id: shopId
      });
    }
    
    const data = await listRes.json();

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
