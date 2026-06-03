const API_KEY = process.env.ETSY_API_KEY;     // keystring
const API_SECRET = process.env.ETSY_SECRET;   // shared secret

const SHOP_IDS = {
  'julietshopp': 46057141,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0, limit = 100 } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop name required' });

  const key = API_KEY ? API_KEY.trim() : '';
  const secret = API_SECRET ? API_SECRET.trim() : '';
  const authKey = secret ? key + ':' + secret : key || 'a6hs9rn9rx9t4dyja72xwmpc:lpggidhncm';

  const headers = { 
    'x-api-key': authKey,
    'Accept': 'application/json'
  };

  try {
    let shopId = SHOP_IDS[shop.toLowerCase()];
    if (!shopId) {
      // Look up shop by name
      const shopRes = await fetch('https://openapi.etsy.com/v3/application/shops?shop_name=' + encodeURIComponent(shop) + '&limit=1', { headers });
      if (!shopRes.ok) {
        const errText = await shopRes.text();
        return res.status(shopRes.status).json({ error: 'Shop lookup failed', detail: errText.substring(0, 200) });
      }
      const shopData = await shopRes.json();
      shopId = shopData.results && shopData.results[0] ? shopData.results[0].shop_id : null;
      if (!shopId) return res.status(404).json({ error: 'Shop not found: ' + shop });
    }

    // CORRECT endpoint: get listings BY SHOP (specific endpoint)
    const url = 'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=' + limit + '&offset=' + offset + '&includes=Images,MainImage';
    const listRes = await fetch(url, { headers });
    
    if (!listRes.ok) {
      const errText = await listRes.text();
      let errJson = {};
      try { errJson = JSON.parse(errText); } catch(e) {}
      return res.status(listRes.status).json({ 
        error: errJson.error || errJson.error_description || 'Etsy API ' + listRes.status,
        detail: errText.substring(0, 300),
        shop_id: shopId
      });
    }

    const data = await listRes.json();
    const results = (data.results || []).map(l => ({
      listing_id: l.listing_id,
      title: l.title,
      description: l.description ? l.description.substring(0, 200) : '',
      price: l.price,
      tags: l.tags,
      views: l.views,
      num_favorers: l.num_favorers,
      quantity: l.quantity,
      state: l.state,
      url: l.url,
      primary_image: l.MainImage || null,
      images: l.Images || [],
      created_timestamp: l.created_timestamp,
      last_modified_timestamp: l.last_modified_timestamp
    }));

    return res.status(200).json({
      count: data.count,
      results
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
