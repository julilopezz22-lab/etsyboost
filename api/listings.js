const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop, offset = 0 } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop required' });

  try {
    const shopRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const shopData = await shopRes.json();
    const shopId = shopData?.results?.[0]?.shop_id;
    if (!shopId) return res.status(404).json({ error: 'Shop not found' });

    const listRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=25&offset=${offset}`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const data = await listRes.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
