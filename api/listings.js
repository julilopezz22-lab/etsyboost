const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

const SHOP_IDS = { 'julietshopp': 46057141 };

async function fetchWithRetry(url, opts, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const r = await fetch(url, opts);
    if (r.status === 429 && i < retries) {
      await new Promise(res => setTimeout(res, 600 * (i + 1)));
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

  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop name required' });

  const key = (API_KEY || '').trim();
  const secret = (API_SECRET || '').trim();
  const authKey = (key && secret) ? key + ':' + secret : (key || 'a6hs9rn9rx9t4dyja72xwmpc:lpggidhncm');
  const headers = { 'x-api-key': authKey, 'Accept': 'application/json' };

  try {
    // Resolve shop ID
    let shopId = SHOP_IDS[shop.toLowerCase()];
    if (!shopId) {
      const shopRes = await fetch('https://openapi.etsy.com/v3/application/shops?shop_name=' + encodeURIComponent(shop) + '&limit=1', { headers });
      if (!shopRes.ok) return res.status(shopRes.status).json({ error: 'Shop lookup failed' });
      const shopData = await shopRes.json();
      shopId = shopData.results && shopData.results[0] ? shopData.results[0].shop_id : null;
      if (!shopId) return res.status(404).json({ error: 'Shop not found: ' + shop });
    }

    // Step 1: Paginate to get ALL listings (Etsy max = 100 per page)
    const PAGE_SIZE = 100;
    let allListings = [];
    let totalCount = 0;
    let offset = 0;

    // First page
    const firstUrl = 'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=' + PAGE_SIZE + '&offset=0';
    const firstRes = await fetchWithRetry(firstUrl, { headers });
    if (!firstRes.ok) {
      const errText = await firstRes.text();
      return res.status(firstRes.status).json({ error: 'Etsy API ' + firstRes.status, detail: errText.substring(0, 300) });
    }
    const firstData = await firstRes.json();
    totalCount = firstData.count || 0;
    allListings = firstData.results || [];

    // Fetch remaining pages if needed
    offset = PAGE_SIZE;
    while (offset < totalCount && allListings.length < totalCount) {
      await new Promise(r => setTimeout(r, 300)); // respect rate limit
      const pageUrl = 'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=' + PAGE_SIZE + '&offset=' + offset;
      const pageRes = await fetchWithRetry(pageUrl, { headers });
      if (!pageRes.ok) break; // partial results ok
      const pageData = await pageRes.json();
      allListings = allListings.concat(pageData.results || []);
      offset += PAGE_SIZE;
    }

    // Step 2: Fetch images in batches of 5 to respect rate limits
    const imageMap = {};
    const BATCH = 5;
    for (let i = 0; i < allListings.length; i += BATCH) {
      const batch = allListings.slice(i, i + BATCH);
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
      if (i + BATCH < allListings.length) await new Promise(r => setTimeout(r, 250));
    }

    // Step 3: Merge and return
    const results = allListings.map(l => {
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

    return res.status(200).json({ count: totalCount, results });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
