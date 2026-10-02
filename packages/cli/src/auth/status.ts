import { z } from 'zod';

import { CliError } from '../core/errors';
import { runInth } from '../inth/runner';
import type { InthOptions } from '../inth/runner';

/** Credential source Inth reports for an approved agent (auth.md) connection. */
const AGENT_SOURCE = 'auth.md';

const statusSchema = z.object({
	/** Agent connections only: hard deadline after which renewal is impossible. */
	assertionExpiresAt: z.number().nullish(),
	credentialPresent: z.boolean(),
	credentialSource: z.string(),
	/** Access-token expiry. Browser sessions refresh past it silently. */
	expiresAt: z.number().nullish(),
	status: z.string().optional(),
});

/** Credential-free view of Inth's selected connection. */
export interface AuthState {
	credentialSource: string;
	/** When the session itself ends and needs a new login, if Inth knows. */
	expiresAt?: number;
	/** True only when Inth can no longer refresh the session. */
	isExpired: boolean;
	isLoggedIn: boolean;
}

/**
 * Read Inth's public local session status, never its credentials.
 *
 * Browser sessions report the expiry of a short-lived access token that Inth
 * refreshes on the next request, so that expiry never marks a session expired.
 * Inth clears a browser session itself when its refresh token stops working.
 * Agent connections can be renewed only until `assertionExpiresAt`.
 * @param options Working directory and cancellation for the Inth process.
 * @returns Whether a usable session exists, and when it ends if known.
 * @throws {CliError} When Inth fails for a reason other than being signed out.
 */
export const getAuthState = async (
	options: InthOptions = {}
): Promise<AuthState> => {
	try {
		const result = statusSchema.safeParse(
			await runInth(['auth', 'status'], options)
		);
		if (!result.success) {
			throw new CliError('API_ERROR', {
				details: 'Invalid Inth authentication status.',
			});
		}
		const { assertionExpiresAt, credentialPresent, credentialSource, status } =
			result.data;
		const sessionEndsAt =
			credentialSource === AGENT_SOURCE
				? (assertionExpiresAt ?? undefined)
				: undefined;
		return {
			credentialSource,
			expiresAt: sessionEndsAt,
			isExpired:
				credentialPresent &&
				(status === 'expired' ||
					(sessionEndsAt !== undefined && sessionEndsAt <= Date.now())),
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
