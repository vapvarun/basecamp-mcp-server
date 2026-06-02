/**
 * Phase 2 spike — prove the official @37signals/basecamp SDK authenticates with our
 * existing token + account and can read account-scoped card data (bucket-less paths).
 *
 * Run: BASECAMP_ACCOUNT_ID=... BASECAMP_ACCESS_TOKEN=... node automation/sdk-spike.mjs
 * (read-only; does not move or comment).
 */
import { createBasecampClient } from '@37signals/basecamp';

const accountId = process.env.BASECAMP_ACCOUNT_ID;
const accessToken = process.env.BASECAMP_ACCESS_TOKEN;
if (!accountId || !accessToken) {
  console.error('Missing BASECAMP_ACCOUNT_ID / BASECAMP_ACCESS_TOKEN env');
  process.exit(1);
}

const client = createBasecampClient({ accountId, accessToken });

try {
  // 1. Auth round-trip (Launchpad)
  const info = await client.authorization.getInfo();
  const exp = info.expiresAt instanceof Date ? info.expiresAt.toISOString() : String(info.expiresAt);
  console.log(`AUTH OK: ${info.identity.firstName} ${info.identity.lastName} <${info.identity.emailAddress}> | token expires ${exp}`);
  console.log(`accounts: ${info.accounts.map((a) => `${a.id}:${a.name}(${a.product})`).join(', ')}`);

  // 2. Account-scoped card read — proves the bucket-less /card_tables/cards/{id} path
  //    works for OUR data with only accountId + cardId (no projectId).
  const card = await client.cards.get(9948047803);
  console.log(`CARD READ OK: #${card.id} "${card.title}" | column: ${card.parent?.title ?? '(n/a)'}`);

  console.log('SPIKE RESULT: PASS');
} catch (err) {
  console.error('SPIKE RESULT: FAIL');
  console.error(err?.message || err);
  if (err?.code) console.error('code:', err.code);
  process.exit(2);
}
