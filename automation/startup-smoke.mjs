/**
 * Startup smoke test — spawns the BUILT MCP server and drives the real MCP
 * stdio handshake (initialize -> tools/list -> a read tool call) with a timeout,
 * to prove a fresh start responds and never hangs (no "stuck after start").
 *
 * Run with the same env Claude uses:
 *   BASECAMP_ACCESS_TOKEN=... BASECAMP_ACCOUNT_ID=... [refresh creds] node automation/startup-smoke.mjs
 */
import { spawn } from 'node:child_process';

const TIMEOUT = 15000;
const child = spawn('node', ['build/index.js'], { env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'] });

let buf = '';
let stderr = '';
let pollution = false;
const pending = new Map();

child.stdout.on('data', (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    } catch {
      pollution = true;
      console.error('NON-JSON on stdout (would corrupt MCP stream):', line.slice(0, 120));
    }
  }
});
child.stderr.on('data', (d) => { stderr += d.toString(); });

const send = (o) => child.stdin.write(JSON.stringify(o) + '\n');
const rpc = (id, method, params) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`TIMEOUT waiting for ${method} (id ${id}) — possible stuck state`)), TIMEOUT);
  pending.set(id, (m) => { clearTimeout(t); resolve(m); });
  send({ jsonrpc: '2.0', id, method, params });
});

let pass = true;
const log = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${m}`); if (!ok) pass = false; };

try {
  const init = await rpc(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  log(!!init.result, `initialize responded (server: ${init.result?.serverInfo?.name ?? '?'})`);
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });

  const tools = await rpc(2, 'tools/list', {});
  const count = tools.result?.tools?.length ?? 0;
  log(count > 0, `tools/list -> ${count} tools`);

  // Read tool call through the live server — exercises request() + TokenManager.getToken() in-process.
  const card = await rpc(3, 'tools/call', { name: 'basecamp_get_card', arguments: { project_id: '37478494', card_id: '9948047803' } });
  const text = card.result?.content?.[0]?.text ?? '';
  log(!card.result?.isError && /9948047803|Ready for Testing|Left Panel/.test(text), 'basecamp_get_card via live server returns the card');

  log(!pollution, 'stdout stream is clean JSON-RPC (no pollution)');
  log(/Auto-refresh:/.test(stderr), `startup logged auto-refresh status${/Auto-refresh: . Enabled/.test(stderr) ? ' (Enabled)' : ''}`);

  console.log(`\nSTARTUP-SMOKE: ${pass ? 'ALL PASS' : 'SOME FAILED'}`);
} catch (e) {
  console.error('STARTUP-SMOKE: ERROR —', e.message);
  console.error('--- server stderr (first 800 chars) ---\n' + stderr.slice(0, 800));
  pass = false;
} finally {
  child.kill('SIGTERM');
}

process.exit(pass ? 0 : 2);
