/**
 * Request-layer tests — rate governor + 429 retry + non-2xx error surfacing.
 * Stubs global.fetch so no network is touched. Imports the built client.
 *
 * Run: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BasecampAPI } from '../build/basecamp-api.js';

const realFetch = global.fetch;

/** Minimal Response stand-in matching what request() reads. */
function fakeRes(status, body, headers = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    statusText: '',
    headers: {
      get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null),
      entries: () => h.entries(),
    },
    json: async () => body,
  };
}

test('non-2xx response surfaces error:true + message (not silent success)', async () => {
  global.fetch = async () => fakeRes(400, { error: 'Invalid status value' });
  try {
    const api = new BasecampAPI('test-token', '999');
    const res = await api.getProjects();
    assert.equal(res.code, 400);
    assert.equal(res.error, true);
    assert.match(res.message, /Invalid status value/);
  } finally {
    global.fetch = realFetch;
  }
});

test('429 Too Many Requests is retried once (honoring Retry-After) then succeeds', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return fakeRes(429, { error: 'rate limited' }, { 'Retry-After': '1' });
    }
    return fakeRes(200, [{ id: 1, name: 'Demo' }]);
  };
  try {
    const api = new BasecampAPI('test-token', '999');
    const res = await api.getProjects();
    assert.equal(calls, 2, 'should retry exactly once after a 429');
    assert.equal(res.code, 200);
    assert.equal(res.error, undefined);
  } finally {
    global.fetch = realFetch;
  }
});

test('getProjects never sends status=active (only archived/trashed are forwarded)', async () => {
  const seen = [];
  global.fetch = async (url) => {
    seen.push(String(url));
    return fakeRes(200, []);
  };
  try {
    const api = new BasecampAPI('test-token', '999');
    await api.getProjects('active');   // caller passes active...
    await api.getProjects();           // ...and the default
    await api.getProjects('archived'); // archived must be forwarded
    assert.ok(!seen[0].includes('status='), `active must be omitted, got: ${seen[0]}`);
    assert.ok(!seen[1].includes('status='), `default must omit status, got: ${seen[1]}`);
    assert.ok(seen[2].includes('status=archived'), `archived must be sent, got: ${seen[2]}`);
  } finally {
    global.fetch = realFetch;
  }
});
