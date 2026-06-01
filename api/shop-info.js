const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'shop requerido' });

  try {
    const r = await fetch(
      `https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const data = await r.json();
    const s = data?.results?.[0];
    if (!s) return res.status(404).json({ exists: false, error: 'Shop no encontrada' });

    return res.status(200).json({
      exists: true,
      shop_id: s.shop_id,
      shop_name: s.shop_name,
      title: s.title,
      listing_active_count: s.listing_active_count,
      currency_code: s.currency_code,
      url: s.url
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
