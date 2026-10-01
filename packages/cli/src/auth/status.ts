import { z } from 'zod';

import { CliError } from '../core/errors';
import { runInth } from '../inth/runner';
import type { InthOptions } from '../inth/runner';

const statusSchema = z.object({
	credentialPresent: z.boolean(),
	credentialSource: z.string(),
	expiresAt: z.number().nullish(),
});

/** Read Inth's public local session status, never its credentials. */
export const getAuthState = async (options: InthOptions = {}) => {
	try {
		const result = statusSchema.safeParse(
			await runInth(['auth', 'status'], options)
		);
		if (!result.success) {
			throw new CliError('API_ERROR', {
				details: 'Invalid Inth authentication status.',
			});
		}
		const { credentialPresent, credentialSource, expiresAt } = result.data;
		return {
			credentialSource,
			expiresAt: expiresAt ?? undefined,
			isExpired: typeof expiresAt === 'number' && expiresAt <= Date.now(),
			isLoggedIn: credentialPresent,
		};
	} catch (error) {
		if (error instanceof CliError && error.code === 'AUTH_NOT_LOGGED_IN') {
			return {
				credentialSource: 'none',
				expiresAt: undefined,
				isExpired: false,
				isLoggedIn: false,
			};
		}
		throw error;
	}
};
