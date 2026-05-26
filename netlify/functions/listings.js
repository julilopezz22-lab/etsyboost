const API_KEY = process.env.ETSY_API_KEY;
const SECRET = process.env.ETSY_SECRET;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const { shop } = event.queryStringParameters || {};
  if (!shop) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Shop required' }) };

  try {
    // First get shop ID from shop name
    const shopRes = await fetch(`https://openapi.etsy.com/v3/application/shops?shop_name=${shop}`, {
      headers: {
        'x-api-key': `${API_KEY}:${SECRET}`,
        'Accept': 'application/json'
      }
    });

    const shopData = await shopRes.json();
    const shopId = shopData?.results?.[0]?.shop_id;

    if (!shopId) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Shop not found', data: shopData }) };

    // Then get listings using shop ID
    const url = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=25&includes=Images`;
    
    const res = await fetch(url, {
      headers: {
        'x-api-key': `${API_KEY}:${SECRET}`,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
