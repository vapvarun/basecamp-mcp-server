#!/usr/bin/env node

/**
 * Basecamp CLI — direct read + write interface, sharing the MCP server's
 * BasecampAPI client + IndexManager (identical behaviour). The token has full
 * account permissions and every board shares the same card-table/column
 * structure, so a project ID is the only ref you need — the CLI resolves the
 * card table + columns from it.
 *
 * Commands:
 *   get-cards    <project> <user-name>                     (read)
 *   list-columns <project>                                 (read)
 *   create-card  <project> <column> <title> [htmlBody]     (write)
 *   comment      <cardId> <text>                            (write)
 *   update-card  <projectId> <cardId> <field=value>...      (write)
 *
 * <project> is a numeric project ID (preferred — you already have these in the
 *   product map) or a fuzzy project name.
 * <column>  is a numeric column ID or a fuzzy column title (e.g. "Bugs").
 * Card bodies accept HTML (Basecamp rich text).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BasecampAPI } from './basecamp-api.js';
import { IndexManager, ProjectIndex, Column } from './index-manager.js';
import { loadConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function makeApi(): Promise<BasecampAPI> {
  const config = await loadConfig();
  // Same in-process token refresh the MCP server uses (proactive + on 401),
  // otherwise the CLI would fail on Basecamp's hourly-expiring access token.
  const auth = {
    refreshToken: config.refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    cachePath: path.join(__dirname, '..', '.basecamp-token-cache.json'),
  };
  const api = new BasecampAPI(config.accessToken, config.accountId, 'Basecamp CLI', auth);
  await api.getAccountId();
  return api;
}

/** Resolve <project> (numeric ID preferred, fuzzy name fallback) to a fully
 *  indexed ProjectIndex with cardTables + columns. */
async function resolveProject(api: BasecampAPI, index: IndexManager, ref: string): Promise<ProjectIndex | null> {
  let projectId: string | null = null;
  if (/^\d+$/.test(ref)) {
    projectId = ref;
  } else {
    const lowerQuery = ref.toLowerCase();
    // Use getAllProjects (Link-header pagination) — main's fix for the
    // 400/runaway/IP-block from hand-built page numbers.
    const res = await api.getAllProjects();
    const all: any[] = Array.isArray(res.data) ? res.data : [];
    const match = all.find((p: any) => p.name.toLowerCase().includes(lowerQuery));
    if (match) projectId = match.id.toString();
  }
  if (!projectId) return null;
  return index.updateProjectIndex(projectId);
}

/**
 * Resolve a column reference (id or title) to a single, unambiguous column.
 *
 * The previous version returned the FIRST substring match, which silently picks
 * the wrong column on any board whose titles nest inside one another. On the
 * standard Wbcom board that is not hypothetical:
 *
 *   "Testing"     matches "Ready for Testing" AND "In Testing"
 *   "Development" matches "Ready for Development" AND "In Development"
 *   "Ready"       matches "Ready for Development" AND "Ready for Testing"
 *
 * A card moved to the wrong column still printed a success line naming the
 * column the caller asked for, so the mistake stayed invisible until someone
 * re-read the board. Moving a card is a write to a shared workspace: guessing is
 * worse than failing, because a card silently parked in the wrong column never
 * gets picked up.
 *
 * Order: exact id, then exact title, then a UNIQUE substring. An ambiguous
 * substring returns null (with the candidates printed) instead of choosing one.
 */
function resolveColumn(project: ProjectIndex, columnRef: string): Column | null {
  const ref = String(columnRef).trim();
  const lower = ref.toLowerCase();

  const all: Column[] = [];
  for (const table of project.cardTables) all.push(...table.columns);

  // 1. Exact id. String-compare both sides so a numeric ref still matches an
  //    index that happened to store the id as a number.
  const byId = all.find(c => String(c.id) === ref);
  if (byId) return byId;

  // 2. Exact title (case-insensitive), so a literal "Testing" column can never
  //    be beaten by "Ready for Testing" merely appearing earlier.
  const byExactTitle = all.find(c => c.title.toLowerCase() === lower);
  if (byExactTitle) return byExactTitle;

  // 3. Substring, but only when it identifies exactly one column.
  const partial = all.filter(c => c.title.toLowerCase().includes(lower));
  if (partial.length === 1) return partial[0];

  if (partial.length > 1) {
    console.log(
      `❌ Column "${ref}" is ambiguous — matches: ${partial.map(c => `"${c.title}"`).join(', ')}.\n` +
      `   Use the exact title or the column id.`
    );
  }

  return null;
}

