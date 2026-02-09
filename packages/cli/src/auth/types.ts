/**
 * Authentication types
 */

/**
 * Stored configuration in ~/.c15t/config.json
 */
export interface C15tConfig {
	/** OAuth access token */
	accessToken: string;
	/** OAuth refresh token */
	refreshToken?: string;
	/** Token expiration timestamp (unix ms) */
	expiresAt?: number;
	/** Currently selected instance ID */
	selectedInstanceId?: string;
	/** Last login timestamp */
	lastLogin?: number;
	/** User email (for display purposes) */
	email?: string;
}

/**
 * Device code response from the authorization server (RFC 8628)
 */
export interface DeviceCodeResponse {
	/** The device verification code */
	device_code: string;
	/** The end-user verification code */
	user_code: string;
	/** The end-user verification URI */
	verification_uri: string;
	/** Complete verification URI with user code */
	verification_uri_complete?: string;
	/** Lifetime in seconds of the device_code and user_code */
	expires_in: number;
	/** Minimum time in seconds to wait between polling requests */
	interval: number;
}

/**
 * Token response from the authorization server
 */
export interface TokenResponse {
	/** The access token */
	access_token: string;
	/** The token type (usually "Bearer") */
	token_type: string;
	/** Lifetime in seconds of the access token */
	expires_in?: number;
	/** The refresh token */
	refresh_token?: string;
	/** The scope of the access token */
	scope?: string;
}

/**
 * Device flow error response
 */
export interface DeviceFlowError {
	/** Error code */
	error: DeviceFlowErrorCode;
	/** Human-readable error description */
	error_description?: string;
}

/**
 * Device flow error codes (RFC 8628)
 */
export type DeviceFlowErrorCode =
	| 'authorization_pending'
	| 'slow_down'
	| 'access_denied'
	| 'expired_token';

/**
 * Device flow state
 */
export interface DeviceFlowState {
	/** Current state */
	status: 'pending' | 'polling' | 'success' | 'error' | 'cancelled';
	/** Device code response */
	deviceCode?: DeviceCodeResponse;
	/** Token response (on success) */
	token?: TokenResponse;
	/** Error message */
	error?: string;
}

/**
 * Auth state for the CLI
 */
export interface AuthState {
	/** Whether the user is logged in */
	isLoggedIn: boolean;
	/** The stored config */
	config: C15tConfig | null;
	/** Whether the token is expired */
	isExpired: boolean;
}
