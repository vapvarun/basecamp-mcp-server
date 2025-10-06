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

          // Todo Sets & Todo Lists
          case 'basecamp_get_todoset':
            return await this.getTodoSet(toolArgs.project_id);
          case 'basecamp_list_todolists':
            return await this.listTodoLists(toolArgs.project_id, toolArgs.todoset_id, toolArgs.status);
          case 'basecamp_get_todolist':
            return await this.getTodoList(toolArgs.project_id, toolArgs.todolist_id);
          case 'basecamp_create_todolist':
            return await this.createTodoList(toolArgs.project_id, toolArgs.todoset_id, toolArgs.name, toolArgs.description);
          case 'basecamp_update_todolist':
            return await this.updateTodoList(toolArgs.project_id, toolArgs.todolist_id, toolArgs.name, toolArgs.description);

          // Todos (Traditional Tasks)
          case 'basecamp_list_todos':
            return await this.listTodos(toolArgs.project_id, toolArgs.todolist_id, toolArgs.status, toolArgs.completed);
          case 'basecamp_update_todo':
            return await this.updateTodo(toolArgs);

          // Messages & Message Boards
          case 'basecamp_list_messages':
            return await this.listMessages(toolArgs.project_id, toolArgs.message_board_id);
          case 'basecamp_get_message':
            return await this.getMessage(toolArgs.project_id, toolArgs.message_id);
          case 'basecamp_create_message':
            return await this.createMessage(toolArgs.project_id, toolArgs.message_board_id, toolArgs.subject, toolArgs.content);
          case 'basecamp_update_message':
            return await this.updateMessage(toolArgs.project_id, toolArgs.message_id, toolArgs.subject, toolArgs.content);

          // Documents & Vaults
          case 'basecamp_list_documents':
            return await this.listDocuments(toolArgs.project_id, toolArgs.vault_id);
          case 'basecamp_get_document':
            return await this.getDocument(toolArgs.project_id, toolArgs.document_id);
          case 'basecamp_create_document':
            return await this.createDocument(toolArgs.project_id, toolArgs.vault_id, toolArgs.title, toolArgs.content);
          case 'basecamp_update_document':
            return await this.updateDocument(toolArgs.project_id, toolArgs.document_id, toolArgs.title, toolArgs.content);

          // Schedules & Events
          case 'basecamp_list_schedule_entries':
            return await this.listScheduleEntries(toolArgs.project_id, toolArgs.schedule_id, toolArgs.status, toolArgs.start_date, toolArgs.end_date);
          case 'basecamp_get_schedule_entry':
            return await this.getScheduleEntry(toolArgs.project_id, toolArgs.entry_id);
          case 'basecamp_create_schedule_entry':
            return await this.createScheduleEntry(toolArgs);
          case 'basecamp_update_schedule_entry':
            return await this.updateScheduleEntry(toolArgs);

          // Campfires (Chats)
          case 'basecamp_list_campfires':
            return await this.listCampfires();
          case 'basecamp_get_campfire':
            return await this.getCampfire(toolArgs.project_id, toolArgs.campfire_id);
          case 'basecamp_list_campfire_lines':
            return await this.listCampfireLines(toolArgs.project_id, toolArgs.campfire_id);
          case 'basecamp_create_campfire_line':
            return await this.createCampfireLine(toolArgs.project_id, toolArgs.campfire_id, toolArgs.content);

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
      {
        due_on: args.due_on,
        starts_on: args.starts_on,
        description: args.description,
        assignee_ids: args.assignee_ids,
        completion_subscriber_ids: args.completion_subscriber_ids,
        notify: args.notify
      }
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

  /* ===========================
   * TODO SETS & TODO LISTS HANDLERS
   * =========================== */

  private async getTodoSet(projectId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getTodoSet(projectId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listTodoLists(projectId: string, todosetId: string, status?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getTodoLists(projectId, todosetId, status);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTodoList(projectId: string, todolistId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getTodoList(projectId, todolistId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createTodoList(projectId: string, todosetId: string, name: string, description?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.createTodoList(projectId, todosetId, name, description || '');
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateTodoList(projectId: string, todolistId: string, name?: string, description?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.updateTodoList(projectId, todolistId, name, description);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  /* ===========================
   * TODOS HANDLERS
   * =========================== */

  private async listTodos(projectId: string, todolistId: string, status?: string, completed?: boolean): Promise<CallToolResult> {
    const response = await this.basecampApi.getTodos(projectId, todolistId, status, completed);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateTodo(args: any): Promise<CallToolResult> {
    const { project_id, todo_id, ...updates } = args;
    const response = await this.basecampApi.updateTodo(project_id, todo_id, updates);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  /* ===========================
   * MESSAGES & MESSAGE BOARDS HANDLERS
   * =========================== */

  private async listMessages(projectId: string, messageBoardId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getMessages(projectId, messageBoardId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getMessage(projectId: string, messageId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getMessage(projectId, messageId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createMessage(projectId: string, messageBoardId: string, subject: string, content: string): Promise<CallToolResult> {
    const response = await this.basecampApi.createMessage(projectId, messageBoardId, subject, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateMessage(projectId: string, messageId: string, subject?: string, content?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.updateMessage(projectId, messageId, subject, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  /* ===========================
   * DOCUMENTS & VAULTS HANDLERS
   * =========================== */

  private async listDocuments(projectId: string, vaultId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getDocuments(projectId, vaultId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getDocument(projectId: string, documentId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getDocument(projectId, documentId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createDocument(projectId: string, vaultId: string, title: string, content: string): Promise<CallToolResult> {
    const response = await this.basecampApi.createDocument(projectId, vaultId, title, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateDocument(projectId: string, documentId: string, title?: string, content?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.updateDocument(projectId, documentId, title, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  /* ===========================
   * SCHEDULES & EVENTS HANDLERS
   * =========================== */

  private async listScheduleEntries(projectId: string, scheduleId: string, status?: string, startDate?: string, endDate?: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getScheduleEntries(projectId, scheduleId, status, startDate, endDate);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getScheduleEntry(projectId: string, entryId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getScheduleEntry(projectId, entryId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createScheduleEntry(args: any): Promise<CallToolResult> {
    const { project_id, schedule_id, summary, starts_at, ends_at, description, participant_ids, all_day, notify } = args;
    const response = await this.basecampApi.createScheduleEntry(
      project_id,
      schedule_id,
      summary,
      starts_at,
      ends_at,
      { description, participant_ids, all_day, notify }
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateScheduleEntry(args: any): Promise<CallToolResult> {
    const { project_id, entry_id, ...updates } = args;
    const response = await this.basecampApi.updateScheduleEntry(project_id, entry_id, updates);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  /* ===========================
   * CAMPFIRES (CHATS) HANDLERS
   * =========================== */

  private async listCampfires(): Promise<CallToolResult> {
    const response = await this.basecampApi.getCampfires();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getCampfire(projectId: string, campfireId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getCampfire(projectId, campfireId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listCampfireLines(projectId: string, campfireId: string): Promise<CallToolResult> {
    const response = await this.basecampApi.getCampfireLines(projectId, campfireId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createCampfireLine(projectId: string, campfireId: string, content: string): Promise<CallToolResult> {
    const response = await this.basecampApi.createCampfireLine(projectId, campfireId, content);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
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
