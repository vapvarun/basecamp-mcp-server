#!/usr/bin/env node

/**
 * Basecamp MCP CLI
 * Direct CLI interface to MCP server capabilities
 */

import { BasecampAPI } from './basecamp-api.js';
import { IndexManager } from './index-manager.js';
import { loadConfig } from './config.js';

async function getAssignedCards(projectQuery: string, userName: string) {
  // Load config
  const config = await loadConfig();
  const api = new BasecampAPI(config.accessToken, config.accountId);
  const indexManager = new IndexManager(api);

  console.log(`\n🔍 Searching for project: "${projectQuery}"`);
  console.log(`👤 Looking for cards assigned to: ${userName}\n`);

  // Ensure account ID is fetched
  await api.getAccountId();

  // Get all people to find user ID
  const peopleResponse = await api.getPeople();
  const people = peopleResponse.data;

  const lowerName = userName.toLowerCase();
  const user = people.find((p: any) =>
    p.name.toLowerCase().includes(lowerName) ||
    p.email_address.toLowerCase().includes(lowerName)
  );

  if (!user) {
    console.log(`❌ User "${userName}" not found`);
    return;
  }

  console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

  // Ensure account ID is set
  await api.getAccountId();

  // Search directly via API with pagination until we find matches
  console.log('📦 Searching projects...\n');

  const lowerQuery = projectQuery.toLowerCase();

  // List every project via the Link header (no hand-built page numbers, no
  // status=active), then match client-side.
  const projectsResponse = await api.getAllProjects();
  const allProjects: any[] = Array.isArray( projectsResponse.data ) ? projectsResponse.data : [];
  const matchingProjects = allProjects.filter( ( p: any ) =>
    p.name.toLowerCase().includes( lowerQuery )
  );
  const totalChecked = allProjects.length;

  console.log(`   Checked ${totalChecked} projects\n`);

  if (matchingProjects.length === 0) {
    console.log(`❌ No projects found matching "${projectQuery}"`);
    return;
  }

  // Update index for matching projects only
  let projects = [];
  for (const proj of matchingProjects) {
    const indexed = await indexManager.updateProjectIndex(proj.id.toString());
    if (indexed) projects.push(indexed);
  }

  console.log(`✅ Found ${projects.length} matching project(s):\n`);

  let totalCards = 0;

  for (const project of projects) {
    console.log(`\n📋 Project: ${project.name} (ID: ${project.id})`);

    if (project.cardTables.length === 0) {
      console.log('   No card tables found');
      continue;
    }

    console.log(`   Found ${project.cardTables.length} card table(s)\n`);

    for (const cardTable of project.cardTables) {
      console.log(`   📊 Card Table: ${cardTable.title}`);
      console.log(`      Columns: ${cardTable.columns.length}`);

      // Check each column for assigned cards
      for (const column of cardTable.columns) {
        const cardsResponse = await api.getCards(project.id, column.id);
        const cards = cardsResponse.data;

        if (!Array.isArray(cards)) {
          console.log(`      ⚠️  Column ${column.title}: cards is not an array`);
          continue;
        }

        // Filter cards assigned to user
        const userCards = cards.filter((card: any) =>
          card.assignees?.some((assignee: any) => assignee.id === user.id)
        );

        if (userCards.length > 0) {
          console.log(`\n      🔹 Column: ${column.title} (${userCards.length} card(s))`);

          userCards.forEach((card: any) => {
            totalCards++;
            console.log(`         • ${card.title}`);
            console.log(`           ID: ${card.id}`);
            console.log(`           URL: ${card.app_url}`);
            if (card.due_on) {
              console.log(`           Due: ${card.due_on}`);
            }
            if (card.assignees && card.assignees.length > 1) {
              const assigneeNames = card.assignees.map((a: any) => a.name).join(', ');
              console.log(`           Assignees: ${assigneeNames}`);
            }
            console.log('');
          });
        }
      }
    }
  }

  console.log(`\n✅ Total cards assigned to ${user.name}: ${totalCards}\n`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
Basecamp MCP CLI

Usage:
  node cli.js get-cards <project-search> <user-name>

Examples:
  node cli.js get-cards "todo plugin" "Varun"
  node cli.js get-cards "BuddyPress" "John"
`);
  process.exit(0);
}

if (command === 'get-cards') {
  const projectQuery = args[1] || 'todo plugin';
  const userName = args[2] || 'Varun';

  getAssignedCards(projectQuery, userName).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
} else {
  console.log(`❌ Unknown command: ${command}`);
  process.exit(1);
}
