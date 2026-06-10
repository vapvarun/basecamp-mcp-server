/**
 * Tool-contract tests — lock the canonical argument names for the write tools
 * that have historically been called with the wrong arg names (silent no-op /
 * cryptic "reading 'match'" errors). If someone renames a required arg in
 * tools.ts, this test fails loudly instead of a caller discovering it at runtime.
 *
 * Run: npm test   (imports the built definitions from ../build/tools.js)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tools } from '../build/tools.js';

const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

function required(name) {
  const t = byName[name];
  assert.ok(t, `tool ${name} should be defined`);
  return t.inputSchema?.required ?? [];
}

test('basecamp_move_card requires to_column (not column_id)', () => {
  const req = required('basecamp_move_card');
  assert.ok(req.includes('to_column'), `expected to_column in required, got: ${req.join(', ')}`);
  assert.ok(req.includes('card_id'));
  assert.ok(req.includes('project_id'));
  assert.ok(!req.includes('column_id'), 'column_id must NOT be the required column arg; it is to_column');
});

test('basecamp_comment requires url + comment (not project_id/recording_id/content)', () => {
  const req = required('basecamp_comment');
  assert.ok(req.includes('url'), `expected url in required, got: ${req.join(', ')}`);
  assert.ok(req.includes('comment'), `expected comment in required, got: ${req.join(', ')}`);
});

test('basecamp_comment_with_file requires url + comment + file_path', () => {
  const req = required('basecamp_comment_with_file');
  for (const k of ['url', 'comment', 'file_path']) {
    assert.ok(req.includes(k), `expected ${k} in required, got: ${req.join(', ')}`);
  }
});

test('basecamp_list_projects status enum must NOT offer "active" (Basecamp rejects it)', () => {
  const t = byName['basecamp_list_projects'];
  assert.ok(t, 'basecamp_list_projects should be defined');
  const statusEnum = t.inputSchema?.properties?.status?.enum ?? [];
  assert.ok(!statusEnum.includes('active'), `status enum must omit "active" (default = omit param), got: ${statusEnum.join(', ')}`);
  // archived/trashed remain valid filters.
  assert.ok(statusEnum.includes('archived') && statusEnum.includes('trashed'), `expected archived+trashed, got: ${statusEnum.join(', ')}`);
});
