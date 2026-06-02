/**
 * Phase 2 OAuth-wave verification — proves in-process token refresh works.
 *
 * Run: BASECAMP_ACCOUNT_ID=... BASECAMP_ACCESS_TOKEN=... BASECAMP_REFRESH_TOKEN=... \
 *      BASECAMP_CLIENT_ID=... BASECAMP_CLIENT_SECRET=... node automation/oauth-verify.mjs
 *
 * Does a REAL refresh against Launchpad (issues a new access token; the old one
 * remains valid until its own expiry, so the running server is unaffected).
 */
import { TokenManager } from '../build/token-manager.js';
import { BasecampAPI } from '../build/basecamp-api.js';
import { createBasecampClient } from '@37signals/basecamp';

const env = process.env;
const accessToken = env.BASECAMP_ACCESS_TOKEN;
const accountId = env.BASECAMP_ACCOUNT_ID;
const refreshToken = env.BASECAMP_REFRESH_TOKEN;
const clientId = env.BASECAMP_CLIENT_ID;
const clientSecret = env.BASECAMP_CLIENT_SECRET;
if (!accessToken || !accountId || !refreshToken || !clientId || !clientSecret) {
  console.error('Missing one of BASECAMP_ACCESS_TOKEN/ACCOUNT_ID/REFRESH_TOKEN/CLIENT_ID/CLIENT_SECRET');
  process.exit(1);
}

let pass = true;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) pass = false; };
const mask = (t) => (t ? `${t.slice(0, 6)}…${t.slice(-4)} (len ${t.length})` : '(none)');

try {
  // 1. decodeExpiry reads the embedded expires_at
  const exp = TokenManager.decodeExpiry(accessToken);
  log(typeof exp === 'number' && exp > Date.now(), `decodeExpiry -> ${exp ? new Date(exp).toISOString() : 'undefined'} (future)`);

  // 2. No-creds manager returns the static token unchanged (back-compat path)
  const plain = new TokenManager({ accessToken });
  log((await plain.getToken()) === accessToken && plain.canRefresh() === false,
      'no-creds TokenManager returns static token, canRefresh=false');

  // 3. Real refresh via Launchpad (no cache file, isolated)
  const tm = new TokenManager({ accessToken, refreshToken, clientId, clientSecret });
  log(tm.canRefresh() === true, 'creds TokenManager canRefresh=true');
  const refreshed = await tm.forceRefresh();
  log(typeof refreshed === 'string' && refreshed.length > 20, `forceRefresh -> new token ${mask(refreshed)}`);

  // 4. The refreshed token actually works against the API
  const probe = createBasecampClient({ accountId, accessToken: refreshed });
  const info = await probe.authorization.getInfo();
  log(!!info?.identity?.id, `refreshed token authenticates as ${info.identity.firstName} ${info.identity.lastName}`);

  // 5. End-to-end: BasecampAPI built WITH auth reads a card (token flows via SDK provider + request())
  const api = new BasecampAPI(accessToken, accountId, 'Basecamp MCP Server', { refreshToken, clientId, clientSecret });
  const card = await api.getCard('37478494', '9948047803');
  log(card?.code === 200 && card?.data?.id === 9948047803, `BasecampAPI.getCard via manager -> #${card?.data?.id} (code ${card?.code})`);

  console.log(`\nOAUTH-WAVE: ${pass ? 'ALL PASS' : 'SOME FAILED'}`);
} catch (err) {
  console.error('OAUTH-WAVE: ERROR');
  console.error(err?.message || err);
  pass = false;
}

process.exit(pass ? 0 : 2);
