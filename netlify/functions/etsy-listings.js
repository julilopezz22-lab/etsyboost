// EtsyBoost - Netlify Function
// Proxies requests to Etsy API to avoid CORS issues

const ETSY_API_KEY = process.env.ETSY_API_KEY;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { shop, limit = 25, offset = 0 } = event.queryStringParameters || {};
    
    if (!shop) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Shop name required' })
      };
    }

    // Fetch active listings from Etsy API v3
    const url = `https://openapi.etsy.com/v3/application/shops/${shop}/listings/active?limit=${limit}&offset=${offset}&includes=Images,MainImage`;
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': ETSY_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: errorData.error_description || 'Etsy API error',
          status: response.status 
        })
      };
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
