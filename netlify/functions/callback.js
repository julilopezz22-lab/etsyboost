// EtsyBoost OAuth - Handle callback from Etsy
const CLIENT_ID = process.env.ETSY_API_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://etsyboost-juli.netlify.app/api/callback';

exports.handler = async (event) => {
  const { code, state } = event.queryStringParameters || {};

  if (!code) {
    return { statusCode: 302, headers: { Location: '/?error=no_code' } };
  }

  const codeVerifier = state;

  try {
    const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return {
        statusCode: 302,
        headers: { Location: `/?error=token_failed&msg=${encodeURIComponent(JSON.stringify(tokenData))}` }
      };
    }

    return {
      statusCode: 302,
      headers: { Location: `/?token=${tokenData.access_token}` }
    };

  } catch (e) {
    return {
      statusCode: 302,
      headers: { Location: `/?error=${encodeURIComponent(e.message)}` }
    };
  }
};
