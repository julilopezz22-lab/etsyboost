const API_KEY = process.env.ETSY_API_KEY;
const SECRET = process.env.ETSY_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });
  try {
    const r = await fetch(
      `https://openapi.etsy.com/v3/application/listings/${id}/images`,
      { headers: { 'x-api-key': `${API_KEY}:${SECRET}`, 'Accept': 'application/json' } }
    );
    const data = await r.json();
    const url = data.results?.[0]?.url_570xN || null;
    return res.status(200).json({ url });
  } catch(e) {
    return res.status(200).json({ url: null });
  }
}
