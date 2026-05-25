// EtsyBoost - Get listings with OAuth token
const API_KEY = process.env.ETSY_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const { shop, limit = 25, offset = 0 } = event.queryStringParameters || {};
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!shop) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Shop required' }) };
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token required' }) };

  try {
    const url = `https://openapi.etsy.com/v3/application/shops/${shop}/listings/active?limit=${limit}&offset=${offset}&includes=Images,MainImage`;
    
    const res = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: err.error_description || 'API error', status: res.status }) };
    }

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
