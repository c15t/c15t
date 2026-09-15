/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628)
 *
 * Implements the device flow for CLI authentication.
 * The user is directed to a URL to authorize the device,
 * while the CLI polls for the token.
 */

import { setTimeout as delay } from 'node:timers/promises';

import { z } from 'zod';

import { TIMEOUTS, URLS } from '../constants';
import { CliError } from '../core/errors';
import { getControlPlaneOrigin } from './base-url';
import { fetchWithDeadline } from './http';
import type {
	DeviceCodeResponse,
	DeviceFlowError,
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
const getEndpoints = function getEndpoints(
	baseUrl: string
): DeviceFlowEndpoints {
	return {
		deviceAuthorizationEndpoint: `${baseUrl}/oauth/device/code`,
		deviceCodeV1Endpoint: `${baseUrl}/api/v1/auth/device/code`,
		deviceTokenV1Endpoint: `${baseUrl}/api/v1/auth/device/token`,
		tokenEndpoint: `${baseUrl}/oauth/token`,
	};
};

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

const isApiSuccessPayload = function isApiSuccessPayload<T>(
	payload: unknown
): payload is ApiSuccessPayload<T> {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'success' in payload &&
		(payload as { success?: unknown }).success === true &&
		'data' in payload
	);
};

const deviceCodeSchema = z.object({
	device_code: z.string().min(1),
	expires_in: z.number().positive().finite(),
	interval: z.number().positive().finite().default(5),
	user_code: z.string().min(1),
	verification_uri: z.string().url(),
	verification_uri_complete: z.string().url().optional(),
});
const tokenSchema = z.object({
	access_token: z.string().min(1),
	expires_in: z.number().nonnegative().finite().optional(),
	refresh_token: z.string().optional(),
	scope: z.string().optional(),
	token_type: z.string().min(1),
});
const normalizeDeviceCodeResponse = (payload: unknown): DeviceCodeResponse => {
	const camel = z
		.object({
			deviceCode: z.string(),
			expiresIn: z.number(),
			interval: z.number().optional(),
			userCode: z.string(),
			verificationUri: z.string(),
			verificationUriComplete: z.string().optional(),
		})
		.safeParse(payload);
	const parsed = deviceCodeSchema.safeParse(
		camel.success
			? {
					device_code: camel.data.deviceCode,
					expires_in: camel.data.expiresIn,
					interval: camel.data.interval,
					user_code: camel.data.userCode,
					verification_uri: camel.data.verificationUri,
					verification_uri_complete: camel.data.verificationUriComplete,
				}
			: payload
	);
	if (!parsed.success) {
		throw new CliError('AUTH_FAILED', {
			details: 'Invalid device code response',
		});
	}
	for (const url of [
		parsed.data.verification_uri,
		parsed.data.verification_uri_complete,
	]) {
		if (url) {
			getControlPlaneOrigin(url);
		}
	}
	return parsed.data;
};
const normalizeTokenResponse = (payload: unknown): TokenResponse => {
	const camel = z
		.object({
			accessToken: z.string(),
			expiresIn: z.number().optional(),
			refreshToken: z.string().optional(),
			scope: z.string().optional(),
			tokenType: z.string(),
		})
		.safeParse(payload);
	const parsed = tokenSchema.safeParse(
		camel.success
			? {
					access_token: camel.data.accessToken,
					expires_in: camel.data.expiresIn,
					refresh_token: camel.data.refreshToken,
					scope: camel.data.scope,
					token_type: camel.data.tokenType,
				}
			: payload
	);
	if (!parsed.success) {
		throw new CliError('AUTH_FAILED', { details: 'Invalid token response' });
	}
	return parsed.data;
};

const parseJsonSafe = async function parseJsonSafe(
	response: Response
): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
};

const isDeviceCodeExpired = (
	status: string | undefined,
	responseStatus: number
): boolean => status === 'expired' || responseStatus === 401;