// ---- list-people ----
async function listPeople(filter?: string) {
  const api = await makeApi();
  const peopleResponse = await api.getPeople();
  const people: any[] = peopleResponse.data;
  const lower = (filter || '').toLowerCase();
  const matched = lower
    ? people.filter((p: any) =>
        p.name.toLowerCase().includes(lower) || (p.email_address || '').toLowerCase().includes(lower))
    : people;
  console.log(`\n👥 ${matched.length} people${filter ? ` matching "${filter}"` : ''}\n`);
  for (const p of matched) {
    console.log(`   ${String(p.id).padEnd(10)} ${p.name}  <${p.email_address}>${p.admin ? '  [admin]' : ''}`);
  }
}

// ---- get-cards (unchanged behaviour) ----
async function getAssignedCards(projectQuery: string, userName: string) {
  const api = await makeApi();
  const indexManager = new IndexManager(api);

  console.log(`\n🔍 Searching for project: "${projectQuery}"`);
  console.log(`👤 Looking for cards assigned to: ${userName}\n`);

  const peopleResponse = await api.getPeople();
  const people = peopleResponse.data;
  const lowerName = userName.toLowerCase();
  const user = people.find((p: any) =>
    p.name.toLowerCase().includes(lowerName) || p.email_address.toLowerCase().includes(lowerName)
  );
  if (!user) { console.log(`❌ User "${userName}" not found`); return; }
  console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

  console.log('📦 Searching projects...\n');

  const lowerQuery = projectQuery.toLowerCase();

  // List every project via the Link header (no hand-built page numbers, no
  // status=active), then match client-side. (main's 400/runaway/IP-block fix.)
  const projectsResponse = await api.getAllProjects();
  const allProjects: any[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
  const matchingProjects = allProjects.filter((p: any) =>
    p.name.toLowerCase().includes(lowerQuery)
  );
  const totalChecked = allProjects.length;

  console.log(`   Checked ${totalChecked} projects\n`);
  if (matchingProjects.length === 0) { console.log(`❌ No projects found matching "${projectQuery}"`); return; }

  const projects: ProjectIndex[] = [];
  for (const proj of matchingProjects) {
    const indexed = await indexManager.updateProjectIndex(proj.id.toString());
    if (indexed) projects.push(indexed);
  }
  console.log(`✅ Found ${projects.length} matching project(s):\n`);

  let totalCards = 0;
  for (const project of projects) {
    console.log(`\n📋 Project: ${project.name} (ID: ${project.id})`);
    if (project.cardTables.length === 0) { console.log('   No card tables found'); continue; }
    for (const cardTable of project.cardTables) {
      for (const column of cardTable.columns) {
        const cardsResponse = await api.getCards(project.id, column.id);
        const cards = cardsResponse.data;
        if (!Array.isArray(cards)) continue;
        const userCards = cards.filter((card: any) => card.assignees?.some((a: any) => a.id === user.id));
        if (userCards.length > 0) {
          console.log(`\n   🔹 Column: ${column.title} (${userCards.length} card(s))`);
          userCards.forEach((card: any) => {
            totalCards++;
            console.log(`      • ${card.title}`);
            console.log(`        ID: ${card.id}`);
            console.log(`        URL: ${card.app_url}`);
            if (card.due_on) console.log(`        Due: ${card.due_on}`);
          });
        }
      }
    }
  }
  console.log(`\n✅ Total cards assigned to ${user.name}: ${totalCards}\n`);
}

// ---- list-columns ----
async function listColumns(projectRef: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  console.log(`\n📋 Project: ${project.name} (ID: ${project.id})\n`);
  for (const table of project.cardTables) {
    console.log(`📊 Card Table: ${table.title} (ID: ${table.id})`);
    for (const col of table.columns) {
      console.log(`   • ${col.title}  —  column_id: ${col.id}`);
    }
  }
  console.log('');
}


// ---- column management ----
const STANDARD_COLUMNS = [
  'Triage', 'Not now', 'Scope', 'Suggestions', 'Bugs',
  'Ready for Development', 'In Development', 'Ready for Testing',
  'Verified', 'In Testing', 'Done',
];

async function moveColumn(projectRef: string, columnId: string, position: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const table = project.cardTables[0];
  await api.moveColumn(String(project.id), String(table.id), columnId, String(table.id), Number(position));
  console.log(`✅ moved column ${columnId} to position ${position}`);
}

async function trashColumn(projectRef: string, columnId: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const before = await api.getColumn(String(project.id), columnId);
  const title = before?.data?.title ?? '(unknown)';
  const count = before?.data?.cards_count ?? 0;
  if (count > 0) {
    console.log(`❌ Refusing: column "${title}" still holds ${count} card(s). Move them first.`);
    process.exit(1);
  }
  await api.trashColumn(String(project.id), columnId);
  console.log(`✅ trashed empty column "${title}" (${columnId})`);
}

// Reorder a board's columns to STANDARD_COLUMNS. Dry-run unless --apply.
async function normalizeColumns(projectRef: string, apply: boolean) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const table = project.cardTables[0];
  const cur = table.columns.map((c: any) => ({ id: String(c.id), title: String(c.title) }));
  const desired = STANDARD_COLUMNS.filter(t => cur.some(c => c.title === t));
  const extras = cur.filter(c => !STANDARD_COLUMNS.includes(c.title)).map(c => c.title);

  console.log(`\n📋 ${project.name} (${project.id})`);
  console.log(`   current: ${cur.map(c => c.title).join(' | ')}`);
  console.log(`   target : ${desired.join(' | ')}`);
  if (extras.length) console.log(`   ⚠️  non-standard columns (left in place): ${extras.join(', ')}`);

  const dupes = cur.filter((c, i) => cur.findIndex(x => x.title === c.title) !== i);
  if (dupes.length) console.log(`   ⚠️  duplicate titles: ${dupes.map(d => `${d.title}(${d.id})`).join(', ')}`);

  if (!apply) { console.log('   (dry run - pass --apply to perform moves)\n'); return; }

  // Move each desired column into place, front to back. Basecamp positions are 1-based.
  for (let i = 0; i < desired.length; i++) {
    const title = desired[i];
    const col = cur.find(c => c.title === title);
    if (!col) continue;
    await api.moveColumn(String(project.id), String(table.id), col.id, String(table.id), i + 1);
  }
  // Re-read: a 200 on moves is not proof the order took.
  const after = await resolveProject(api, new IndexManager(api), String(project.id));
  const now = after?.cardTables?.[0]?.columns?.map((c: any) => c.title) ?? [];
  console.log(`   after  : ${now.join(' | ')}`);
  const okOrder = desired.every((t, i) => now.indexOf(t) >= 0) &&
    desired.map(t => now.indexOf(t)).every((v, i, a) => i === 0 || a[i - 1] < v);
  console.log(okOrder ? '   ✅ order normalized\n' : '   ❌ order did NOT take - inspect manually\n');
}

