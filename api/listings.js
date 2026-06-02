const API_KEY = process.env.ETSY_API_KEY;   // keystring: a6hs9rn9rx9t4dyja72xwmpc
const API_SECRET = process.env.ETSY_SECRET; // shared secret

// julietshopp known shop_id
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

  const shopKey = shop.toLowerCase().trim();
  const shopId = SHOP_IDS[shopKey];

  if (!shopId) {
    return res.status(404).json({ 
      error: `Shop "${shop}" not found. Available: ${Object.keys(SHOP_IDS).join(', ')}`
    });
  }

  // Etsy v3 API - try with just keystring first (for public endpoints)
  const headers = { 
    'x-api-key': API_KEY,
    'Accept': 'application/json'
  };

  try {
    // Public listings endpoint - works with just API key for public data
    const url = `https://openapi.etsy.com/v3/application/listings/active?shop_id=${shopId}&limit=${limit}&offset=${offset}&includes=Images,MainImage`;
    
    const listRes = await fetch(url, { headers });
    
    if (!listRes.ok) {
      const errText = await listRes.text();
      let errJson = {};
      try { errJson = JSON.parse(errText); } catch(e) {}
      
      return res.status(listRes.status).json({ 
        error: errJson.error || errJson.error_description || `Etsy API ${listRes.status}`,
        detail: errText.substring(0, 200),
        shop_id: shopId,
        url_tried: url
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
