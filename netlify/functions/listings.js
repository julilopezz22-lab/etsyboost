const API_KEY = process.env.ETSY_API_KEY;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const { shop } = event.queryStringParameters || {};
  if (!shop) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Shop required' }) };

  try {
    const url = `https://openapi.etsy.com/v3/application/shops/${shop}/listings/active?limit=25&includes=Images,MainImage`;
    
    const res = await fetch(url, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json'
      }
    });

    const text = await res.text();
    
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        status: res.status,
        apiKey: API_KEY ? API_KEY.substring(0,6)+'...' : 'MISSING',
        response: text.substring(0, 500)
      }) 
    };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