// ---- create-card ----
async function createCard(projectRef: string, columnRef: string, title: string, body: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const column = resolveColumn(project!, columnRef);
  if (!column) {
    console.log(`❌ Column "${columnRef}" not found in ${project!.name}. Available:`);
    project!.cardTables.flatMap(t => t.columns).forEach(c => console.log(`   • ${c.title} (${c.id})`));
    process.exit(1);
  }
  const res = await api.createCard(project!.id, column!.id, title, body || '');
  const card: any = res.data;
  if (res.code >= 200 && res.code < 300) {
    console.log(`✅ Card created in ${project!.name} / ${column!.title}`);
    console.log(`   Title: ${card.title}`);
    console.log(`   ID:    ${card.id}`);
    console.log(`   URL:   ${card.app_url}`);
  } else {
    console.log(`❌ Create failed (HTTP ${res.code}): ${JSON.stringify(card)}`);
    process.exit(1);
  }
}

// ---- comment (bucket-less; only needs cardId) ----
async function addComment(cardId: string, text: string) {
  const api = await makeApi();
  const res = await api.createComment('', cardId, text);
  if (res.code >= 200 && res.code < 300) {
    console.log(`✅ Comment added to card ${cardId} (comment id: ${(res.data as any)?.id ?? '?'})`);
  } else {
    console.log(`❌ Comment failed (HTTP ${res.code}): ${JSON.stringify(res.data)}`);
    process.exit(1);
  }
}

