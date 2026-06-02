const API_KEY = process.env.ETSY_API_KEY;

// Keyword Explorer: searches Etsy listings for a keyword and returns
// real search volume (total count), competition, avg price, avg favorites,
// and tag insights extracted from actual top listings.
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ error: 'keyword required' });
    if (!API_KEY) return res.status(500).json({ error: 'ETSY_API_KEY not configured' });

  try {
        // Fetch top listings for this keyword sorted by score (relevance)
      const [scoreRes, recentRes] = await Promise.all([
              fetch(
                        `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(keyword)}&limit=25&sort_on=score&sort_order=desc`,
                { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
                      ),
              fetch(
                        `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(keyword)}&limit=25&sort_on=created&sort_order=desc`,
                { headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' } }
                      )
            ]);

      if (!scoreRes.ok) {
              const err = await scoreRes.json().catch(() => ({}));
              return res.status(scoreRes.status).json({ error: err.error_description || 'Etsy API error' });
      }

      const scoreData = await scoreRes.json();
        const recentData = recentRes.ok ? await recentRes.json() : { results: [] };

      const topListings = scoreData.results || [];
        const totalCount = scoreData.count || 0;

      // Extract tag frequencies from top sellers
      const tagMap = {};
        topListings.forEach(l => {
                (l.tags || []).forEach(t => {
                          const key = t.toLowerCase().trim();
                          if (key) tagMap[key] = (tagMap[key] || 0) + 1;
                });
        });
        const tagInsights = Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([tag, count]) => ({ tag, count, pct: Math.round(count / Math.max(topListings.length, 1) * 100) }));

      // Price analysis
      const prices = topListings
          .map(l => l.price ? parseFloat(l.price.amount) / parseFloat(l.price.divisor || 100) : null)
          .filter(p => p !== null && p > 0);
        const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : null;
        const minPrice = prices.length ? Math.min(...prices).toFixed(2) : null;
        const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : null;

      // Engagement metrics
      const avgFavorers = topListings.length
          ? (topListings.reduce((s, l) => s + (l.num_favorers || 0), 0) / topListings.length).toFixed(0)
              : 0;
        const avgViews = topListings.length
          ? (topListings.reduce((s, l) => s + (l.views || 0), 0) / topListings.length).toFixed(0)
                : 0;

      // Competition score: low count = low competition, high count = high competition
      // Scale: 0-100 where 100 = very competitive
      const competitionScore = Math.min(100, Math.round((totalCount / 50000) * 100));
        const competitionLabel = competitionScore >= 70 ? 'High' : competitionScore >= 40 ? 'Medium' : 'Low';

      // Related keyword suggestions from tag data
      const relatedKeywords = tagInsights
          .filter(t => !t.tag.includes(keyword.toLowerCase().trim()))
          .slice(0, 10)
          .map(t => ({ keyword: t.tag, mentions: t.count, pct: t.pct }));

      // Title patterns from top listings
      const titlePatterns = topListings.slice(0, 5).map(l => ({
              title: l.title,
              length: (l.title || '').length,
              price: l.price ? (parseFloat(l.price.amount) / parseFloat(l.price.divisor || 100)).toFixed(2) : null,
              favorers: l.num_favorers || 0,
              views: l.views || 0
      }));

      return res.status(200).json({
              keyword,
              total_results: totalCount,
              competition_score: competitionScore,
              competition_label: competitionLabel,
              avg_price: avgPrice,
              min_price: minPrice,
              max_price: maxPrice,
              avg_favorers: avgFavorers,
              avg_views: avgViews,
              tag_insights: tagInsights,
              related_keywords: relatedKeywords,
              top_title_patterns: titlePatterns,
              sample_count: topListings.length
      });

  } catch (e) {
        return res.status(500).json({ error: e.message });
  }
}
