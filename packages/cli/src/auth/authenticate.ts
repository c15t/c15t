import { getControlPlaneBaseUrl } from './base-url';
import { storeTokens } from './config-store';
import { initiateDeviceFlow, pollForToken } from './device-flow';
import type { DeviceCodeResponse } from './types';

/** Authenticate a device and store its credentials without owning terminal UI. */
export const authenticate = async (options: {
	baseUrl?: string;
	signal?: AbortSignal;
	onDeviceCode: (code: DeviceCodeResponse) => void | Promise<void>;
}): Promise<{ authenticated: true; expiresAt?: number }> => {
	const baseUrl = options.baseUrl ?? getControlPlaneBaseUrl();
	const code = await initiateDeviceFlow(baseUrl, options.signal);
	const expiresAt = Date.now() + code.expires_in * 1000;
	await options.onDeviceCode(code);
	const token = await pollForToken(
		baseUrl,
		code.device_code,
		code.interval,
		Math.max(0.001, (expiresAt - Date.now()) / 1000),
		options.signal
	);
	await storeTokens(token.access_token, {
		baseUrl,
		expiresIn: token.expires_in,
		refreshToken: token.refresh_token,
	});
	return {
		authenticated: true,
		expiresAt:
			token.expires_in === undefined
				? undefined
				: Date.now() + token.expires_in * 1000,
	};
};
