/**
 * Comprehensive Basecamp API Client for TypeScript
 * Full API coverage based on: https://github.com/basecamp/bc3-api
 *
 * @author Varun Dubey (vapvarun) <varun@wbcomdesigns.com>
 * @company Wbcom Designs
 * @license GPL-2.0-or-later
 * @link https://github.com/vapvarun/basecamp-mcp-server
 */

interface BasecampResponse<T = any> {
  code: number;
  data: T;
  headers: Record<string, string>;
  error?: boolean;
  message?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class BasecampAPI {
  private static readonly API_BASE = 'https://3.basecampapi.com';
  private static readonly OAUTH_BASE = 'https://launchpad.37signals.com';
  private static readonly API_SCOPES = ['public', 'read', 'write', 'delete'];

  private accessToken: string;
  private accountId: string;
  private userAgent: string;

  constructor(accessToken: string, accountId?: string, userAgent = 'Basecamp MCP Server') {
    this.accessToken = accessToken;
    this.accountId = accountId || '';
    this.userAgent = userAgent;
  }

  /* ===========================
   * OAUTH METHODS
   * =========================== */

  static getOAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      type: 'web_server',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: this.API_SCOPES.join(' ')
    });
    return `${this.OAUTH_BASE}/authorization/new?${params}`;
  }

  static async exchangeAuthCode(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<OAuthTokenResponse | null> {
    const response = await fetch(`${this.OAUTH_BASE}/authorization/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        type: 'web_server',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    });

    if (!response.ok) return null;
    return await response.json();
  }

  static async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<OAuthTokenResponse | null> {
    const response = await fetch(`${this.OAUTH_BASE}/authorization/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        type: 'refresh',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) return null;
    return await response.json();
  }

  /* ===========================
   * HTTP REQUEST METHOD
   * =========================== */

  private async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    query?: Record<string, string>
  ): Promise<BasecampResponse<T>> {
    let url = `${BasecampAPI.API_BASE}${endpoint}`;

    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': this.userAgent
    };

    const options: RequestInit = {
      method,
      headers
    };

    if (data) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.json().catch(() => ({}));

      return {
        code: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        code: 0,
        data: {} as T,
        headers: {},
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async get<T = any>(endpoint: string, query?: Record<string, string>): Promise<BasecampResponse<T>> {
    return this.request<T>('GET', endpoint, null, query);
  }

  /**
   * Walk every page of a paginated GET endpoint by following the Link
   * header's rel="next" URL until none is returned. Returns the aggregated
   * array across all pages. The Basecamp API caps each page at 15 rows,
   * so a column with 224 cards needs 15 pages — this helper handles it.
   *
   * @param endpoint  Initial endpoint path (no scheme/host).
   * @param query     Initial query params.
   * @param maxPages  Safety cap (default 200 pages = 3000 rows).
   */
  private async getAll<T = any>(
    endpoint: string,
    query?: Record<string, string>,
    maxPages = 200
  ): Promise<BasecampResponse<T[]>> {
    const first = await this.request<T[]>('GET', endpoint, null, query);
    if (first.error || first.code >= 400) {
      return first as BasecampResponse<T[]>;
    }
    const all: T[] = Array.isArray(first.data) ? [...first.data] : [];
    let nextUrl = this.parseNextLink(first.headers?.link);
    let pagesWalked = 1;

    while (nextUrl && pagesWalked < maxPages) {
      // Basecamp next URLs are absolute — strip the API_BASE prefix so we
      // reuse the request() method's auth + user-agent + error handling.
      const relative = nextUrl.replace(BasecampAPI.API_BASE, '');
      const page = await this.request<T[]>('GET', relative);
      if (page.error || page.code >= 400) break;
      if (Array.isArray(page.data)) all.push(...page.data);
      nextUrl = this.parseNextLink(page.headers?.link);
      pagesWalked += 1;
    }

    return {
      code: first.code,
      data: all,
      headers: first.headers,
    };
  }

  /**
   * Extract the `next` URL from a Link header: `<url>; rel="next", <url>; rel="prev"`.
   */
  private parseNextLink(linkHeader?: string): string | null {
    if (!linkHeader) return null;
    const parts = linkHeader.split(',');
    for (const p of parts) {
      const m = p.match(/<([^>]+)>\s*;\s*rel="next"/);
      if (m) return m[1];
    }
    return null;
  }

  private async post<T = any>(endpoint: string, data?: any): Promise<BasecampResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  private async put<T = any>(endpoint: string, data?: any): Promise<BasecampResponse<T>> {
    return this.request<T>('PUT', endpoint, data);
  }

  private async delete<T = any>(endpoint: string): Promise<BasecampResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  /* ===========================
   * AUTHORIZATION & ACCOUNTS
   * =========================== */

  async getAuthorization() {
    return this.get('/authorization.json');
  }

  async getAccountId(): Promise<string> {
    if (this.accountId) return this.accountId;

    const auth = await this.getAuthorization();
    if (auth.data?.accounts?.[0]?.id) {
      this.accountId = auth.data.accounts[0].id;
    }
    return this.accountId;
  }

  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  /* ===========================
   * PROJECTS
   * =========================== */

  async getProjects(status?: 'active' | 'archived' | 'trashed', page = 1) {
    const query: Record<string, string> = { page: page.toString() };
    if (status) query.status = status;
    return this.get(`/${this.accountId}/projects.json`, query);
  }

  async getProject(projectId: string) {
    return this.get(`/${this.accountId}/projects/${projectId}.json`);
  }

  async createProject(name: string, description = '') {
    return this.post(`/${this.accountId}/projects.json`, { name, description });
  }

  async updateProject(
    projectId: string,
    name?: string,
    description?: string,
    admissions?: 'invite' | 'employee' | 'team',
    scheduleAttributes?: { start_date: string; end_date: string }
  ) {
    const data: any = {};
    if (name) data.name = name;
    if (description) data.description = description;
    if (admissions) data.admissions = admissions;
    if (scheduleAttributes) data.schedule_attributes = scheduleAttributes;
    return this.put(`/${this.accountId}/projects/${projectId}.json`, data);
  }

  async getProjectDock(projectId: string) {
    // Convenience method: fetches a project and returns a clean map of dock tool names → IDs
    const response = await this.get(`/${this.accountId}/projects/${projectId}.json`);
    const dock = response.data?.dock || [];
    const dockMap: Record<string, { id: number; title: string; enabled: boolean; url: string }> = {};
    for (const tool of dock) {
      dockMap[tool.name] = {
        id: tool.id,
        title: tool.title,
        enabled: tool.enabled,
        url: tool.url
      };
    }
    return { ...response, data: dockMap };
  }

  async trashProject(projectId: string) {
    return this.delete(`/${this.accountId}/projects/${projectId}.json`);
  }

  /* ===========================
   * CARD TABLES
   * =========================== */

  async getCardTables(projectId: string) {
    // No dedicated "list card tables" endpoint exists in the Basecamp API.
    // The card table ID comes from the project's dock (kanban_board tool).
    // Get the project and extract the card table from its dock.
    const project = await this.get(`/${this.accountId}/projects/${projectId}.json`);
    const dock = project.data?.dock || [];
    const kanban = dock.find((tool: any) => tool.name === 'kanban_board');
    if (kanban) {
      const cardTable = await this.get(`/${this.accountId}/buckets/${projectId}/card_tables/${kanban.id}.json`);
      return { ...project, data: [cardTable.data] };
    }
    return { ...project, data: [] };
  }

  async getCardTable(projectId: string, cardTableId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}.json`);
  }

  /* ===========================
   * CARD TABLE COLUMNS
   * =========================== */

  async getColumns(projectId: string, cardTableId: string) {
    // Basecamp API has no dedicated "list columns" endpoint.
    // Columns are returned as the `lists` array inside the card table response.
    const response = await this.get(
      `/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}.json`
    );
    return { ...response, data: response.data?.lists || [] };
  }

  async getColumn(projectId: string, columnId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}.json`);
  }

  async createColumn(projectId: string, cardTableId: string, title: string, description?: string) {
    const data: any = { title };
    if (description) data.description = description;
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}/columns.json`, data);
  }

  async updateColumn(projectId: string, columnId: string, title?: string, description?: string) {
    const data: any = {};
    if (title) data.title = title;
    if (description) data.description = description;
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}.json`, data);
  }

  async changeColumnColor(projectId: string, columnId: string, color: string) {
    // Official API: PUT /buckets/{projectId}/card_tables/columns/{columnId}/color.json
    // Available colors: white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}/color.json`, { color });
  }

  async moveColumn(projectId: string, cardTableId: string, sourceId: string, targetId: string, position?: number) {
    // Official API: POST /buckets/{projectId}/card_tables/{cardTableId}/moves.json
    const data: any = { source_id: sourceId, target_id: targetId };
    if (position !== undefined) data.position = position;
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}/moves.json`, data);
  }

  async watchColumn(projectId: string, columnId: string) {
    // Official API: POST /buckets/{projectId}/card_tables/lists/{columnId}/subscription.json
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/lists/${columnId}/subscription.json`);
  }

  async unwatchColumn(projectId: string, columnId: string) {
    // Official API: DELETE /buckets/{projectId}/card_tables/lists/{columnId}/subscription.json
    return this.delete(`/${this.accountId}/buckets/${projectId}/card_tables/lists/${columnId}/subscription.json`);
  }

  async setColumnOnHold(projectId: string, columnId: string) {
    // Official API: POST /buckets/{projectId}/card_tables/columns/{columnId}/on_hold.json
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}/on_hold.json`);
  }

  async removeColumnOnHold(projectId: string, columnId: string) {
    // Official API: DELETE /buckets/{projectId}/card_tables/columns/{columnId}/on_hold.json
    return this.delete(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}/on_hold.json`);
  }

  /* ===========================
   * CARD TABLE CARDS
   * =========================== */

  async getCards(projectId: string, columnId: string, page = 1) {
    return this.get(
      `/${this.accountId}/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      { page: page.toString() }
    );
  }

  /**
   * Fetch every card in a column across all pages. Basecamp caps pages at
   * 15 rows; this walks Link headers until exhausted so a 224-card Done
   * column arrives as one array.
   */
  async getAllCards(projectId: string, columnId: string) {
    return this.getAll(
      `/${this.accountId}/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`
    );
  }

  /**
   * Compact card listing — id + title + url + timestamps + comment count
   * only. Strips description HTML, subscribers, creator metadata and
   * anything else unneeded for iteration. Payload is ~5% of getAllCards
   * which matters when a column has 200+ rows.
   */
  async getCardIds(projectId: string, columnId: string) {
    const response = await this.getAllCards(projectId, columnId);
    if (response.error || !Array.isArray(response.data)) {
      return response;
    }
    const compact = response.data.map((card: any) => ({
      id: card.id,
      title: card.title,
      status: card.status,
      app_url: card.app_url,
      created_at: card.created_at,
      updated_at: card.updated_at,
      comments_count: card.comments_count,
      assignees: Array.isArray(card.assignees)
        ? card.assignees.map((a: any) => a.name).filter(Boolean)
        : [],
      completed: card.completed,
    }));
    return {
      code: response.code,
      data: compact,
      headers: response.headers,
    };
  }

  async getCard(projectId: string, cardId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }

  async createCard(
    projectId: string,
    columnId: string,
    title: string,
    content = '',
    dueOn?: string,
    assigneeIds: number[] = []
  ) {
    const data: any = { title, content };
    if (dueOn) data.due_on = dueOn;
    if (assigneeIds.length > 0) data.assignee_ids = assigneeIds;

    return this.post(
      `/${this.accountId}/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      data
    );
  }

  async updateCard(projectId: string, cardId: string, updates: {
    title?: string;
    content?: string;
    due_on?: string;
    assignee_ids?: number[];
    completed?: boolean;
  }) {
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}.json`, updates);
  }

  async moveCard(projectId: string, cardId: string, columnId: string, position?: number) {
    const data: any = { column_id: columnId };
    if (position !== undefined) data.position = position;
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}/moves.json`, data);
  }

  async trashCard(projectId: string, cardId: string) {
    return this.delete(`/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }

  /* ===========================
   * CARD TABLE STEPS
   * =========================== */

  async getSteps(projectId: string, cardId: string) {
    // No dedicated "list steps" endpoint exists in the Basecamp API.
    // Steps are returned as part of the Get a card response.
    const response = await this.get(
      `/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}.json`
    );
    return { ...response, data: response.data?.steps || [] };
  }

  async getStep(projectId: string, cardId: string, stepId: string) {
    // No dedicated "get step" endpoint exists in the Basecamp API.
    // Extract from the card's steps array.
    const response = await this.getSteps(projectId, cardId);
    const step = (response.data || []).find((s: any) => String(s.id) === String(stepId));
    return { ...response, data: step || null };
  }

  async createStep(projectId: string, cardId: string, title: string, dueOn?: string, assignees?: string) {
    // Official API: POST /buckets/{projectId}/card_tables/cards/{cardId}/steps.json
    // assignees is a comma-separated list of people IDs
    const data: any = { title };
    if (dueOn) data.due_on = dueOn;
    if (assignees) data.assignees = assignees;
    return this.post(
      `/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}/steps.json`,
      data
    );
  }

  async updateStep(projectId: string, stepId: string, title?: string, dueOn?: string, assignees?: string) {
    // Official API: PUT /buckets/{projectId}/card_tables/steps/{stepId}.json
    // Only title, due_on, assignees are valid params. Completion uses a separate endpoint.
    const data: any = {};
    if (title) data.title = title;
    if (dueOn) data.due_on = dueOn;
    if (assignees) data.assignees = assignees;
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/steps/${stepId}.json`, data);
  }

  async repositionStep(projectId: string, cardId: string, stepId: string, position: number) {
    // Official API: POST /buckets/{projectId}/card_tables/cards/{cardId}/positions.json
    return this.post(
      `/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}/positions.json`,
      { source_id: stepId, position }
    );
  }

  async completeStep(projectId: string, stepId: string) {
    // Official API: PUT /buckets/{projectId}/card_tables/steps/{stepId}/completions.json
    return this.put(
      `/${this.accountId}/buckets/${projectId}/card_tables/steps/${stepId}/completions.json`,
      { completion: 'on' }
    );
  }

  async uncompleteStep(projectId: string, stepId: string) {
    // Official API: PUT /buckets/{projectId}/card_tables/steps/{stepId}/completions.json
    return this.put(
      `/${this.accountId}/buckets/${projectId}/card_tables/steps/${stepId}/completions.json`,
      { completion: 'off' }
    );
  }

  /* ===========================
   * COMMENTS
   * =========================== */

  async getComments(projectId: string, recordingId: string, page = 1) {
    return this.get(
      `/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      { page: page.toString() }
    );
  }

  async getComment(projectId: string, commentId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/comments/${commentId}.json`);
  }

  async createComment(projectId: string, recordingId: string, content: string) {
    return this.post(
      `/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/comments.json`,
      { content }
    );
  }

  async updateComment(projectId: string, commentId: string, content: string) {
    return this.put(`/${this.accountId}/buckets/${projectId}/comments/${commentId}.json`, { content });
  }

  async trashComment(projectId: string, commentId: string) {
    return this.delete(`/${this.accountId}/buckets/${projectId}/comments/${commentId}.json`);
  }

  /* ===========================
   * TODOSETS
   * =========================== */

  async getTodoSet(projectId: string, todosetId: string) {
    // Official API: GET /buckets/{projectId}/todosets/{todosetId}.json
    // The todoset ID comes from the project's dock (todoset tool).
    return this.get(`/${this.accountId}/buckets/${projectId}/todosets/${todosetId}.json`);
  }

  /* ===========================
   * TODO LISTS
   * =========================== */

  async getTodoLists(projectId: string, todosetId: string, status?: string, page = 1) {
    const query: Record<string, string> = { page: page.toString() };
    if (status) query.status = status;
    return this.get(`/${this.accountId}/buckets/${projectId}/todosets/${todosetId}/todolists.json`, query);
  }

  async getTodoList(projectId: string, todolistId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/todolists/${todolistId}.json`);
  }

  async createTodoList(projectId: string, todosetId: string, name: string, description = '') {
    return this.post(`/${this.accountId}/buckets/${projectId}/todosets/${todosetId}/todolists.json`, {
      name,
      description
    });
  }

  async updateTodoList(projectId: string, todolistId: string, name?: string, description?: string) {
    const data: any = {};
    if (name) data.name = name;
    if (description) data.description = description;
    return this.put(`/${this.accountId}/buckets/${projectId}/todolists/${todolistId}.json`, data);
  }

  /* ===========================
   * TODOS
   * =========================== */

  async getTodos(projectId: string, todolistId: string, status?: string, completed?: boolean, page = 1) {
    const query: Record<string, string> = { page: page.toString() };
    if (status) query.status = status;
    if (completed !== undefined) query.completed = completed.toString();
    return this.get(`/${this.accountId}/buckets/${projectId}/todolists/${todolistId}/todos.json`, query);
  }

  async getTodo(projectId: string, todoId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/todos/${todoId}.json`);
  }

  async createTodo(
    projectId: string,
    todolistId: string,
    content: string,
    options?: {
      description?: string;
      assignee_ids?: number[];
      completion_subscriber_ids?: number[];
      notify?: boolean;
      due_on?: string;
      starts_on?: string;
    }
  ) {
    const data: any = { content, ...options };
    return this.post(`/${this.accountId}/buckets/${projectId}/todolists/${todolistId}/todos.json`, data);
  }

  async updateTodo(projectId: string, todoId: string, updates: any) {
    return this.put(`/${this.accountId}/buckets/${projectId}/todos/${todoId}.json`, updates);
  }

  async completeTodo(projectId: string, todoId: string) {
    return this.post(`/${this.accountId}/buckets/${projectId}/todos/${todoId}/completion.json`);
  }

  async uncompleteTodo(projectId: string, todoId: string) {
    return this.delete(`/${this.accountId}/buckets/${projectId}/todos/${todoId}/completion.json`);
  }

  async repositionTodo(projectId: string, todoId: string, position: number) {
    return this.put(`/${this.accountId}/buckets/${projectId}/todos/${todoId}/position.json`, { position });
  }

  /* ===========================
   * MESSAGE BOARDS & MESSAGES
   * =========================== */

  async getMessageBoard(projectId: string, messageBoardId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/message_boards/${messageBoardId}.json`);
  }

  async getMessages(projectId: string, messageBoardId: string, page = 1) {
    return this.get(`/${this.accountId}/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`, {
      page: page.toString()
    });
  }

  async getMessage(projectId: string, messageId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/messages/${messageId}.json`);
  }

  async createMessage(
    projectId: string,
    messageBoardId: string,
    subject: string,
    content: string,
    options?: { status?: string; category_id?: string }
  ) {
    return this.post(`/${this.accountId}/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`, {
      subject,
      content,
      ...options
    });
  }

  async updateMessage(projectId: string, messageId: string, subject?: string, content?: string) {
    const data: any = {};
    if (subject) data.subject = subject;
    if (content) data.content = content;
    return this.put(`/${this.accountId}/buckets/${projectId}/messages/${messageId}.json`, data);
  }

  async pinMessage(projectId: string, recordingId: string) {
    return this.post(`/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/pin.json`);
  }

  async unpinMessage(projectId: string, recordingId: string) {
    return this.delete(`/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/pin.json`);
  }

  /* ===========================
   * VAULTS & DOCUMENTS
   * =========================== */

  async getVaults(projectId: string, vaultId: string, page = 1) {
    return this.get(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}/vaults.json`, {
      page: page.toString()
    });
  }

  async getVault(projectId: string, vaultId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}.json`);
  }

  async createVault(projectId: string, parentVaultId: string, title: string) {
    return this.post(`/${this.accountId}/buckets/${projectId}/vaults/${parentVaultId}/vaults.json`, { title });
  }

  async updateVault(projectId: string, vaultId: string, title: string) {
    return this.put(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}.json`, { title });
  }

  async getDocuments(projectId: string, vaultId: string, page = 1) {
    return this.get(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}/documents.json`, {
      page: page.toString()
    });
  }

  async getDocument(projectId: string, documentId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/documents/${documentId}.json`);
  }

  async createDocument(projectId: string, vaultId: string, title: string, content: string, status = 'active') {
    return this.post(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}/documents.json`, {
      title,
      content,
      status
    });
  }

  async updateDocument(projectId: string, documentId: string, title?: string, content?: string) {
    const data: any = {};
    if (title) data.title = title;
    if (content) data.content = content;
    return this.put(`/${this.accountId}/buckets/${projectId}/documents/${documentId}.json`, data);
  }

  /* ===========================
   * UPLOADS (Files in Vaults)
   * =========================== */

  async getUploads(projectId: string, vaultId: string, page = 1) {
    return this.get(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}/uploads.json`, {
      page: page.toString()
    });
  }

  async getUpload(projectId: string, uploadId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/uploads/${uploadId}.json`);
  }

  async createUpload(projectId: string, vaultId: string, attachableSgid: string, description?: string, baseName?: string) {
    const data: any = { attachable_sgid: attachableSgid };
    if (description) data.description = description;
    if (baseName) data.base_name = baseName;
    return this.post(`/${this.accountId}/buckets/${projectId}/vaults/${vaultId}/uploads.json`, data);
  }

  async updateUpload(projectId: string, uploadId: string, description?: string, baseName?: string) {
    const data: any = {};
    if (description) data.description = description;
    if (baseName) data.base_name = baseName;
    return this.put(`/${this.accountId}/buckets/${projectId}/uploads/${uploadId}.json`, data);
  }

  /* ===========================
   * SCHEDULES & SCHEDULE ENTRIES
   * =========================== */

  async getSchedule(projectId: string, scheduleId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/schedules/${scheduleId}.json`);
  }

  async updateSchedule(projectId: string, scheduleId: string, include_due_dates?: boolean) {
    const data: any = {};
    if (include_due_dates !== undefined) data.include_due_dates = include_due_dates;
    return this.put(`/${this.accountId}/buckets/${projectId}/schedules/${scheduleId}.json`, data);
  }

  async getScheduleEntries(projectId: string, scheduleId: string, status?: string, startDate?: string, endDate?: string, page = 1) {
    const query: Record<string, string> = { page: page.toString() };
    if (status) query.status = status;
    if (startDate) query.start_date = startDate;
    if (endDate) query.end_date = endDate;
    return this.get(`/${this.accountId}/buckets/${projectId}/schedules/${scheduleId}/entries.json`, query);
  }

  async getScheduleEntry(projectId: string, entryId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/schedule_entries/${entryId}.json`);
  }

  async createScheduleEntry(
    projectId: string,
    scheduleId: string,
    summary: string,
    startsAt: string,
    endsAt?: string,
    options?: {
      description?: string;
      participant_ids?: number[];
      all_day?: boolean;
      notify?: boolean;
    }
  ) {
    return this.post(`/${this.accountId}/buckets/${projectId}/schedules/${scheduleId}/entries.json`, {
      summary,
      starts_at: startsAt,
      ends_at: endsAt,
      ...options
    });
  }

  async updateScheduleEntry(
    projectId: string,
    entryId: string,
    updates: {
      summary?: string;
      starts_at?: string;
      ends_at?: string;
      description?: string;
      participant_ids?: number[];
      all_day?: boolean;
    }
  ) {
    return this.put(`/${this.accountId}/buckets/${projectId}/schedule_entries/${entryId}.json`, updates);
  }

  /* ===========================
   * CAMPFIRES (CHATS)
   * =========================== */

  async getCampfires() {
    return this.get(`/${this.accountId}/chats.json`);
  }

  async getCampfire(projectId: string, campfireId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/chats/${campfireId}.json`);
  }

  async getCampfireLines(projectId: string, campfireId: string, page = 1) {
    return this.get(`/${this.accountId}/buckets/${projectId}/chats/${campfireId}/lines.json`, {
      page: page.toString()
    });
  }

  async getCampfireLine(projectId: string, lineId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/chat_lines/${lineId}.json`);
  }

  async createCampfireLine(projectId: string, campfireId: string, content: string) {
    return this.post(`/${this.accountId}/buckets/${projectId}/chats/${campfireId}/lines.json`, { content });
  }

  async deleteCampfireLine(projectId: string, campfireId: string, lineId: string) {
    return this.delete(`/${this.accountId}/buckets/${projectId}/chats/${campfireId}/lines/${lineId}.json`);
  }

  /* ===========================
   * PEOPLE
   * =========================== */

  async getPeople(page = 1) {
    return this.get(`/${this.accountId}/people.json`, { page: page.toString() });
  }

  async getProjectPeople(projectId: string, page = 1) {
    return this.get(`/${this.accountId}/projects/${projectId}/people.json`, { page: page.toString() });
  }

  async getPerson(personId: string) {
    return this.get(`/${this.accountId}/people/${personId}.json`);
  }

  async getMyInfo() {
    return this.get(`/${this.accountId}/my/profile.json`);
  }

  async getPingablePeople() {
    return this.get(`/${this.accountId}/circles/people.json`);
  }

  async manageProjectPeople(projectId: string, grant: number[] = [], revoke: number[] = []) {
    const data: any = {};
    if (grant.length > 0) data.grant = grant;
    if (revoke.length > 0) data.revoke = revoke;
    return this.put(`/${this.accountId}/projects/${projectId}/people/users.json`, data);
  }

  /* ===========================
   * RECORDINGS (Generic trash/archive/activate)
   * =========================== */

  async trashRecording(projectId: string, recordingId: string) {
    return this.put(`/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/status/trashed.json`);
  }

  async archiveRecording(projectId: string, recordingId: string) {
    return this.put(`/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/status/archived.json`);
  }

  async activateRecording(projectId: string, recordingId: string) {
    return this.put(`/${this.accountId}/buckets/${projectId}/recordings/${recordingId}/status/active.json`);
  }

  /* ===========================
   * EVENTS (Activity)
   * =========================== */

  async getEvents(page = 1, since?: string) {
    const query: Record<string, string> = { page: page.toString() };
    if (since) query.since = since;
    return this.get(`/${this.accountId}/events.json`, query);
  }

  async getProjectEvents(projectId: string, page = 1, since?: string) {
    const query: Record<string, string> = { page: page.toString() };
    if (since) query.since = since;
    return this.get(`/${this.accountId}/buckets/${projectId}/events.json`, query);
  }

  /* ===========================
   * ATTACHMENTS
   * =========================== */

  /**
   * Upload a file attachment to Basecamp
   * Returns an attachable_sgid that can be used in rich text content
   *
   * @param filePath - Path to the file to upload
   * @param fileName - Name for the uploaded file
   * @param contentType - MIME type of the file (e.g., 'image/png', 'video/mp4')
   */
  async uploadAttachment(fileData: Buffer, fileName: string, contentType: string): Promise<BasecampResponse<{ attachable_sgid: string }>> {
    const url = `${BasecampAPI.API_BASE}/${this.accountId}/attachments.json?name=${encodeURIComponent(fileName)}`;

    try {
      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyData = new Uint8Array(fileData);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent,
          'Content-Type': contentType,
          'Content-Length': fileData.length.toString()
        },
        body: bodyData
      });

      const responseData = await response.json().catch(() => ({}));

      return {
        code: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        code: 0,
        data: { attachable_sgid: '' },
        headers: {},
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper to create bc-attachment HTML tag for rich text
   */
  static createAttachmentTag(sgid: string, caption?: string): string {
    if (caption) {
      return `<bc-attachment sgid="${sgid}" caption="${caption}"></bc-attachment>`;
    }
    return `<bc-attachment sgid="${sgid}"></bc-attachment>`;
  }

  /* ===========================
   * HELPER METHODS
   * =========================== */

  static parseUrl(url: string): { type: string; accountId: string; projectId: string; recordingId?: string } | null {
    const patterns = {
      card: /basecamp\.com\/(\d+)\/buckets\/(\d+)\/card_tables\/cards\/(\d+)/,
      todo: /basecamp\.com\/(\d+)\/buckets\/(\d+)\/todos\/(\d+)/,
      project: /basecamp\.com\/(\d+)\/projects\/(\d+)/,
      column: /basecamp\.com\/(\d+)\/buckets\/(\d+)\/card_tables\/columns\/(\d+)/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const match = url.match(pattern);
      if (match) {
        return {
          type,
          accountId: match[1],
          projectId: match[2],
          recordingId: match[3]
        };
      }
    }

    return null;
  }
}
