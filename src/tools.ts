/**
 * MCP Tools Definitions for Basecamp Pro Automation Suite
 * Maps all WP-CLI commands to MCP tools
 *
 * @author Varun Dubey (vapvarun) <varun@wbcomdesigns.com>
 * @company Wbcom Designs
 * @license GPL-2.0-or-later
 * @link https://github.com/vapvarun/basecamp-mcp-server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  /* ===========================
   * READING & COMMENTING
   * =========================== */
  {
    name: 'basecamp_read',
    description: 'Read a Basecamp card or todo with optional comments and images. Supports any Basecamp URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full Basecamp URL (e.g., https://3.basecamp.com/5798509/buckets/37594834/card_tables/cards/9010883489)'
        },
        include_comments: {
          type: 'boolean',
          description: 'Include comments in the response',
          default: true
        },
        include_images: {
          type: 'boolean',
          description: 'Extract and include image URLs from comments',
          default: true
        }
      },
      required: ['url']
    }
  },
  {
    name: 'basecamp_comment',
    description: 'Post a comment to any Basecamp card or todo',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Basecamp card or todo URL'
        },
        comment: {
          type: 'string',
          description: 'Comment text (supports HTML formatting)'
        }
      },
      required: ['url', 'comment']
    }
  },

  /* ===========================
   * PROJECT MANAGEMENT
   * =========================== */
  {
    name: 'basecamp_list_projects',
    description: 'List all Basecamp projects',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'archived', 'trashed'],
          description: 'Filter projects by status (default: active)'
        }
      }
    }
  },
  {
    name: 'basecamp_get_project',
    description: 'Get detailed information about a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID'
        }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_create_project',
    description: 'Create a new Basecamp project',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name'
        },
        description: {
          type: 'string',
          description: 'Project description'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'basecamp_update_project',
    description: 'Update a project name or description',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_trash_project',
    description: 'Move a project to trash',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' }
      },
      required: ['project_id']
    }
  },

  /* ===========================
   * CARD TABLE OPERATIONS
   * =========================== */
  {
    name: 'basecamp_list_columns',
    description: 'List all columns in a card table',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        table_id: { type: 'string' }
      },
      required: ['project_id', 'table_id']
    }
  },
  {
    name: 'basecamp_list_cards',
    description: 'List all cards in a specific column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        column_id: { type: 'string' }
      },
      required: ['project_id', 'column_id']
    }
  },
  {
    name: 'basecamp_get_card',
    description: 'Get detailed information about a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' }
      },
      required: ['project_id', 'card_id']
    }
  },
  {
    name: 'basecamp_create_card',
    description: 'Create a new card in a specific column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID'
        },
        column_id: {
          type: 'string',
          description: 'Column ID where the card will be created'
        },
        title: {
          type: 'string',
          description: 'Card title'
        },
        content: {
          type: 'string',
          description: 'Card description/content (supports HTML)'
        },
        due_on: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format'
        },
        assignee_ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of person IDs to assign'
        }
      },
      required: ['project_id', 'column_id', 'title']
    }
  },
  {
    name: 'basecamp_update_card',
    description: 'Update an existing card (title, content, assignees, due date, completion)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        due_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
        completed: { type: 'boolean' }
      },
      required: ['project_id', 'card_id']
    }
  },
  {
    name: 'basecamp_move_card',
    description: 'Move a card to a different column (status change)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' },
        to_column: {
          type: 'string',
          description: 'Target column ID'
        },
        position: {
          type: 'number',
          description: 'Position in the target column (1-based, optional)'
        }
      },
      required: ['project_id', 'card_id', 'to_column']
    }
  },
  {
    name: 'basecamp_trash_card',
    description: 'Move a card to trash',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' }
      },
      required: ['project_id', 'card_id']
    }
  },

  /* ===========================
   * CARD STEPS
   * =========================== */
  {
    name: 'basecamp_list_steps',
    description: 'List all steps/checklist items on a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' }
      },
      required: ['project_id', 'card_id']
    }
  },
  {
    name: 'basecamp_add_step',
    description: 'Add a new step to a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        card_id: { type: 'string' },
        title: { type: 'string', description: 'Step description' }
      },
      required: ['project_id', 'card_id', 'title']
    }
  },
  {
    name: 'basecamp_complete_step',
    description: 'Mark a step as completed',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        step_id: { type: 'string' }
      },
      required: ['project_id', 'step_id']
    }
  },
  {
    name: 'basecamp_uncomplete_step',
    description: 'Mark a step as incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        step_id: { type: 'string' }
      },
      required: ['project_id', 'step_id']
    }
  },

  /* ===========================
   * PEOPLE MANAGEMENT
   * =========================== */
  {
    name: 'basecamp_list_people',
    description: 'List all people in the organization',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Filter to people in a specific project'
        }
      }
    }
  },
  {
    name: 'basecamp_get_person',
    description: 'Get details about a specific person',
    inputSchema: {
      type: 'object',
      properties: {
        person_id: { type: 'string' }
      },
      required: ['person_id']
    }
  },

  /* ===========================
   * TODO OPERATIONS
   * =========================== */
  {
    name: 'basecamp_get_todo',
    description: 'Get a specific todo item',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },
  {
    name: 'basecamp_create_todo',
    description: 'Create a new todo item',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todolist_id: { type: 'string' },
        content: { type: 'string' },
        due_on: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } }
      },
      required: ['project_id', 'todolist_id', 'content']
    }
  },
  {
    name: 'basecamp_complete_todo',
    description: 'Mark a todo as completed',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },
  {
    name: 'basecamp_uncomplete_todo',
    description: 'Mark a todo as incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },

  /* ===========================
   * ACTIVITY & EVENTS
   * =========================== */
  {
    name: 'basecamp_get_events',
    description: 'Get recent activity/events for the account or a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Optional: Get events for a specific project'
        },
        limit: {
          type: 'number',
          description: 'Number of events to retrieve (default: 20)'
        }
      }
    }
  },

  /* ===========================
   * SEARCH & FIND
   * =========================== */
  {
    name: 'basecamp_find_project',
    description: 'Find a project by name using fuzzy matching',
    inputSchema: {
      type: 'object',
      properties: {
        search_term: {
          type: 'string',
          description: 'Project name or partial name to search for'
        }
      },
      required: ['search_term']
    }
  },

  /* ===========================
   * TODO SETS & LISTS
   * =========================== */
  {
    name: 'basecamp_get_todoset',
    description: 'Get the To-do Set for a project (contains all todo lists)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_list_todolists',
    description: 'List all to-do lists in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        todoset_id: { type: 'string', description: 'To-do Set ID' },
        status: { type: 'string', description: 'Filter by status: active, archived, or trashed' }
      },
      required: ['project_id', 'todoset_id']
    }
  },
  {
    name: 'basecamp_get_todolist',
    description: 'Get details of a specific to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        todolist_id: { type: 'string', description: 'To-do List ID' }
      },
      required: ['project_id', 'todolist_id']
    }
  },
  {
    name: 'basecamp_create_todolist',
    description: 'Create a new to-do list in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        todoset_id: { type: 'string', description: 'To-do Set ID' },
        name: { type: 'string', description: 'To-do list name' },
        description: { type: 'string', description: 'To-do list description' }
      },
      required: ['project_id', 'todoset_id', 'name']
    }
  },
  {
    name: 'basecamp_update_todolist',
    description: 'Update a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todolist_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['project_id', 'todolist_id']
    }
  },

  /* ===========================
   * TODOS (Traditional Tasks)
   * =========================== */
  {
    name: 'basecamp_list_todos',
    description: 'List all to-dos in a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        todolist_id: { type: 'string', description: 'To-do List ID' },
        status: { type: 'string', description: 'Filter by status: active, archived, or trashed' },
        completed: { type: 'boolean', description: 'Filter by completion status' }
      },
      required: ['project_id', 'todolist_id']
    }
  },
  {
    name: 'basecamp_get_todo',
    description: 'Get details of a specific to-do',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },
  {
    name: 'basecamp_create_todo',
    description: 'Create a new to-do in a to-do list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todolist_id: { type: 'string' },
        content: { type: 'string', description: 'To-do content/title' },
        description: { type: 'string', description: 'Detailed description (HTML)' },
        assignee_ids: { type: 'array', items: { type: 'number' }, description: 'Array of person IDs' },
        due_on: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        starts_on: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        notify: { type: 'boolean', description: 'Notify assignees' }
      },
      required: ['project_id', 'todolist_id', 'content']
    }
  },
  {
    name: 'basecamp_update_todo',
    description: 'Update a to-do',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' },
        content: { type: 'string' },
        description: { type: 'string' },
        assignee_ids: { type: 'array', items: { type: 'number' } },
        due_on: { type: 'string' },
        starts_on: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },
  {
    name: 'basecamp_complete_todo',
    description: 'Mark a to-do as completed',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },
  {
    name: 'basecamp_uncomplete_todo',
    description: 'Mark a to-do as incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        todo_id: { type: 'string' }
      },
      required: ['project_id', 'todo_id']
    }
  },

  /* ===========================
   * MESSAGES & MESSAGE BOARDS
   * =========================== */
  {
    name: 'basecamp_list_messages',
    description: 'List all messages in a message board',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        message_board_id: { type: 'string', description: 'Message Board ID' }
      },
      required: ['project_id', 'message_board_id']
    }
  },
  {
    name: 'basecamp_get_message',
    description: 'Get a specific message with full content',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        message_id: { type: 'string' }
      },
      required: ['project_id', 'message_id']
    }
  },
  {
    name: 'basecamp_create_message',
    description: 'Post a new message/announcement to the message board',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        message_board_id: { type: 'string' },
        subject: { type: 'string', description: 'Message subject/title' },
        content: { type: 'string', description: 'Message content (supports HTML)' }
      },
      required: ['project_id', 'message_board_id', 'subject', 'content']
    }
  },
  {
    name: 'basecamp_update_message',
    description: 'Update an existing message',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        message_id: { type: 'string' },
        subject: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['project_id', 'message_id']
    }
  },

  /* ===========================
   * DOCUMENTS & VAULTS
   * =========================== */
  {
    name: 'basecamp_list_documents',
    description: 'List all documents in a vault (Docs & Files)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        vault_id: { type: 'string', description: 'Vault ID from project dock' }
      },
      required: ['project_id', 'vault_id']
    }
  },
  {
    name: 'basecamp_get_document',
    description: 'Get a specific document with full content',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        document_id: { type: 'string' }
      },
      required: ['project_id', 'document_id']
    }
  },
  {
    name: 'basecamp_create_document',
    description: 'Create a new document in the vault',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        vault_id: { type: 'string' },
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document content (supports HTML)' }
      },
      required: ['project_id', 'vault_id', 'title', 'content']
    }
  },
  {
    name: 'basecamp_update_document',
    description: 'Update an existing document',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        document_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['project_id', 'document_id']
    }
  },

  /* ===========================
   * SCHEDULES & EVENTS
   * =========================== */
  {
    name: 'basecamp_list_schedule_entries',
    description: 'List all schedule entries (calendar events) in a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        schedule_id: { type: 'string', description: 'Schedule ID from project dock' },
        status: { type: 'string', description: 'Filter by status' },
        start_date: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' }
      },
      required: ['project_id', 'schedule_id']
    }
  },
  {
    name: 'basecamp_get_schedule_entry',
    description: 'Get a specific schedule entry/event',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        entry_id: { type: 'string' }
      },
      required: ['project_id', 'entry_id']
    }
  },
  {
    name: 'basecamp_create_schedule_entry',
    description: 'Create a new calendar event in the schedule',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        schedule_id: { type: 'string' },
        summary: { type: 'string', description: 'Event title' },
        starts_at: { type: 'string', description: 'Start date/time (ISO 8601)' },
        ends_at: { type: 'string', description: 'End date/time (ISO 8601)' },
        description: { type: 'string', description: 'Event description' },
        all_day: { type: 'boolean', description: 'All-day event' },
        participant_ids: { type: 'array', items: { type: 'number' }, description: 'Participant person IDs' },
        notify: { type: 'boolean', description: 'Notify participants' }
      },
      required: ['project_id', 'schedule_id', 'summary', 'starts_at']
    }
  },
  {
    name: 'basecamp_update_schedule_entry',
    description: 'Update a schedule entry/event',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        entry_id: { type: 'string' },
        summary: { type: 'string' },
        starts_at: { type: 'string' },
        ends_at: { type: 'string' },
        description: { type: 'string' },
        all_day: { type: 'boolean' },
        participant_ids: { type: 'array', items: { type: 'number' } }
      },
      required: ['project_id', 'entry_id']
    }
  },

  /* ===========================
   * CAMPFIRES (CHATS)
   * =========================== */
  {
    name: 'basecamp_list_campfires',
    description: 'List all Campfires (group chats) visible to the current user',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'basecamp_get_campfire',
    description: 'Get details of a specific Campfire chat',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        campfire_id: { type: 'string' }
      },
      required: ['project_id', 'campfire_id']
    }
  },
  {
    name: 'basecamp_list_campfire_lines',
    description: 'List chat messages/lines in a Campfire',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        campfire_id: { type: 'string' }
      },
      required: ['project_id', 'campfire_id']
    }
  },
  {
    name: 'basecamp_create_campfire_line',
    description: 'Post a new message to a Campfire chat',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        campfire_id: { type: 'string' },
        content: { type: 'string', description: 'Chat message content' }
      },
      required: ['project_id', 'campfire_id', 'content']
    }
  },

  /* ===========================
   * INDEX MANAGEMENT
   * =========================== */
  {
    name: 'basecamp_index_build',
    description: 'Build full index of all projects, card tables, and columns for fast lookups',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'basecamp_index_update_project',
    description: 'Update index for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID to update in index' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_index_search',
    description: 'Search projects by name in the index (fast lookup)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (fuzzy match on project name)' }
      },
      required: ['query']
    }
  },
  {
    name: 'basecamp_index_get_project',
    description: 'Get project details from index (project ID, card tables, columns)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_index_find_column',
    description: 'Find a column by name within a project (fast lookup)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        column_name: { type: 'string', description: 'Column name to search for (fuzzy match)' }
      },
      required: ['project_id', 'column_name']
    }
  },
  {
    name: 'basecamp_index_get_columns',
    description: 'Get all columns for a project from index',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' }
      },
      required: ['project_id']
    }
  },
  {
    name: 'basecamp_index_stats',
    description: 'Get index statistics (total projects, columns, last update time)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  /* ===========================
   * UTILITY
   * =========================== */
  {
    name: 'basecamp_parse_url',
    description: 'Parse a Basecamp URL to extract IDs (account, project, card/todo)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' }
      },
      required: ['url']
    }
  }
];
