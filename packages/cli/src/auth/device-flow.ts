/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628)
 *
 * Implements the device flow for CLI authentication.
 * The user is directed to a URL to authorize the device,
 * while the CLI polls for the token.
 */

import { TIMEOUTS, URLS } from '../constants';
import { CliError } from '../core/errors';
import type {
	DeviceCodeResponse,
	DeviceFlowError,
	DeviceFlowState,
	TokenResponse,
} from './types';

/**
 * Device flow endpoints
 */
interface DeviceFlowEndpoints {
	deviceAuthorizationEndpoint: string;
	tokenEndpoint: string;
}

/**
 * Get the device flow endpoints for a base URL
 */
function getEndpoints(baseUrl: string): DeviceFlowEndpoints {
	return {
		deviceAuthorizationEndpoint: `${baseUrl}/oauth/device/code`,
		tokenEndpoint: `${baseUrl}/oauth/token`,
	};
}

/**
 * Initiate the device authorization flow
 *
 * Requests a device code and user code from the authorization server.
 */
export async function initiateDeviceFlow(
	baseUrl: string = URLS.CONSENT_IO
): Promise<DeviceCodeResponse> {
	const endpoints = getEndpoints(baseUrl);

	const response = await fetch(endpoints.deviceAuthorizationEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: 'c15t-cli',
			scope: 'instances:read instances:write',
		}),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new CliError('AUTH_FAILED', {
			details: `Device authorization failed: ${response.status} ${text}`,
		});
	}

	const data = (await response.json()) as DeviceCodeResponse;

	// Validate required fields
	if (!data.device_code || !data.user_code || !data.verification_uri) {
		throw new CliError('AUTH_FAILED', {
			details: 'Invalid device code response',
		});
	}

	return data;
}

/**
 * Poll for the token
 *
 * Polls the token endpoint until the user authorizes the device,
 * the request expires, or is denied.
 */
export async function pollForToken(
	baseUrl: string,
	deviceCode: string,
	interval: number = TIMEOUTS.DEVICE_FLOW_POLL_INTERVAL,
	expiresIn: number = TIMEOUTS.DEVICE_FLOW_EXPIRY
): Promise<TokenResponse> {
	const endpoints = getEndpoints(baseUrl);
	const startTime = Date.now();
	const expiryTime = startTime + expiresIn * 1000;
	let currentInterval = interval * 1000; // Convert to ms

	while (Date.now() < expiryTime) {
		// Wait for the interval
		await sleep(currentInterval);

		try {
			const response = await fetch(endpoints.tokenEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
					device_code: deviceCode,
					client_id: 'c15t-cli',
				}),
			});

			if (response.ok) {
				const token = (await response.json()) as TokenResponse;
				return token;
			}

			// Check for known error codes
			const error = (await response.json()) as DeviceFlowError;

			switch (error.error) {
				case 'authorization_pending':
					// User hasn't authorized yet, continue polling
					continue;

				case 'slow_down':
					// Server is asking us to slow down, increase interval
					currentInterval += 5000;
					continue;

				case 'access_denied':
					throw new CliError('DEVICE_FLOW_DENIED', {
						details: error.error_description,
					});

				case 'expired_token':
					throw new CliError('DEVICE_FLOW_TIMEOUT', {
						details: 'The device code has expired',
					});

				default:
					throw new CliError('AUTH_FAILED', {
						details: error.error_description || `Unknown error: ${error.error}`,
					});
			}
		} catch (error) {
			if (error instanceof CliError) {
				throw error;
			}

			// Network error, retry
			continue;
		}
	}

	throw new CliError('DEVICE_FLOW_TIMEOUT');
}

/**
 * Run the complete device flow
 *
 * Returns a state object that can be used to track the flow progress.
 */
export async function runDeviceFlow(
	baseUrl: string = URLS.CONSENT_IO,
	callbacks?: {
		onDeviceCode?: (response: DeviceCodeResponse) => void;
		onPolling?: () => void;
		onSuccess?: (token: TokenResponse) => void;
		onError?: (error: Error) => void;
	}
): Promise<DeviceFlowState> {
	const state: DeviceFlowState = { status: 'pending' };

	try {
		// Step 1: Get device code
		const deviceCode = await initiateDeviceFlow(baseUrl);
		state.deviceCode = deviceCode;
		callbacks?.onDeviceCode?.(deviceCode);

		// Step 2: Poll for token
		state.status = 'polling';
		callbacks?.onPolling?.();

		const token = await pollForToken(
			baseUrl,
			deviceCode.device_code,
			deviceCode.interval,
			deviceCode.expires_in
		);

		state.status = 'success';
		state.token = token;
		callbacks?.onSuccess?.(token);

		return state;
	} catch (error) {
		state.status = 'error';
		state.error = error instanceof Error ? error.message : String(error);
		callbacks?.onError?.(
			error instanceof Error ? error : new Error(String(error))
		);
		return state;
	}
}

/**
 * Format the user code for display (e.g., "ABCD-EFGH")
 */
export function formatUserCode(userCode: string): string {
	// If it's already formatted, return as-is
	if (userCode.includes('-')) {
		return userCode;
	}

	// Split into groups of 4
	const midpoint = Math.ceil(userCode.length / 2);
	return `${userCode.slice(0, midpoint)}-${userCode.slice(midpoint)}`;
}

/**
 * Get the complete verification URL with user code
 */
export function getVerificationUrl(response: DeviceCodeResponse): string {
	if (response.verification_uri_complete) {
		return response.verification_uri_complete;
	}

	// Build the URL with the user code
	const url = new URL(response.verification_uri);
	url.searchParams.set('user_code', response.user_code);
	return url.toString();
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