const toDeviceFlowErrorFromV1 = function toDeviceFlowErrorFromV1(
	response: Response,
	payload: unknown
): DeviceFlowError | null {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const apiError = payload as ApiErrorPayload;
	const errorCode = apiError.error?.code;
	const message = apiError.error?.message;
	const details =
		apiError.error?.details && typeof apiError.error.details === 'object'
			? (apiError.error.details as { status?: string })
			: undefined;
	const status = details?.status;

	if (status === 'authorization_pending') {
		return {
			error: 'authorization_pending',
			error_description: message ?? 'Authorization pending',
		};
	}

	if (status === 'used') {
		return {
			error: 'access_denied',
			error_description:
				message ?? 'Device code already used. Start a new login flow.',
		};
	}

	if (isDeviceCodeExpired(status, response.status)) {
		return {
			error: 'expired_token',
			error_description: message ?? 'Device code expired',
		};
	}

	if (response.status === 409) {
		return {
			error: 'authorization_pending',
			error_description: message ?? 'Authorization pending',
		};
	}

	if (errorCode === 'FORBIDDEN' || response.status === 403) {
		return {
			error: 'access_denied',
			error_description: message ?? 'Authorization denied',
		};
	}

	return null;
};

/**
 * Initiate the device authorization flow
 *
 * Requests a device code and user code from the authorization server.
 */
