/**
 * Phase 2 writes-wave verification — exercises the MIGRATED BasecampAPI methods
 * (build/basecamp-api.js: moveCard + createComment, now SDK-backed) end-to-end
 * against a SCRATCH card that this script creates and trashes. No real card is touched.
 *
 * Run: BASECAMP_ACCOUNT_ID=... BASECAMP_ACCESS_TOKEN=... node automation/sdk-writes-verify.mjs
 */
import { createBasecampClient } from '@37signals/basecamp';
import { BasecampAPI } from '../build/basecamp-api.js';

const accountId = process.env.BASECAMP_ACCOUNT_ID;
const accessToken = process.env.BASECAMP_ACCESS_TOKEN;
if (!accountId || !accessToken) {
  console.error('Missing BASECAMP_ACCOUNT_ID / BASECAMP_ACCESS_TOKEN env');
  process.exit(1);
}

const PROJECT = '37478494';            // Reign Theme (moveCard ignores it; passed for signature compat)
const COL_BUGS = 7385503599;           // Bugs
const COL_READY = 7385543856;          // Ready for Testing

const sdk = createBasecampClient({ accountId, accessToken });   // setup/teardown + verification reads
const api = new BasecampAPI(accessToken, accountId);            // the MIGRATED methods under test

let scratchId;
let pass = true;
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) pass = false; };

try {
  // Setup: create a scratch card in Bugs (SDK).
  const card = await sdk.cards.create(COL_BUGS, { title: 'SDK writes-wave test - safe to delete' });
  scratchId = card.id;
  console.log(`(setup) created scratch card #${scratchId} in Bugs`);

  // 1. Migrated moveCard: Bugs -> Ready
  await api.moveCard(PROJECT, String(scratchId), String(COL_READY));
  let cur = await sdk.cards.get(scratchId);
  log(cur.parent?.id === COL_READY, `moveCard -> Ready (column now: ${cur.parent?.id} "${cur.parent?.title}")`);

  // 2. Migrated moveCard: Ready -> Bugs (back)
  await api.moveCard(PROJECT, String(scratchId), String(COL_BUGS));
  cur = await sdk.cards.get(scratchId);
  log(cur.parent?.id === COL_BUGS, `moveCard -> Bugs (column now: ${cur.parent?.id} "${cur.parent?.title}")`);

  // 3. Migrated createComment: returns legacy { code: 201 } shape
  const res = await api.createComment(PROJECT, String(scratchId), 'SDK writes-wave verification comment');
  log(res.code === 201, `createComment returned code ${res.code} (expected 201)`);
  const comments = await sdk.comments.list(scratchId);
  log(comments.length >= 1, `comment visible via list (count: ${comments.length})`);

  // 4. Error path: moving to a bogus column should THROW (not silently succeed)
  let threw = false;
  try { await api.moveCard(PROJECT, String(scratchId), '999999999'); }
  catch { threw = true; }
  log(threw, 'moveCard to bogus column throws (no silent success)');

  console.log(`\nWRITES-WAVE: ${pass ? 'ALL PASS' : 'SOME FAILED'}`);
} catch (err) {
  console.error('WRITES-WAVE: ERROR');
  console.error(err?.message || err);
  pass = false;
} finally {
  if (scratchId) {
    try { await sdk.recordings.trash(scratchId); console.log(`(teardown) trashed scratch card #${scratchId}`); }
    catch (e) { console.error(`(teardown) FAILED to trash #${scratchId}: ${e?.message || e}`); }
  }
}

process.exit(pass ? 0 : 2);
