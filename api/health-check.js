const API_KEY = process.env.ETSY_API_KEY;
const API_SECRET = process.env.ETSY_SECRET;

const SHOP_IDS = {
      'julietshopp': 46057141,
};

export default async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      if (req.method === 'OPTIONS') return res.status(200).end();

  const shop = (req.query.shop || '').toLowerCase().trim();
      if (!shop) return res.status(400).json({ error: 'Shop required' });

  if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  const shopId = SHOP_IDS[shop];
      if (!shopId) {
              return res.status(404).json({ error: shop + ' not found. Available: ' + Object.keys(SHOP_IDS).join(', ') });
      }

  const authKey = API_SECRET ? (API_KEY.trim() + ':' + API_SECRET.trim()) : API_KEY.trim();
      const headers = { 'x-api-key': authKey, 'Accept': 'application/json' };

  try {
          let allListings = [];
          let offset = 0;
          let total = null;

        do {
                  const r = await fetch(
                              'https://openapi.etsy.com/v3/application/shops/' + shopId + '/listings/active?limit=100&offset=' + offset,
                      { headers }
                            );
                  if (!r.ok) {
                              const errText = await r.text();
                              return res.status(r.status).json({ error: 'Etsy API error', detail: errText.substring(0, 300) });
                  }
                  const d = await r.json();
                  if (total === null) total = d.count || 0;
                  allListings = allListings.concat(d.results || []);
                  offset += 100;
        } while (allListings.length < total && offset < 500);

        const issues = allListings.map(l => {
                  const tags = l.tags || [];
                  const title = l.title || '';
                  const problems = [];

                                             if (title.length < 40) problems.push({ type: 'short_title', msg: 'Title too short (under 40 chars)', severity: 'high' });
                  if (title.length > 140) problems.push({ type: 'long_title', msg: 'Title too long (over 140 chars)', severity: 'medium' });
                  if (tags.length < 13) problems.push({ type: 'missing_tags', msg: 'Only ' + tags.length + '/13 tags used', severity: 'high' });
                  if (tags.some(t => t.length > 20)) problems.push({ type: 'long_tag', msg: 'Some tags exceed 20 chars', severity: 'medium' });
                  if (!l.description || l.description.length < 100) problems.push({ type: 'short_desc', msg: 'Description too short', severity: 'medium' });

                                             return {
                                                         listing_id: l.listing_id,
                                                         title: l.title,
                                                         url: l.url || 'https://www.etsy.com/listing/' + l.listing_id,
                                                         tags_count: tags.length,
                                                         title_length: title.length,
                                                         issues: problems,
                                                         issue_count: problems.length,
                                                         healthy: problems.length === 0
                                             };
        });

        const totalIssues = issues.reduce((s, l) => s + l.issue_count, 0);
          const healthy = issues.filter(l => l.healthy).length;

        return res.status(200).json({
                  shop,
                  total: allListings.length,
                  healthy,
                  total_issues: totalIssues,
                  listings: issues
        });
  } catch (e) {
          return res.status(500).json({ error: e.message });
  }
}
