/**
 * Basecamp Index Manager
 * Caches project and column structure for fast lookups
 *
 * @author Varun Dubey (vapvarun)
 * @company Wbcom Designs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BasecampAPI } from './basecamp-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CardTable {
  id: string;
  title: string;
  columns: Column[];
}

export interface Column {
  id: string;
  title: string;
  position: number;
}

export interface ProjectIndex {
  id: string;
  name: string;
  status: string;
  cardTables: CardTable[];
  lastUpdated: string;
}

export interface BasecampIndex {
  version: string;
  lastFullUpdate: string;
  projects: ProjectIndex[];
}

export class IndexManager {
  private api: BasecampAPI;
  private indexPath: string;
  private index: BasecampIndex | null = null;

  constructor(api: BasecampAPI, indexPath?: string) {
    this.api = api;
    this.indexPath = indexPath || path.join(__dirname, '..', 'index-cache.json');
  }

  /**
   * Load index from disk
   */
  async loadIndex(): Promise<BasecampIndex> {
    if (this.index) {
      return this.index;
    }

    try {
      const data = await fs.readFile(this.indexPath, 'utf8');
      const parsedIndex: BasecampIndex = JSON.parse(data);
      this.index = parsedIndex;
      return parsedIndex;
    } catch (error) {
      // Index doesn't exist yet
      const newIndex: BasecampIndex = {
        version: '1.0.0',
        lastFullUpdate: new Date().toISOString(),
        projects: []
      };
      this.index = newIndex;
      return newIndex;
    }
  }

  /**
   * Save index to disk
   */
  async saveIndex(): Promise<void> {
    if (!this.index) {
      throw new Error('No index to save');
    }

    await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf8');
  }

  /**
   * Build full index from Basecamp API
   */
  async buildFullIndex(): Promise<BasecampIndex> {
    console.log('🔄 Building full index from Basecamp...');

    const index: BasecampIndex = {
      version: '1.0.0',
      lastFullUpdate: new Date().toISOString(),
      projects: []
    };

    // Fetch all projects with pagination
    let allProjects: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.api.getProjects('active', page);
      const projects = response.data;

      if (!projects || projects.length === 0) {
        hasMore = false;
        break;
      }

      allProjects = allProjects.concat(projects);
      page++;

      // Check if there are more pages (Basecamp returns empty array when done)
      if (projects.length < 100) {
        hasMore = false;
      }
    }

    console.log(`   Found ${allProjects.length} projects`);

    // Index each project's card tables and columns
    for (const project of allProjects) {
      console.log(`   Indexing: ${project.name}...`);

      const projectIndex: ProjectIndex = {
        id: project.id.toString(),
        name: project.name,
        status: project.status,
        cardTables: [],
        lastUpdated: new Date().toISOString()
      };

      // Find card tables in project's dock
      const cardTableItems = project.dock?.filter((item: any) => item.name === 'kanban_board') || [];

      for (const dockItem of cardTableItems) {
        // Extract card table ID from URL
        const match = dockItem.url.match(/card_tables\/(\d+)\.json/);
        if (!match) continue;

        const tableId = match[1];

        try {
          // Fetch card table details to get columns
          const tableResponse = await this.api.getCardTable(project.id, tableId);
          const cardTable = tableResponse.data;

          const columns: Column[] = (cardTable.lists || []).map((col: any, idx: number) => ({
            id: col.id.toString(),
            title: col.title,
            position: idx
          }));

          projectIndex.cardTables.push({
            id: tableId,
            title: dockItem.title || 'Card Table',
            columns
          });

          console.log(`      ✓ ${dockItem.title}: ${columns.length} columns`);
        } catch (error) {
          console.log(`      ✗ Failed to fetch card table ${tableId}`);
        }
      }

      index.projects.push(projectIndex);
    }

    this.index = index;
    await this.saveIndex();

    console.log(`✅ Index built: ${index.projects.length} projects`);
    return index;
  }

  /**
   * Update a single project in the index
   */
  async updateProjectIndex(projectId: string): Promise<ProjectIndex | null> {
    await this.loadIndex();
    if (!this.index) return null;

    try {
      const projectResponse = await this.api.getProject(projectId);
      const project = projectResponse.data;

      const projectIndex: ProjectIndex = {
        id: project.id.toString(),
        name: project.name,
        status: project.status,
        cardTables: [],
        lastUpdated: new Date().toISOString()
      };

      // Find card tables
      const cardTableItems = project.dock?.filter((item: any) => item.name === 'kanban_board') || [];

      for (const dockItem of cardTableItems) {
        const match = dockItem.url.match(/card_tables\/(\d+)\.json/);
        if (!match) continue;

        const tableId = match[1];
        const tableResponse = await this.api.getCardTable(project.id, tableId);
        const cardTable = tableResponse.data;

        const columns: Column[] = (cardTable.lists || []).map((col: any, idx: number) => ({
          id: col.id.toString(),
          title: col.title,
          position: idx
        }));

        projectIndex.cardTables.push({
          id: tableId,
          title: dockItem.title || 'Card Table',
          columns
        });
      }

      // Update or add to index
      const existingIndex = this.index.projects.findIndex(p => p.id === projectId);
      if (existingIndex >= 0) {
        this.index.projects[existingIndex] = projectIndex;
      } else {
        this.index.projects.push(projectIndex);
      }

      await this.saveIndex();
      return projectIndex;
    } catch (error) {
      console.error(`Failed to update project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Search projects by name (fuzzy)
   */
  async searchProjects(query: string): Promise<ProjectIndex[]> {
    await this.loadIndex();
    if (!this.index) return [];

    const lowerQuery = query.toLowerCase();
    return this.index.projects.filter(p =>
      p.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get project by ID from index
   */
  async getProject(projectId: string): Promise<ProjectIndex | null> {
    await this.loadIndex();
    if (!this.index) return null;

    return this.index.projects.find(p => p.id === projectId) || null;
  }

  /**
   * Get column by name in a project
   */
  async findColumn(projectId: string, columnName: string): Promise<Column | null> {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const lowerName = columnName.toLowerCase();

    for (const table of project.cardTables) {
      const column = table.columns.find(c => c.title.toLowerCase().includes(lowerName));
      if (column) return column;
    }

    return null;
  }

  /**
   * Get all columns for a project
   */
  async getProjectColumns(projectId: string): Promise<Column[]> {
    const project = await this.getProject(projectId);
    if (!project) return [];

    return project.cardTables.flatMap(table => table.columns);
  }

  /**
   * Get index stats
   */
  async getStats(): Promise<any> {
    await this.loadIndex();
    if (!this.index) return null;

    const totalProjects = this.index.projects.length;
    const totalCardTables = this.index.projects.reduce((sum, p) => sum + p.cardTables.length, 0);
    const totalColumns = this.index.projects.reduce((sum, p) =>
      sum + p.cardTables.reduce((s, t) => s + t.columns.length, 0), 0
    );

    return {
      version: this.index.version,
      lastFullUpdate: this.index.lastFullUpdate,
      totalProjects,
      totalCardTables,
      totalColumns,
      indexPath: this.indexPath
    };
  }
}