// ---- comment-file (upload an image/file, post it as a comment attachment) ----
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};

async function commentFile(cardId: string, filePath: string, caption: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const api = await makeApi();
  const fileData = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] || 'application/octet-stream';

  // Upload the file to get an attachable_sgid, then embed it in a comment.
  await api.getAccountId();
  const up = await api.uploadAttachment(fileData, fileName, contentType);
  const sgid = (up.data as any)?.attachable_sgid;
  if (up.error || !sgid) {
    console.log(`❌ Upload failed (HTTP ${up.code}): ${up.message || JSON.stringify(up.data)}`);
    process.exit(1);
  }

  const tag = BasecampAPI.createAttachmentTag(sgid, caption || fileName);
  const content = caption ? `<div>${caption}</div>${tag}` : tag;
  const res = await api.createComment('', cardId, content);
  if (res.code >= 200 && res.code < 300) {
    console.log(`✅ File comment added to card ${cardId} (${fileName}, comment id: ${(res.data as any)?.id ?? '?'})`);
  } else {
    console.log(`❌ Comment failed (HTTP ${res.code}): ${JSON.stringify(res.data)}`);
    process.exit(1);
  }
}

// ---- update-card ----
async function updateCard(projectId: string, cardId: string, pairs: string[]) {
  const api = await makeApi();
  const updates: any = {};
  for (const p of pairs) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    const key = p.slice(0, eq);
    let val: any = p.slice(eq + 1);
    if (key === 'assignee_ids') val = val.split(',').map((n: string) => Number(n.trim()));
    if (key === 'completed') val = val === 'true';
    updates[key] = val;
  }
  const res = await api.updateCard(projectId, cardId, updates);
  if (res.code >= 200 && res.code < 300) {
    console.log(`✅ Card ${cardId} updated: ${Object.keys(updates).join(', ')}`);
  } else {
    console.log(`❌ Update failed (HTTP ${res.code}): ${JSON.stringify(res.data)}`);
    process.exit(1);
  }
}

// ---- comments (read a card's comment thread) ----
async function listComments(projectId: string, cardId: string) {
  const api = await makeApi();
  const res = await api.getComments(projectId, cardId);
  const comments: any[] = Array.isArray(res.data) ? res.data : [];
  if (!comments.length) { console.log(`\n(no comments on card ${cardId})\n`); return; }
  console.log(`\n💬 ${comments.length} comment(s) on card ${cardId}\n`);
  for (const c of comments) {
    const who = c.creator?.name ?? 'unknown';
    const when = c.created_at ?? '';
    // Strip HTML tags for a readable terminal view.
    const text = String(c.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`— ${who}  ${when}`);
    console.log(`  ${text}\n`);
  }
}

// ---- move-card (move a card to another column) ----
async function moveCard(projectRef: string, cardId: string, columnRef: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const column = resolveColumn(project!, columnRef);
  if (!column) { console.log(`❌ Column "${columnRef}" not found in ${project!.name}`); process.exit(1); }
  const res = await api.moveCard(project!.id, cardId, column!.id);
  if (res.code >= 200 && res.code < 300) {
    console.log(`✅ Card ${cardId} moved to "${column!.title}" (column ${column!.id})`);
  } else {
    console.log(`❌ Move failed (HTTP ${res.code}): ${JSON.stringify(res.data)}`);
    process.exit(1);
  }
}

