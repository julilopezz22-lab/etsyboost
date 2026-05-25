// EtsyBoost - Single listing details with tags
const ETSY_API_KEY = process.env.ETSY_API_KEY;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { id } = event.queryStringParameters || {};
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Listing ID required' }) };

    const url = `https://openapi.etsy.com/v3/application/listings/${id}?includes=Images`;
    const response = await fetch(url, {
      headers: { 'x-api-key': ETSY_API_KEY, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.json();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: err.error_description }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
