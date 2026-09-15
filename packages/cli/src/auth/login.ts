import open from 'open';

import type { CliContext } from '../context/types';
import { authenticate } from './authenticate';
import { getControlPlaneBaseUrl } from './base-url';
import { getAuthState } from './config-store';
import { getVerificationUrl } from './device-flow';

/** Shared login presentation used by setup and the standalone command. */
export const login = async (
	context: CliContext,
	dependencies: { open: (url: string) => Promise<unknown> } = { open }
): Promise<{ authenticated: true; expiresAt?: number }> => {
	const baseUrl = getControlPlaneBaseUrl();
	const state = await getAuthState(baseUrl);
	if (state.isLoggedIn && !state.isExpired && !context.flags.force) {
		context.logger.info('Already logged in. Use --force to sign in again.');
		return { authenticated: true, expiresAt: state.config?.expiresAt };
	}
	return authenticate({
		baseUrl,
		onDeviceCode: async (code) => {
			const url = getVerificationUrl(code);
			context.logger.message(`Verification code: ${code.user_code}`);
			context.logger.message(`Open ${url} to authorize this device.`);
			context.logger.message(
				`The code expires in ${Math.ceil(code.expires_in / 60)} minutes.`
			);
			if (context.flags['non-interactive'] || context.flags['no-browser']) {
				return;
			}
			const shouldOpen = await context.confirm(
				'Open the verification page in your browser?',
				true
			);
			if (shouldOpen) {
				try {
					await dependencies.open(url);
				} catch {
					context.logger.warn(
						`Could not open a browser. Open ${url} manually.`
					);
				}
			}
		},
	});
};
