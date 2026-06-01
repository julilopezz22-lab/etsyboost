const API_KEY = process.env.ETSY_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Shop required' });

  try {
    const shopRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`,
      { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
    );
    const shopData = await shopRes.json();
    const shopId = shopData?.results?.[0]?.shop_id;
    if (!shopId) return res.status(404).json({ error: 'Shop not found' });

    let allListings = [];
    let offset = 0;
    let total = 0;

    do {
      const r = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&offset=${offset}`,
        { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
      );
      const data = await r.json();
      total = data.count || 0;
      allListings = allListings.concat(data.results || []);
      offset += 100;
    } while (allListings.length < total && offset < 500);

    const flagged = allListings.map(l => {
      const problems = [];
      if ((l.title || '').length < 40) problems.push('Título corto (menos de 40 caracteres)');
      if ((l.tags || []).length < 10) problems.push(`Pocos tags (${(l.tags||[]).length}/13)`);
      if ((l.description || '').length < 200) problems.push('Descripción corta (menos de 200 caracteres)');
      return { id: l.listing_id, title: l.title, problems };
    }).filter(l => l.problems.length > 0);

    return res.status(200).json({ total: allListings.length, flagged_count: flagged.length, flagged });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