export const initiateDeviceFlow = async function initiateDeviceFlow(
	baseUrl: string = URLS.CONSENT_IO,
	signal?: AbortSignal
): Promise<DeviceCodeResponse> {
	getControlPlaneOrigin(baseUrl);
	const endpoints = getEndpoints(baseUrl);

	// Prefer v1 control-plane endpoints used in local dashboard/dev branches.
	{
		const v1Response = await fetchWithDeadline(endpoints.deviceCodeV1Endpoint, {
			body: '{}',
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal,
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
	const response = await fetchWithDeadline(
		endpoints.deviceAuthorizationEndpoint,
		{
			body: new URLSearchParams({
				client_id: 'c15t-cli',
				scope: 'instances:read instances:write',
			}),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			signal,
		}
	);

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
};

/**
 * Poll for the token
 *
 * Polls the token endpoint until the user authorizes the device,
 * the request expires, or is denied.
 */
/**
 * Sleep for a specified duration
 */
type TokenPollResult =
	| { kind: 'legacy' }
	| { kind: 'pending' }
	| { kind: 'slow-down' }
	| { kind: 'token'; token: TokenResponse };

const pollV1TokenEndpoint = async (
	endpoint: string,
	deviceCode: string,
	signal: AbortSignal
): Promise<TokenPollResult> => {
	const response = await fetchWithDeadline(endpoint, {
		body: JSON.stringify({ deviceCode }),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
		signal,
	});
	const payload = await parseJsonSafe(response);
	if (response.ok) {
		const data = isApiSuccessPayload<TokenResponseV1>(payload)
			? payload.data
			: payload;
		return { kind: 'token', token: normalizeTokenResponse(data) };
	}
	if (response.status === 404) {
		return { kind: 'legacy' };
	}

	const mappedError = toDeviceFlowErrorFromV1(response, payload);
	if (mappedError?.error === 'authorization_pending') {
		return { kind: 'pending' };
	}
	if (mappedError?.error === 'expired_token') {
		throw new CliError('DEVICE_FLOW_TIMEOUT', {
			details: mappedError.error_description,
		});
	}
	if (mappedError?.error === 'access_denied') {
		throw new CliError('DEVICE_FLOW_DENIED', {
			details: mappedError.error_description,
		});
	}

	const apiError = payload as ApiErrorPayload | null;
	throw new CliError('AUTH_FAILED', {
		details: `Token request failed: ${response.status} ${apiError?.error?.message ?? 'Request failed'}`,
	});
};

const pollLegacyTokenEndpoint = async (
	endpoint: string,
	deviceCode: string,
	signal: AbortSignal
): Promise<TokenPollResult> => {
	const response = await fetchWithDeadline(endpoint, {
		body: new URLSearchParams({
			client_id: 'c15t-cli',
			device_code: deviceCode,
			grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
		}),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		method: 'POST',
		signal,
	});
	const payload = await parseJsonSafe(response);
	if (response.ok) {
		return { kind: 'token', token: normalizeTokenResponse(payload) };
	}

	const error = z
		.object({ error: z.string(), error_description: z.string().optional() })
		.safeParse(payload);
	if (!error.success) {
		throw new CliError('AUTH_FAILED', {
			details: 'Invalid token error response',
		});
	}
	const tokenError = error.data;
	switch (tokenError.error) {
		case 'authorization_pending':
			return { kind: 'pending' };
		case 'slow_down':
			return { kind: 'slow-down' };
		case 'access_denied':
			throw new CliError('DEVICE_FLOW_DENIED', {
				details: tokenError.error_description,
			});
		case 'expired_token':
			throw new CliError('DEVICE_FLOW_TIMEOUT', {
				details: 'The device code has expired',
			});
		default:
			throw new CliError('AUTH_FAILED', {
				details:
					tokenError.error_description || `Unknown error: ${tokenError.error}`,
			});
	}
};

/* oxlint-disable no-await-in-loop -- OAuth device polling must wait between sequential requests. */
export const pollForToken = async function pollForToken(
	baseUrl: string,
	deviceCode: string,
	interval: number = TIMEOUTS.DEVICE_FLOW_POLL_INTERVAL,
	expiresIn: number = TIMEOUTS.DEVICE_FLOW_EXPIRY,
	signal?: AbortSignal
): Promise<TokenResponse> {
	const endpoints = getEndpoints(baseUrl);
	const deadline = AbortSignal.timeout(
		Math.max(1, Math.ceil(expiresIn * 1000))
	);
	const cancellation = signal ? AbortSignal.any([signal, deadline]) : deadline;
	let currentInterval = interval * 1000;
	let legacy = false;
	try {
		while (true) {
			await delay(currentInterval, undefined, { signal: cancellation });
			let result: TokenPollResult;
			try {
				result = legacy
					? await pollLegacyTokenEndpoint(
							endpoints.tokenEndpoint,
							deviceCode,
							cancellation
						)
					: await pollV1TokenEndpoint(
							endpoints.deviceTokenV1Endpoint,
							deviceCode,
							cancellation
						);
			} catch (error) {
				if (cancellation.aborted || error instanceof CliError) {
					throw error;
				}
				// Transient network errors may recover before the device code expires.
				continue;
			}
			if (result.kind === 'token') {
				return result.token;
			}
			if (result.kind === 'legacy') {
				legacy = true;
			}
			if (result.kind === 'slow-down') {
				currentInterval += 5000;
			}
		}
	} catch (error) {
		if (signal?.aborted) {
			throw new CliError('CANCELLED');
		}
		if (deadline.aborted) {
			throw new CliError('DEVICE_FLOW_TIMEOUT');
		}
		throw error;
	}
};

/* oxlint-enable no-await-in-loop */

/**
 * Format the user code for display (e.g., "ABCD-EFGH")
 */
export const formatUserCode = function formatUserCode(
	userCode: string
): string {
	// If it's already formatted, return as-is
	if (userCode.includes('-')) {
		return userCode;
	}

	// Split into groups of 4
	const midpoint = Math.ceil(userCode.length / 2);
	return `${userCode.slice(0, midpoint)}-${userCode.slice(midpoint)}`;
};

/**
 * Get the complete verification URL with user code
 */
export const getVerificationUrl = function getVerificationUrl(
	response: DeviceCodeResponse
): string {
	if (response.verification_uri_complete) {
		return response.verification_uri_complete;
	}

	// Build the URL with the user code
	const url = new URL(response.verification_uri);
	url.searchParams.set('user_code', response.user_code);
	return url.toString();
};
