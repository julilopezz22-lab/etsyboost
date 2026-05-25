// EtsyBoost OAuth - Start auth flow
const CLIENT_ID = process.env.ETSY_API_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://etsyboost-juli.netlify.app/api/callback';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Generate code verifier and challenge for PKCE
  const crypto = require('crypto');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = `https://www.etsy.com/oauth/connect?` +
    `response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=listings_r%20shops_r` +
    `&client_id=${CLIENT_ID}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      authUrl, 
      codeVerifier,
      state 
    })
  };
};
