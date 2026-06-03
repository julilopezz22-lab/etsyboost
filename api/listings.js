const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

const SHOP_IDS = {
  'julietshopp': 46057141,
};

// Helper: fetch with retry on 429
async function fetchWithRetry(url, opts, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(url, opts);
    if (r.status === 429 && i < retries) {
      await new Promise(res => setTimeout(res, 500 * (i + 1)));
      continue;
    }
    return r;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0, limit = 100 } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop name required' });

  const key = (API_KEY || '').trim();
  const secret = (API_SECRET || '').trim();
  const authKey = (key && secret) ? key + ':' + secret : (key || 'a6hs9rn9rx9t4dyja72xwmpc:lpggidhncm');
  const headers = { 'x-api-key': authKey, 'Accept': 'application/json' };

  try {
    let shopId = SHOP_IDS[shop.toLowerCase()];
    if (!shopId) {
      const shopRes = await fetch('https://openapi.etsy.com/v3/application/shops?shop_name=' + encodeURIComponent(shop) + '&limit=1', { headers });
      if (!shopRes.ok) return res.status(shopRes.status).json({ error: 'Shop lookup failed' });
      const shopData = await shopRes.json();
      shopId = shopData.results && shopData.results[0] ? shopData.results[0].shop_id : null;
      if (!shopId) return res.status(404).json({ error: 'Shop not found: ' + shop });
    }

    // Step 1: get listings
    const listUrl = 'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=' + limit + '&offset=' + offset;
    const listRes = await fetchWithRetry(listUrl, { headers });
    if (!listRes.ok) {
      const errText = await listRes.text();
      return res.status(listRes.status).json({ error: 'Etsy API ' + listRes.status, detail: errText.substring(0, 300) });
    }
    const data = await listRes.json();
    const listings = data.results || [];

    // Step 2: fetch images in small batches (5 at a time) to stay within rate limits
    const imageMap = {};
    const BATCH_SIZE = 5;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async l => {
        try {
          const imgRes = await fetchWithRetry(
            'https://openapi.etsy.com/v3/application/listings/' + l.listing_id + '/images',
            { headers }
          );
          if (imgRes && imgRes.ok) {
            const imgData = await imgRes.json();
            imageMap[l.listing_id] = imgData.results || [];
          }
        } catch(e) {}
      }));
      // Small delay between batches to avoid rate limit
      if (i + BATCH_SIZE < listings.length) {
        await new Promise(res => setTimeout(res, 200));
      }
    }

    // Step 3: merge
    const results = listings.map(l => {
      const imgs = imageMap[l.listing_id] || [];
      return {
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
        primary_image: imgs[0] || null,
        images: imgs,
        created_timestamp: l.created_timestamp,
        last_modified_timestamp: l.last_modified_timestamp
      };
    });

    return res.status(200).json({ count: data.count, results });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
