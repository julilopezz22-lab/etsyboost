const API_KEY = process.env.ETSY_API_KEY;
const SECRET = process.env.ETSY_SECRET;

async function getImages(listingId) {
  try {
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/listings/${listingId}/images`,
      { headers: { 'x-api-key': `${API_KEY}:${SECRET}`, 'Accept': 'application/json' } }
    );
    const data = await res.json();
    return data.results || [];
  } catch(e) {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop required' });
  
  try {
    const shopRes = await fetch(`https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`, {
      headers: { 'x-api-key': `${API_KEY}:${SECRET}`, 'Accept': 'application/json' }
    });
    const shopData = await shopRes.json();
    const shopId = shopData?.results?.[0]?.shop_id;
    if (!shopId) return res.status(404).json({ error: 'Shop not found' });

    const listRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=25&includes=Images`,
      { headers: { 'x-api-key': `${API_KEY}:${SECRET}`, 'Accept': 'application/json' } }
    );
    const data = await listRes.json();

    // Load images in batches of 5
    const listings = data.results || [];
    for (let i = 0; i < listings.length; i += 5) {
      const batch = listings.slice(i, i + 5);
      await Promise.all(batch.map(async (listing) => {
        listing.images = await getImages(listing.listing_id);
      }));
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
