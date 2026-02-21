#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

async function refreshToken() {
  // Read config
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  console.log('🔄 Refreshing Basecamp access token...');

  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    console.error('❌ Missing required fields: refreshToken, clientId, clientSecret');
    process.exit(1);
  }

  // Call Basecamp OAuth token endpoint
  const response = await fetch('https://launchpad.37signals.com/authorization/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      type: 'refresh',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Token refresh failed:', response.status, text);
    process.exit(1);
  }

  const data = await response.json();

  // Update config with new tokens
  config.accessToken = data.access_token;
  if (data.refresh_token) {
    config.refreshToken = data.refresh_token;
  }

  // Write back to config.json
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log('✅ Token refreshed successfully!');
  console.log('📝 New access token expires in:', data.expires_in, 'seconds');
  console.log('⚠️  Restart Claude Desktop to use the new token');
}

refreshToken().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