// ---- list-cards (dedup: cards in a column) ----
async function listCards(projectRef: string, columnRef: string) {
  const api = await makeApi();
  const index = new IndexManager(api);
  const project = await resolveProject(api, index, projectRef);
  if (!project) { console.log(`❌ Project not found: "${projectRef}"`); process.exit(1); }
  const column = resolveColumn(project!, columnRef);
  if (!column) { console.log(`❌ Column "${columnRef}" not found in ${project!.name}`); process.exit(1); }
  // getAllCards, not getCards: Basecamp pages this endpoint, so the single-page
  // call silently capped every listing. A 77-card column read as exactly 50 with
  // nothing to say it was truncated — a partial backlog that looks complete is
  // worse than an error, because you plan against it.
  const res = await api.getAllCards(project!.id, column!.id);
  const cards: any[] = Array.isArray(res.data) ? res.data : [];
  console.log(`\n📋 ${project!.name} / ${column!.title} — ${cards.length} card(s)\n`);
  for (const c of cards) {
    console.log(`   • ${c.title}`);
    console.log(`     id: ${c.id}  url: ${c.app_url}`);
    if (c.assignees?.length) console.log(`     assignees: ${c.assignees.map((a: any) => a.name).join(', ')}`);
  }
  console.log('');
}

// ---- get-card ----
async function getCard(projectId: string, cardId: string) {
  const api = await makeApi();
  const res = await api.getCard(projectId, cardId);
  const c: any = res.data;
  if (!c) { console.log(`❌ Card ${cardId} not found in project ${projectId}`); process.exit(1); }
  console.log(JSON.stringify({
    id: c.id, title: c.title, url: c.app_url,
    column: c.parent?.title, status: c.status,
    due_on: c.due_on, content: c.content,
    assignees: (c.assignees || []).map((a: any) => a.name),
  }, null, 2));
}

// ---- parse-url (basecamp card URL -> projectId + cardId) ----
function parseUrl(url: string) {
  const m = url.match(/buckets\/(\d+)\/card_tables\/(?:lists\/\d+\/)?cards\/(\d+)/);
  if (!m) { console.log(`❌ Not a recognizable Basecamp card URL: ${url}`); process.exit(1); }
  console.log(JSON.stringify({ projectId: m[1], cardId: m[2] }, null, 2));
}

// ---- find-project (fuzzy name -> ids) ----
async function findProject(query: string) {
  const api = await makeApi();
  const lower = query.toLowerCase();
  const res = await api.getAllProjects();  // main's Link-header pagination
  const all: any[] = Array.isArray(res.data) ? res.data : [];
  const matches = all.filter((p: any) => p.name.toLowerCase().includes(lower));
  if (!matches.length) { console.log(`❌ No projects matching "${query}"`); process.exit(1); }
  matches.forEach((p: any) => console.log(`   ${p.id}  —  ${p.name}`));
}

async function renameProject(projectId: string, newName: string) {
  const api = await makeApi();
  const before = await api.getProject(projectId);
  const oldName = before?.data?.name ?? '(unknown)';
  await api.updateProject(projectId, newName);
  // Re-read: updateProject returning 200 is not proof the name took.
  const after = await api.getProject(projectId);
  const nowName = after?.data?.name ?? '(unknown)';
  if (nowName !== newName) {
    console.log(`❌ Rename did not take. Still "${nowName}" (wanted "${newName}")`);
    process.exit(1);
  }
  console.log(`✅ ${projectId}: "${oldName}" → "${nowName}"`);
}

// ---- dispatch ----
const args = process.argv.slice(2);
const command = args[0];

