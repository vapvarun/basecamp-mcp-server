<?php
/**
 * Plugin Name: Basecamp OAuth Helper
 * Description: One-time OAuth bootstrap for the Basecamp MCP server — authorizes your Basecamp app and captures the access_token + refresh_token + account_id so you can paste them into basecamp-mcp-server/config.json.
 * Version: 1.1.0
 * Author: Wbcom Designs
 *
 * Setup: drop this file into a local WordPress site's wp-content/mu-plugins/
 * directory AND create a sibling oauth-app.json next to it with your OAuth
 * application credentials. See oauth-app.example.json for the shape and
 * oauth/README.md for the full walkthrough.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Basecamp_OAuth_Helper {

	private $client_id;
	private $client_secret;
	private $redirect_uri;
	private $config_error = '';

	public function __construct() {
		$this->load_oauth_app();

		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'wp_ajax_basecamp_callback', array( $this, 'handle_callback' ) );
		add_action( 'wp_ajax_nopriv_basecamp_callback', array( $this, 'handle_callback' ) );
		add_action( 'admin_post_basecamp_start_auth', array( $this, 'start_authorization' ) );
	}

	/**
	 * Load OAuth app credentials from the sibling oauth-app.json file.
	 * Falls back to environment variables so CI / headless setups work.
	 * If neither is available, records the error and renders a notice on
	 * the admin page instead of failing silently.
	 */
	private function load_oauth_app() {
		$candidates = array(
			__DIR__ . '/oauth-app.json',
			dirname( __DIR__ ) . '/oauth/oauth-app.json',
		);

		foreach ( $candidates as $path ) {
			if ( file_exists( $path ) ) {
				$raw = file_get_contents( $path );
				$cfg = json_decode( $raw, true );
				if ( is_array( $cfg ) && ! empty( $cfg['client_id'] ) && ! empty( $cfg['client_secret'] ) && ! empty( $cfg['redirect_uri'] ) ) {
					$this->client_id     = $cfg['client_id'];
					$this->client_secret = $cfg['client_secret'];
					$this->redirect_uri  = $cfg['redirect_uri'];
					return;
				}
				$this->config_error = "Found $path but it is missing client_id, client_secret, or redirect_uri.";
				return;
			}
		}

		$env_id     = getenv( 'BASECAMP_OAUTH_CLIENT_ID' );
		$env_secret = getenv( 'BASECAMP_OAUTH_CLIENT_SECRET' );
		$env_redir  = getenv( 'BASECAMP_OAUTH_REDIRECT_URI' );
		if ( $env_id && $env_secret && $env_redir ) {
			$this->client_id     = $env_id;
			$this->client_secret = $env_secret;
			$this->redirect_uri  = $env_redir;
			return;
		}

		$this->config_error = 'No OAuth app credentials found. Copy oauth/oauth-app.example.json to oauth/oauth-app.json and fill in the values from https://launchpad.37signals.com/integrations.';
	}

	public function add_admin_menu() {
		add_menu_page(
			'Basecamp OAuth',
			'Basecamp OAuth',
			'manage_options',
			'basecamp-oauth',
			array( $this, 'admin_page' ),
			'dashicons-admin-network',
			80
		);
	}

	public function admin_page() {
		$access_token  = get_option( 'basecamp_access_token', '' );
		$refresh_token = get_option( 'basecamp_refresh_token', '' );
		$account_id    = get_option( 'basecamp_account_id', '' );

		?>
		<div class="wrap">
			<h1>Basecamp OAuth Helper</h1>

			<?php if ( ! empty( $this->config_error ) ) : ?>
				<div class="notice notice-error">
					<p><strong>OAuth app not configured.</strong> <?php echo esc_html( $this->config_error ); ?></p>
				</div>
				<?php return; ?>
			<?php endif; ?>

			<?php if ( ! empty( $access_token ) ) : ?>
				<div class="notice notice-success">
					<p><strong>Access token retrieved successfully.</strong></p>
				</div>

				<table class="form-table">
					<tr>
						<th>Access Token:</th>
						<td>
							<input type="text" value="<?php echo esc_attr( $access_token ); ?>" class="regular-text" readonly>
							<button class="button" onclick="navigator.clipboard.writeText('<?php echo esc_js( $access_token ); ?>')">Copy</button>
						</td>
					</tr>
					<tr>
						<th>Refresh Token:</th>
						<td>
							<input type="text" value="<?php echo esc_attr( $refresh_token ); ?>" class="regular-text" readonly>
							<button class="button" onclick="navigator.clipboard.writeText('<?php echo esc_js( $refresh_token ); ?>')">Copy</button>
						</td>
					</tr>
					<?php if ( ! empty( $account_id ) ) : ?>
					<tr>
						<th>Account ID:</th>
						<td>
							<input type="text" value="<?php echo esc_attr( $account_id ); ?>" class="regular-text" readonly>
							<button class="button" onclick="navigator.clipboard.writeText('<?php echo esc_js( $account_id ); ?>')">Copy</button>
						</td>
					</tr>
					<?php endif; ?>
				</table>

				<h2>Paste into basecamp-mcp-server/config.json</h2>
				<pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">{
  "accessToken": "<?php echo esc_attr( $access_token ); ?>",
  "refreshToken": "<?php echo esc_attr( $refresh_token ); ?>",
  "accountId": "<?php echo esc_attr( $account_id ); ?>",
  "clientId": "<?php echo esc_attr( $this->client_id ); ?>",
  "clientSecret": "&lt;see oauth-app.json&gt;"
}</pre>

				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="basecamp_start_auth">
					<?php wp_nonce_field( 'basecamp_auth' ); ?>
					<p>
						<button type="submit" class="button">Re-authenticate</button>
						<button type="button" class="button" onclick="if(confirm('Clear all cached tokens?')) { jQuery.post(ajaxurl, {action: 'basecamp_clear_tokens'}, function() { location.reload(); }); }">Clear tokens</button>
					</p>
				</form>

			<?php else : ?>
				<div class="notice notice-info">
					<p>Click below to authorize with Basecamp. After you approve, tokens will appear here.</p>
				</div>

				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="basecamp_start_auth">
					<?php wp_nonce_field( 'basecamp_auth' ); ?>
					<p>
						<button type="submit" class="button button-primary button-hero">Connect to Basecamp</button>
					</p>
				</form>

				<h3>OAuth app configuration (loaded)</h3>
				<table class="form-table">
					<tr><th>Client ID:</th><td><code><?php echo esc_html( $this->client_id ); ?></code></td></tr>
					<tr><th>Redirect URI:</th><td><code><?php echo esc_html( $this->redirect_uri ); ?></code></td></tr>
				</table>
			<?php endif; ?>
		</div>
		<?php
	}

	public function start_authorization() {
		check_admin_referer( 'basecamp_auth' );
		if ( ! empty( $this->config_error ) ) {
			wp_die( esc_html( $this->config_error ) );
		}

		$auth_url = 'https://launchpad.37signals.com/authorization/new?' . http_build_query( array(
			'type'         => 'web_server',
			'client_id'    => $this->client_id,
			'redirect_uri' => $this->redirect_uri,
		) );

		wp_redirect( $auth_url );
		exit;
	}

	public function handle_callback() {
		if ( ! isset( $_GET['code'] ) ) {
			wp_die( 'No authorization code received from Basecamp.' );
		}
		if ( ! empty( $this->config_error ) ) {
			wp_die( esc_html( $this->config_error ) );
		}

		$code = sanitize_text_field( wp_unslash( $_GET['code'] ) );

		$response = wp_remote_post( 'https://launchpad.37signals.com/authorization/token', array(
			'body' => array(
				'type'          => 'web_server',
				'client_id'     => $this->client_id,
				'client_secret' => $this->client_secret,
				'redirect_uri'  => $this->redirect_uri,
				'code'          => $code,
			),
		) );

		if ( is_wp_error( $response ) ) {
			wp_die( 'Error getting access token: ' . esc_html( $response->get_error_message() ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $body['access_token'] ) ) {
			update_option( 'basecamp_access_token', $body['access_token'] );
			update_option( 'basecamp_refresh_token', $body['refresh_token'] ?? '' );
			update_option( 'basecamp_expires_at', time() + ( $body['expires_in'] ?? 1209600 ) );

			$this->fetch_account_id( $body['access_token'] );

			wp_redirect( admin_url( 'admin.php?page=basecamp-oauth&success=1' ) );
			exit;
		}

		wp_die( 'Failed to get access token. Response: ' . esc_html( wp_json_encode( $body ) ) );
	}

	private function fetch_account_id( $access_token ) {
		$response = wp_remote_get( 'https://launchpad.37signals.com/authorization.json', array(
			'headers' => array( 'Authorization' => 'Bearer ' . $access_token ),
		) );

		if ( ! is_wp_error( $response ) ) {
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			if ( isset( $body['accounts'][0]['id'] ) ) {
				update_option( 'basecamp_account_id', $body['accounts'][0]['id'] );
			}
		}
	}
}

new Basecamp_OAuth_Helper();

add_action( 'wp_ajax_basecamp_clear_tokens', function () {
	delete_option( 'basecamp_access_token' );
	delete_option( 'basecamp_refresh_token' );
	delete_option( 'basecamp_account_id' );
	delete_option( 'basecamp_expires_at' );
	wp_send_json_success();
} );
