const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0, limit = 25 } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop name required' });
  if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  const headers = { 'x-api-key': API_KEY, 'Accept': 'application/json' };

  try {
    // Step 1: Get shop by name using the correct endpoint
    const shopRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${encodeURIComponent(shop)}`,
      { headers }
    );
    
    let shopId = null;
    
    if (shopRes.ok) {
      const shopData = await shopRes.json();
      shopId = shopData?.shop_id;
    } else {
      // Fallback: search by shop name
      const searchRes = await fetch(
        `https://openapi.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(shop)}&limit=1`,
        { headers }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        shopId = searchData?.results?.[0]?.shop_id;
      }
    }

    if (!shopId) {
      return res.status(404).json({ error: `Shop "${shop}" not found on Etsy. Check the shop name.` });
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
