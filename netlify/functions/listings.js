const API_KEY = process.env.ETSY_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const { shop, limit = 25, offset = 0 } = event.queryStringParameters || {};
  if (!shop) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Shop required' }) };

  try {
    const url = `https://openapi.etsy.com/v3/application/shops/${shop}/listings/active?limit=${limit}&offset=${offset}&includes=Images,MainImage`;
    
    const res = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data.error_description || 'API error' }) };
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
