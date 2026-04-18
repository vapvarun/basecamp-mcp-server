# OAuth bootstrap — basecamp-mcp-server

The MCP itself is a stdio process and can't complete an interactive
OAuth 2 redirect flow. Use the helper in this folder **once** to mint
your first `access_token` + `refresh_token` + `account_id`, paste them
into `../config.json`, and you're done. After that, `refresh-token.sh`
keeps the access token fresh without any browser round-trips.

## One-time setup

### 1. Register a Basecamp integration

Visit <https://launchpad.37signals.com/integrations>:

- Click **"Register one now"**.
- **Name**: anything (e.g. "Varun MCP").
- **Company**: your org.
- **Type**: Web application.
- **Redirect URI**: a URL on a WordPress site you control locally, e.g.
  `http://your-local-site.local/wp-admin/admin-ajax.php?action=basecamp_callback`.

After submit, copy the `Client ID` + `Client secret` — you need them
next. These are the only two values that ever leave Basecamp's
Launchpad for your machine.

### 2. Drop your credentials in

```
cp oauth/oauth-app.example.json oauth/oauth-app.json
```

Edit `oauth/oauth-app.json` and fill in:

- `client_id` — the 40-char hex string from step 1.
- `client_secret` — the 40-char hex string from step 1.
- `redirect_uri` — the **exact** same URL you put in the integration
  settings (same host, same path, same `action=basecamp_callback`).

`oauth-app.json` is gitignored — it never leaves your machine.

### 3. Install the helper as a mu-plugin on your local WP site

From this folder, symlink (or copy) `helper.php` into your local WP
site's mu-plugins directory:

```
ln -s "$(pwd)/helper.php" /path/to/wordpress/wp-content/mu-plugins/basecamp-oauth.php
# or plain copy:
# cp helper.php /path/to/wordpress/wp-content/mu-plugins/basecamp-oauth.php
```

Also symlink/copy `oauth-app.json` next to it (helper.php looks for it
in the same directory AND in this `oauth/` folder):

```
ln -s "$(pwd)/oauth-app.json" /path/to/wordpress/wp-content/mu-plugins/oauth-app.json
```

### 4. Authorize

- Log into your local WP site's admin.
- Sidebar: **Basecamp OAuth**.
- Click **Connect to Basecamp** → you get bounced to Launchpad →
  approve.
- You land back on the WP admin page with your `access_token`,
  `refresh_token`, and `account_id` displayed.

### 5. Paste into `../config.json`

The helper shows the exact JSON block to paste — copy it into
`basecamp-mcp-server/config.json`. `config.json` is gitignored.

### 6. Delete the mu-plugin link

The helper is a one-time bootstrap. Once the MCP has valid tokens in
`config.json`, remove the mu-plugin so it's not sitting in your WP
install:

```
rm /path/to/wordpress/wp-content/mu-plugins/basecamp-oauth.php
rm /path/to/wordpress/wp-content/mu-plugins/oauth-app.json
```

You only need it again if tokens are fully revoked (not just expired —
`refresh-token.sh` handles expiry).

## Keeping tokens fresh

`access_token` expires every two weeks. `refresh-token.sh` in this
folder uses the `refresh_token` from `config.json` to mint a new one
and writes it back in place:

```
./oauth/refresh-token.sh
```

Wire this to a cron / systemd timer if you want it always-on. Running
it more often than needed is harmless — Basecamp happily mints new
tokens.

## Fallback: env vars instead of a JSON file

If you'd rather not create `oauth-app.json` (e.g. headless CI), set
these three env vars before loading the WP admin page:

```
BASECAMP_OAUTH_CLIENT_ID=...
BASECAMP_OAUTH_CLIENT_SECRET=...
BASECAMP_OAUTH_REDIRECT_URI=http://...
```

The helper prefers the JSON file if both exist.

## Troubleshooting

- **"No OAuth app credentials found"** — helper can't find
  `oauth-app.json` and the env vars aren't set. Re-check step 2.
- **"Found … but it is missing client_id, client_secret, or redirect_uri"**
  — one of the three keys is blank. Open `oauth-app.json` and fill
  every key.
- **Basecamp rejects the redirect** — the `redirect_uri` in your
  `oauth-app.json` must match exactly what's registered on Launchpad
  (same scheme, host, port, path, query). A trailing slash or `http`
  vs `https` difference counts.
- **Token refresh returns 401** — the `refresh_token` has itself
  expired (these last ~2 weeks of inactivity). Re-run steps 3–5 to
  mint a fresh pair.
