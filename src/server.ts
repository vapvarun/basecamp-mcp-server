/**
 * Basecamp MCP Server - Main Implementation
 * Handles all tool calls and routes them to the Basecamp API
 *
 * @author Varun Dubey (vapvarun) <varun@wbcomdesigns.com>
 * @company Wbcom Designs
 * @license GPL-2.0-or-later
 * @link https://github.com/vapvarun/basecamp-mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { BasecampAPI } from './basecamp-api.js';
import { tools } from './tools.js';

export class BasecampMCPServer {
  private server: Server;
  private basecampApi: BasecampAPI;

  constructor(accessToken: string, accountId?: string) {
    this.server = new Server(
      {
        name: 'basecamp-automation-suite',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.basecampApi = new BasecampAPI(accessToken, accountId);
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Ensure args is defined
      const toolArgs = (args || {}) as any;

      try {
        switch (name) {
          // Reading & Commenting
          case 'basecamp_read':
            return await this.readCard(toolArgs.url, toolArgs.include_comments, toolArgs.include_images);
          case 'basecamp_comment':
            return await this.postComment(toolArgs.url, toolArgs.comment);

          // Project Management
          case 'basecamp_list_projects':
            return await this.listProjects(toolArgs.status);
          case 'basecamp_get_project':
            return await this.getProject(toolArgs.project_id);
          case 'basecamp_create_project':
            return await this.createProject(toolArgs.name, toolArgs.description);
          case 'basecamp_update_project':
            return await this.updateProject(toolArgs.project_id, toolArgs.name, toolArgs.description);
          case 'basecamp_trash_project':
            return await this.trashProject(toolArgs.project_id);

          // Card Table Operations
          case 'basecamp_list_columns':
            return await this.listColumns(toolArgs.project_id, toolArgs.table_id);
          case 'basecamp_list_cards':
            return await this.listCards(toolArgs.project_id, toolArgs.column_id);
          case 'basecamp_get_card':
            return await this.getCard(toolArgs.project_id, toolArgs.card_id);
          case 'basecamp_create_card':
            return await this.createCard(toolArgs);
          case 'basecamp_update_card':
            return await this.updateCard(toolArgs);
          case 'basecamp_move_card':
            return await this.moveCard(toolArgs.project_id, toolArgs.card_id, toolArgs.to_column, toolArgs.position);
          case 'basecamp_trash_card':
            return await this.trashCard(toolArgs.project_id, toolArgs.card_id);

          // Card Steps
          case 'basecamp_list_steps':
            return await this.listSteps(toolArgs.project_id, toolArgs.card_id);
          case 'basecamp_add_step':
            return await this.addStep(toolArgs.project_id, toolArgs.card_id, toolArgs.title);
          case 'basecamp_complete_step':
            return await this.completeStep(toolArgs.project_id, toolArgs.step_id);
          case 'basecamp_uncomplete_step':
            return await this.uncompleteStep(toolArgs.project_id, toolArgs.step_id);

          // People
          case 'basecamp_list_people':
            return await this.listPeople(toolArgs.project_id);
          case 'basecamp_get_person':
            return await this.getPerson(toolArgs.person_id);

          // Todos
          case 'basecamp_get_todo':
            return await this.getTodo(toolArgs.project_id, toolArgs.todo_id);
          case 'basecamp_create_todo':
            return await this.createTodo(toolArgs);
          case 'basecamp_complete_todo':
            return await this.completeTodo(toolArgs.project_id, toolArgs.todo_id);
          case 'basecamp_uncomplete_todo':
            return await this.uncompleteTodo(toolArgs.project_id, toolArgs.todo_id);

          // Events
          case 'basecamp_get_events':
            return await this.getEvents(toolArgs.project_id, toolArgs.limit);

          // Search & Utility
          case 'basecamp_find_project':
            return await this.findProject(toolArgs.search_term);
          case 'basecamp_parse_url':
            return await this.parseUrl(toolArgs.url);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /* ===========================
   * TOOL HANDLERS
   * =========================== */

  private async readCard(url: string, includeComments = true, includeImages = true): Promise<CallToolResult> {
    const parsed = BasecampAPI.parseUrl(url);
    if (!parsed) {
      throw new Error('Invalid Basecamp URL');
    }

    // Ensure account ID is set
    if (!this.basecampApi['accountId']) {
      await this.basecampApi.getAccountId();
    }

    let result: any = {};

    // Determine if it's a card or todo
    if (parsed.type === 'card') {
      const cardResponse = await this.basecampApi.getCard(parsed.projectId, parsed.recordingId!);
      result.card = cardResponse.data;
    } else if (parsed.type === 'todo') {
      const todoResponse = await this.basecampApi.getTodo(parsed.projectId, parsed.recordingId!);
      result.todo = todoResponse.data;
    }

    // Fetch comments if requested
    if (includeComments && parsed.recordingId) {
      const commentsResponse = await this.basecampApi.getComments(parsed.projectId, parsed.recordingId);
      result.comments = commentsResponse.data;

      // Extract images if requested
      if (includeImages && Array.isArray(result.comments)) {
        result.images = this.extractImagesFromComments(result.comments);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private extractImagesFromComments(comments: any[]): string[] {
    const images: string[] = [];
    for (const comment of comments) {
      if (comment.content) {
        // Extract bc-attachment tags with images
        const attachmentRegex = /<bc-attachment([^>]*)>/gi;
        const matches = comment.content.matchAll(attachmentRegex);

        for (const match of matches) {
          const attrs = match[1];
          const hrefMatch = attrs.match(/href="([^"]+)"/);
          const typeMatch = attrs.match(/content-type="([^"]+)"/);

          if (hrefMatch && typeMatch && typeMatch[1].startsWith('image/')) {
            images.push(hrefMatch[1]);
          }
        }
      }
    }
    return images;
  }

  private async postComment(url: string, comment: string): Promise<CallToolResult> {
    const parsed = BasecampAPI.parseUrl(url);
    if (!parsed || !parsed.recordingId) {
      throw new Error('Invalid Basecamp URL');
    }

    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.createComment(parsed.projectId, parsed.recordingId, comment);

    if (response.code === 201) {
      return {
        content: [
          {
            type: 'text',
            text: 'Comment posted successfully',
          },
        ],
      };
    } else {
      throw new Error(`Failed to post comment: ${response.data?.error || 'Unknown error'}`);
    }
  }

  private async listProjects(status?: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getProjects(status as any);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getProject(projectId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getProject(projectId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createProject(name: string, description = ''): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.createProject(name, description);

    return {
      content: [
        {
          type: 'text',
          text: `Project created: ${response.data?.name} (ID: ${response.data?.id})`,
        },
      ],
    };
  }

  private async updateProject(projectId: string, name?: string, description?: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.updateProject(projectId, name, description);

    return {
      content: [
        {
          type: 'text',
          text: `Project updated successfully`,
        },
      ],
    };
  }

  private async trashProject(projectId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.trashProject(projectId);

    return {
      content: [
        {
          type: 'text',
          text: `Project moved to trash`,
        },
      ],
    };
  }

  private async listColumns(projectId: string, tableId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getColumns(projectId, tableId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listCards(projectId: string, columnId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getCards(projectId, columnId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getCard(projectId: string, cardId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getCard(projectId, cardId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createCard(args: any): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.createCard(
      args.project_id,
      args.column_id,
      args.title,
      args.content || '',
      args.due_on,
      args.assignee_ids || []
    );

    return {
      content: [
        {
          type: 'text',
          text: `Card created: ${response.data?.title} (ID: ${response.data?.id})`,
        },
      ],
    };
  }

  private async updateCard(args: any): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.content) updates.content = args.content;
    if (args.due_on) updates.due_on = args.due_on;
    if (args.assignee_ids) updates.assignee_ids = args.assignee_ids;
    if (args.completed !== undefined) updates.completed = args.completed;

    const response = await this.basecampApi.updateCard(args.project_id, args.card_id, updates);

    return {
      content: [
        {
          type: 'text',
          text: `Card updated successfully`,
        },
      ],
    };
  }

  private async moveCard(projectId: string, cardId: string, toColumn: string, position?: number): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.moveCard(projectId, cardId, toColumn, position);

    return {
      content: [
        {
          type: 'text',
          text: `Card moved to column ${toColumn}`,
        },
      ],
    };
  }

  private async trashCard(projectId: string, cardId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.trashCard(projectId, cardId);

    return {
      content: [
        {
          type: 'text',
          text: `Card moved to trash`,
        },
      ],
    };
  }

  private async listSteps(projectId: string, cardId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getSteps(projectId, cardId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async addStep(projectId: string, cardId: string, title: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.createStep(projectId, cardId, title);

    return {
      content: [
        {
          type: 'text',
          text: `Step added: ${title}`,
        },
      ],
    };
  }

  private async completeStep(projectId: string, stepId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.completeStep(projectId, stepId);

    return {
      content: [
        {
          type: 'text',
          text: `Step marked as completed`,
        },
      ],
    };
  }

  private async uncompleteStep(projectId: string, stepId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.uncompleteStep(projectId, stepId);

    return {
      content: [
        {
          type: 'text',
          text: `Step marked as incomplete`,
        },
      ],
    };
  }

  private async listPeople(projectId?: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = projectId
      ? await this.basecampApi.getProjectPeople(projectId)
      : await this.basecampApi.getPeople();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getPerson(personId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getPerson(personId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTodo(projectId: string, todoId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getTodo(projectId, todoId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createTodo(args: any): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.createTodo(
      args.project_id,
      args.todolist_id,
      args.content,
      args.due_on,
      args.assignee_ids || []
    );

    return {
      content: [
        {
          type: 'text',
          text: `Todo created: ${response.data?.content}`,
        },
      ],
    };
  }

  private async completeTodo(projectId: string, todoId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.completeTodo(projectId, todoId);

    return {
      content: [
        {
          type: 'text',
          text: `Todo marked as completed`,
        },
      ],
    };
  }

  private async uncompleteTodo(projectId: string, todoId: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    await this.basecampApi.uncompleteTodo(projectId, todoId);

    return {
      content: [
        {
          type: 'text',
          text: `Todo marked as incomplete`,
        },
      ],
    };
  }

  private async getEvents(projectId?: string, limit = 20): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = projectId
      ? await this.basecampApi.getProjectEvents(projectId)
      : await this.basecampApi.getEvents();

    // Limit results
    const events = Array.isArray(response.data) ? response.data.slice(0, limit) : response.data;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(events, null, 2),
        },
      ],
    };
  }

  private async findProject(searchTerm: string): Promise<CallToolResult> {
    await this.basecampApi.getAccountId();
    const response = await this.basecampApi.getProjects();

    if (!Array.isArray(response.data)) {
      throw new Error('Failed to fetch projects');
    }

    // Simple fuzzy search
    const lowerSearch = searchTerm.toLowerCase();
    const matches = response.data.filter((project: any) =>
      project.name?.toLowerCase().includes(lowerSearch)
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(matches, null, 2),
        },
      ],
    };
  }

  private async parseUrl(url: string): Promise<CallToolResult> {
    const parsed = BasecampAPI.parseUrl(url);

    if (!parsed) {
      throw new Error('Invalid Basecamp URL');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(parsed, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Basecamp MCP Server running on stdio');
  }
}