const USAGE = `
Basecamp CLI (read + write)

  get-cards    <project> <user-name>                  # cards assigned to a user
  list-columns <project>                              # project = id (preferred) or name
  list-cards   <project> <column>                     # cards in a column (dedup)
  get-card     <projectId> <cardId>                   # one card's details (JSON)
  find-project <name>                                 # fuzzy name -> project ids
  parse-url    <basecampCardUrl>                      # url -> {projectId, cardId}
  create-card  <project> <column> <title> [htmlBody]  # column = id or title (e.g. "Bugs")
  comment      <cardId> <text>
  comment-file <cardId> <filePath> [caption]          # upload an image/file + post it as a comment attachment
  update-card  <projectId> <cardId> field=value ...   # fields: title, content, due_on, completed, assignee_ids(csv)
  move-card    <project> <cardId> <column>            # column = id or title (e.g. "Ready for Testing")
  comments     <projectId> <cardId>                   # read a card's comment thread
  rename-project <projectId> <newName>                # rename a project (re-reads to confirm)
  move-column  <project> <columnId> <position>        # reorder one column (1-based)
  trash-column <project> <columnId>                   # trash an EMPTY column (refuses if it holds cards)
  normalize-columns <project> [--apply]               # reorder board to the standard column set (dry-run by default)

Examples:
  node build/cli.js list-columns 43067220
  node build/cli.js list-cards 43067220 "Bugs"
  node build/cli.js create-card 43067220 "Bugs" "[SUPPORT] cover photo reverts" "<p>Repro...</p>"
  node build/cli.js comment 9012345678 "Verified on Docker; root cause in class-foo.php"
  node build/cli.js move-card 46914016 10086766037 "Ready for Testing"
  node build/cli.js rename-project 38827449 "Price Quote for WooCommerce"
`;

(async () => {
  try {
    switch (command) {
      case 'get-cards':
        await getAssignedCards(args[1] || 'todo plugin', args[2] || 'Varun');
        break;
      case 'list-columns':
        if (!args[1]) { console.log(USAGE); process.exit(1); }
        await listColumns(args[1]);
        break;
      case 'list-cards':
        if (args.length < 3) { console.log('Usage: list-cards <project> <column>'); process.exit(1); }
        await listCards(args[1], args[2]);
        break;
      case 'get-card':
        if (args.length < 3) { console.log('Usage: get-card <projectId> <cardId>'); process.exit(1); }
        await getCard(args[1], args[2]);
        break;
      case 'find-project':
        if (!args[1]) { console.log('Usage: find-project <name>'); process.exit(1); }
        await findProject(args[1]);
        break;
      case 'parse-url':
        if (!args[1]) { console.log('Usage: parse-url <basecampCardUrl>'); process.exit(1); }
        parseUrl(args[1]);
        break;
      case 'create-card':
        if (args.length < 4) { console.log('Usage: create-card <project> <column> <title> [htmlBody]'); process.exit(1); }
        await createCard(args[1], args[2], args[3], args[4] || '');
        break;
      case 'comment':
        if (args.length < 3) { console.log('Usage: comment <cardId> <text>'); process.exit(1); }
        await addComment(args[1], args.slice(2).join(' '));
        break;
      case 'comment-file':
        if (args.length < 3) { console.log('Usage: comment-file <cardId> <filePath> [caption]'); process.exit(1); }
        await commentFile(args[1], args[2], args.slice(3).join(' '));
        break;
      case 'update-card':
        if (args.length < 4) { console.log('Usage: update-card <projectId> <cardId> field=value ...'); process.exit(1); }
        await updateCard(args[1], args[2], args.slice(3));
        break;
      case 'move-card':
        if (args.length < 4) { console.log('Usage: move-card <project> <cardId> <column>'); process.exit(1); }
        await moveCard(args[1], args[2], args.slice(3).join(' '));
        break;
      case 'comments':
        if (args.length < 3) { console.log('Usage: comments <projectId> <cardId>'); process.exit(1); }
        await listComments(args[1], args[2]);
        break;
      case 'move-column':
        if (args.length < 4) { console.log('Usage: move-column <project> <columnId> <position>'); process.exit(1); }
        await moveColumn(args[1], args[2], args[3]);
        break;
      case 'trash-column':
        if (args.length < 3) { console.log('Usage: trash-column <project> <columnId>'); process.exit(1); }
        await trashColumn(args[1], args[2]);
        break;
      case 'normalize-columns':
        if (args.length < 2) { console.log('Usage: normalize-columns <project> [--apply]'); process.exit(1); }
        await normalizeColumns(args[1], args.includes('--apply'));
        break;
      case 'rename-project':
        if (args.length < 3) { console.log('Usage: rename-project <projectId> <newName>'); process.exit(1); }
        await renameProject(args[1], args.slice(2).join(' '));
        break;
      case 'list-people':
        await listPeople(args[1]);
        break;
      default:
        console.log(USAGE);
        process.exit(command ? 1 : 0);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
