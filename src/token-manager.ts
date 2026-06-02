/**
 * In-process OAuth token manager for the Basecamp MCP server.
 *
 * Holds the access token and (optionally) the refresh credentials. When refresh
 * creds are present, proactively refreshes the access token shortly before it
 * expires, and reactively on a 401. Replaces the external refresh-token.cjs /
 * sync-token.sh cron + "restart Claude Desktop" step: the server keeps its own
 * token fresh for as long as the (long-lived) refresh token is valid.
 *
 * When no refresh creds are supplied, behavior is identical to before — it just
 * returns the static access token it was constructed with.
 *
 * @author Varun Dubey (vapvarun) <varun@wbcomdesigns.com>
 * @company Wbcom Designs
 * @license GPL-2.0-or-later
 */

import * as fs from 'fs';

const LAUNCHPAD_TOKEN_URL = 'https://launchpad.37signals.com/authorization/token';
/** Refresh this many ms before the token's expires_at. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

export interface TokenManagerOptions {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  /** Optional path to persist the refreshed token across restarts. */
  cachePath?: string;
}

interface TokenCache {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class TokenManager {
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private expiresAt?: number; // epoch ms
  private cachePath?: string;
  private inFlight?: Promise<string>;

  constructor(opts: TokenManagerOptions) {
    this.accessToken = opts.accessToken;
    this.refreshToken = opts.refreshToken;
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.cachePath = opts.cachePath;
    this.expiresAt = TokenManager.decodeExpiry(opts.accessToken);
    this.loadCache();
  }

  /** Whether this manager has everything needed to refresh. */
  canRefresh(): boolean {
    return Boolean(this.refreshToken && this.clientId && this.clientSecret);
  }

  /** Current access token, proactively refreshed if it expires within the skew window. */
  async getToken(): Promise<string> {
    if (this.canRefresh() && this.isExpiringSoon()) {
      try {
        return await this.refresh();
      } catch {
        // Refresh failed (network/credentials) — fall back to the current token
        // so a transient refresh error doesn't hard-fail an otherwise-valid call.
        return this.accessToken;
      }
    }
    return this.accessToken;
  }

  /** Force a refresh (used reactively after a 401). Returns the current token if it can't refresh. */
  async forceRefresh(): Promise<string> {
    if (!this.canRefresh()) return this.accessToken;
    return this.refresh();
  }

  private isExpiringSoon(): boolean {
    if (!this.expiresAt) return false; // unknown expiry -> rely on reactive 401 refresh
    return Date.now() >= this.expiresAt - REFRESH_SKEW_MS;
  }

  private refresh(): Promise<string> {
    // De-dupe concurrent refreshes — many in-flight requests share one refresh.
    if (!this.inFlight) {
      this.inFlight = this.doRefresh().finally(() => {
        this.inFlight = undefined;
      });
    }
    return this.inFlight;
  }

  private async doRefresh(): Promise<string> {
    const res = await fetch(LAUNCHPAD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        type: 'refresh',
        client_id: this.clientId as string,
        client_secret: this.clientSecret as string,
        refresh_token: this.refreshToken as string,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Basecamp token refresh failed: ${res.status} ${text}`.trim());
    }

    const data: any = await res.json();
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.expiresAt =
      typeof data.expires_in === 'number'
        ? Date.now() + data.expires_in * 1000
        : TokenManager.decodeExpiry(this.accessToken);

    this.saveCache();
    return this.accessToken;
  }

  private loadCache(): void {
    if (!this.cachePath) return;
    try {
      if (!fs.existsSync(this.cachePath)) return;
      const cache: TokenCache = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
      // Use the cached token only if it's still valid and fresher than what we have.
      if (cache.accessToken && cache.expiresAt && cache.expiresAt > Date.now()) {
        if (!this.expiresAt || cache.expiresAt > this.expiresAt) {
          this.accessToken = cache.accessToken;
          if (cache.refreshToken) this.refreshToken = cache.refreshToken;
          this.expiresAt = cache.expiresAt;
        }
      }
    } catch {
      // Corrupt/unreadable cache is non-fatal — fall back to the constructor token.
    }
  }

  private saveCache(): void {
    if (!this.cachePath) return;
    try {
      const cache: TokenCache = {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
      };
      fs.writeFileSync(this.cachePath, JSON.stringify(cache), { mode: 0o600 });
    } catch {
      // Persistence is best-effort; in-memory refresh still works without it.
    }
  }

  /**
   * Best-effort decode of the Basecamp token blob's embedded `expires_at`.
   * The token is a base64-encoded blob that contains an ISO timestamp; we read
   * it to drive proactive refresh. Returns undefined if it can't be parsed.
   */
  static decodeExpiry(token: string): number | undefined {
    try {
      const raw = Buffer.from(token, 'base64').toString('latin1');
      const m = raw.match(/expires_at"?:?"?([0-9T:\-]+Z)/);
      if (m) {
        const ts = Date.parse(m[1]);
        return Number.isNaN(ts) ? undefined : ts;
      }
    } catch {
      // not decodable
    }
    return undefined;
  }
}
