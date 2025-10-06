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

  async updateProject(projectId: string, name?: string, description?: string) {
    const data: any = {};
    if (name) data.name = name;
    if (description) data.description = description;
    return this.put(`/${this.accountId}/projects/${projectId}.json`, data);
  }

  async trashProject(projectId: string) {
    return this.delete(`/${this.accountId}/projects/${projectId}.json`);
  }

  /* ===========================
   * CARD TABLES
   * =========================== */

  async getCardTables(projectId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables.json`);
  }

  async getCardTable(projectId: string, cardTableId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}.json`);
  }

  /* ===========================
   * CARD TABLE COLUMNS
   * =========================== */

  async getColumns(projectId: string, cardTableId: string, page = 1) {
    return this.get(
      `/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}/columns.json`,
      { page: page.toString() }
    );
  }

  async getColumn(projectId: string, columnId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}.json`);
  }

  async createColumn(projectId: string, cardTableId: string, title: string, color?: string) {
    const data: any = { title };
    if (color) data.color = color;
    return this.post(`/${this.accountId}/buckets/${projectId}/card_tables/${cardTableId}/columns.json`, data);
  }

  async updateColumn(projectId: string, columnId: string, title?: string, color?: string) {
    const data: any = {};
    if (title) data.title = title;
    if (color) data.color = color;
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}.json`, data);
  }

  /* ===========================
   * CARD TABLE CARDS
   * =========================== */

  async getCards(projectId: string, columnId: string, page = 1) {
    return this.get(
      `/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}/cards.json`,
      { page: page.toString() }
    );
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
      `/${this.accountId}/buckets/${projectId}/card_tables/columns/${columnId}/cards.json`,
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
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}/steps.json`);
  }

  async getStep(projectId: string, stepId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/card_tables/steps/${stepId}.json`);
  }

  async createStep(projectId: string, cardId: string, title: string) {
    return this.post(
      `/${this.accountId}/buckets/${projectId}/card_tables/cards/${cardId}/steps.json`,
      { title }
    );
  }

  async updateStep(projectId: string, stepId: string, title?: string, completed?: boolean) {
    const data: any = {};
    if (title) data.title = title;
    if (completed !== undefined) data.completed = completed;
    return this.put(`/${this.accountId}/buckets/${projectId}/card_tables/steps/${stepId}.json`, data);
  }

  async completeStep(projectId: string, stepId: string) {
    return this.updateStep(projectId, stepId, undefined, true);
  }

  async uncompleteStep(projectId: string, stepId: string) {
    return this.updateStep(projectId, stepId, undefined, false);
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
   * TODOS & TODO LISTS
   * =========================== */

  async getTodoLists(projectId: string, status?: string, page = 1) {
    const query: Record<string, string> = { page: page.toString() };
    if (status) query.status = status;
    return this.get(`/${this.accountId}/buckets/${projectId}/todosets/todos.json`, query);
  }

  async getTodo(projectId: string, todoId: string) {
    return this.get(`/${this.accountId}/buckets/${projectId}/todos/${todoId}.json`);
  }

  async createTodo(
    projectId: string,
    todolistId: string,
    content: string,
    dueOn?: string,
    assigneeIds: number[] = []
  ) {
    const data: any = { content };
    if (dueOn) data.due_on = dueOn;
    if (assigneeIds.length > 0) data.assignee_ids = assigneeIds;

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
