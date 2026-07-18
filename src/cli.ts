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

function resolveColumn(project: ProjectIndex, columnRef: string): Column | null {
  const lower = columnRef.toLowerCase();
  for (const table of project.cardTables) {
    const byId = table.columns.find(c => c.id === columnRef);
    if (byId) return byId;
    const byTitle = table.columns.find(c => c.title.toLowerCase().includes(lower));
    if (byTitle) return byTitle;
  }
  return null;
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
  const res = await api.getCards(project!.id, column!.id);
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
  update-card  <projectId> <cardId> field=value ...   # fields: title, content, due_on, completed, assignee_ids(csv)
  move-card    <project> <cardId> <column>            # column = id or title (e.g. "Ready for Testing")
  comments     <projectId> <cardId>                   # read a card's comment thread

Examples:
  node build/cli.js list-columns 43067220
  node build/cli.js list-cards 43067220 "Bugs"
  node build/cli.js create-card 43067220 "Bugs" "[SUPPORT] cover photo reverts" "<p>Repro...</p>"
  node build/cli.js comment 9012345678 "Verified on Docker; root cause in class-foo.php"
  node build/cli.js move-card 46914016 10086766037 "Ready for Testing"
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
      default:
        console.log(USAGE);
        process.exit(command ? 1 : 0);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
