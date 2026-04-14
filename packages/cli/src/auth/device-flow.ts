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
	deviceCodeV1Endpoint: string;
	deviceTokenV1Endpoint: string;
	deviceAuthorizationEndpoint: string;
	tokenEndpoint: string;
}

/**
 * Get the device flow endpoints for a base URL
 */
function getEndpoints(baseUrl: string): DeviceFlowEndpoints {
	return {
		deviceCodeV1Endpoint: `${baseUrl}/api/v1/auth/device/code`,
		deviceTokenV1Endpoint: `${baseUrl}/api/v1/auth/device/token`,
		deviceAuthorizationEndpoint: `${baseUrl}/oauth/device/code`,
		tokenEndpoint: `${baseUrl}/oauth/token`,
	};
}

interface ApiErrorPayload {
	success: false;
	error?: {
		code?: string;
		message?: string;
		details?: unknown;
	};
}

interface ApiSuccessPayload<T> {
	success: true;
	data: T;
}

interface DeviceCodeResponseV1 {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
	expiresIn: number;
	interval: number;
}

interface TokenResponseV1 {
	accessToken: string;
	tokenType: string;
	expiresIn?: number;
	refreshToken?: string;
	scope?: string;
}

function isApiSuccessPayload<T>(
	payload: unknown
): payload is ApiSuccessPayload<T> {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'success' in payload &&
		(payload as { success?: unknown }).success === true &&
		'data' in payload
	);
}

function normalizeDeviceCodeResponse(payload: unknown): DeviceCodeResponse {
	if (
		payload &&
		typeof payload === 'object' &&
		'device_code' in payload &&
		'user_code' in payload &&
		'verification_uri' in payload
	) {
		return payload as DeviceCodeResponse;
	}

	if (
		payload &&
		typeof payload === 'object' &&
		'deviceCode' in payload &&
		'userCode' in payload &&
		'verificationUri' in payload
	) {
		const v1 = payload as DeviceCodeResponseV1;
		return {
			device_code: v1.deviceCode,
			user_code: v1.userCode,
			verification_uri: v1.verificationUri,
			verification_uri_complete: v1.verificationUriComplete,
			expires_in: v1.expiresIn,
			interval: v1.interval,
		};
	}

	throw new CliError('AUTH_FAILED', {
		details: 'Invalid device code response',
	});
}

function normalizeTokenResponse(payload: unknown): TokenResponse {
	if (
		payload &&
		typeof payload === 'object' &&
		'access_token' in payload &&
		'token_type' in payload
	) {
		return payload as TokenResponse;
	}

	if (
		payload &&
		typeof payload === 'object' &&
		'accessToken' in payload &&
		'tokenType' in payload
	) {
		const v1 = payload as TokenResponseV1;
		return {
			access_token: v1.accessToken,
			token_type: v1.tokenType,
			expires_in: v1.expiresIn,
			refresh_token: v1.refreshToken,
			scope: v1.scope,
		};
	}

	throw new CliError('AUTH_FAILED', {
		details: 'Invalid token response',
	});
}

async function parseJsonSafe(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function toDeviceFlowErrorFromV1(
	response: Response,
	payload: unknown
): DeviceFlowError | null {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const apiError = payload as ApiErrorPayload;
	const errorCode = apiError.error?.code;
	const details =
		apiError.error?.details && typeof apiError.error.details === 'object'
			? (apiError.error.details as { status?: string })
			: undefined;
	const status = details?.status;

	if (status === 'authorization_pending') {
		return {
			error: 'authorization_pending',
			error_description: apiError.error?.message ?? 'Authorization pending',
		};
	}

	if (status === 'used') {
		return {
			error: 'access_denied',
			error_description:
				apiError.error?.message ??
				'Device code already used. Start a new login flow.',
		};
	}

	if (status === 'expired' || response.status === 401) {
		return {
			error: 'expired_token',
			error_description: apiError.error?.message ?? 'Device code expired',
		};
	}

	if (response.status === 409) {
		return {
			error: 'authorization_pending',
			error_description: apiError.error?.message ?? 'Authorization pending',
		};
	}

	if (errorCode === 'FORBIDDEN' || response.status === 403) {
		return {
			error: 'access_denied',
			error_description: apiError.error?.message ?? 'Authorization denied',
		};
	}

	return null;
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

	// Prefer v1 control-plane endpoints used in local dashboard/dev branches.
	{
		const v1Response = await fetch(endpoints.deviceCodeV1Endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: '{}',
		});

		if (v1Response.ok) {
			const payload = await parseJsonSafe(v1Response);
			const data = isApiSuccessPayload<DeviceCodeResponseV1>(payload)
				? payload.data
				: payload;
			return normalizeDeviceCodeResponse(data);
		}

		// If endpoint exists but failed, surface useful error.
		if (v1Response.status !== 404) {
			const payload = await parseJsonSafe(v1Response);
			const message =
				payload &&
				typeof payload === 'object' &&
				'error' in payload &&
				(payload as ApiErrorPayload).error?.message
					? (payload as ApiErrorPayload).error?.message
					: 'Request failed';
			throw new CliError('AUTH_FAILED', {
				details: `Device authorization failed: ${v1Response.status} ${message}`,
			});
		}
	}

	// Fallback to legacy OAuth device endpoint.
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

	const payload = await parseJsonSafe(response);
	const data = normalizeDeviceCodeResponse(payload);

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
	let useLegacyOAuthEndpoints = false;

	while (Date.now() < expiryTime) {
		// Wait for the interval
		await sleep(currentInterval);

		try {
			// Prefer v1 control-plane token polling endpoint unless unavailable.
			if (!useLegacyOAuthEndpoints) {
				const v1Response = await fetch(endpoints.deviceTokenV1Endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ deviceCode }),
				});

				if (v1Response.ok) {
					const payload = await parseJsonSafe(v1Response);
					const data = isApiSuccessPayload<TokenResponseV1>(payload)
						? payload.data
						: payload;
					return normalizeTokenResponse(data);
				}

				if (v1Response.status === 404) {
					useLegacyOAuthEndpoints = true;
				} else {
					const payload = await parseJsonSafe(v1Response);
					const mappedError = toDeviceFlowErrorFromV1(v1Response, payload);

					if (mappedError) {
						switch (mappedError.error) {
							case 'authorization_pending':
								continue;
							case 'expired_token':
								throw new CliError('DEVICE_FLOW_TIMEOUT', {
									details: mappedError.error_description,
								});
							case 'access_denied':
								throw new CliError('DEVICE_FLOW_DENIED', {
									details: mappedError.error_description,
								});
						}
					}

					const message =
						payload &&
						typeof payload === 'object' &&
						'error' in payload &&
						(payload as ApiErrorPayload).error?.message
							? (payload as ApiErrorPayload).error?.message
							: 'Request failed';

					throw new CliError('AUTH_FAILED', {
						details: `Token request failed: ${v1Response.status} ${message}`,
					});
				}
			}

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
				const payload = await parseJsonSafe(response);
				const token = normalizeTokenResponse(payload);
				return token;
			}

			// Check for known error codes
			const payload = await parseJsonSafe(response);
			const error = payload as DeviceFlowError;

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
