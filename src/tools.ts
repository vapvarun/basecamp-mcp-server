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
