import { lstat, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PATHS } from '../constants';
import { CliError } from '../core/errors';

/** Explains why a session saved by c15t before Inth no longer signs anyone in. */
export const LEGACY_SESSION_NOTICE =
	'The c15t session saved in ~/.c15t/config.json by earlier CLI versions is no longer used. Run `c15t login` to sign in with Inth.';

/**
 * Path of the plaintext credential file written by c15t before Inth owned
 * authentication. Earlier versions had no override for this location.
 * @returns Absolute path to `~/.c15t/config.json`.
 */
export const getLegacyCredentialsPath = (): string =>
	path.join(os.homedir(), PATHS.CONFIG_DIR, PATHS.CONFIG_FILE);

const isMissing = (error: unknown): boolean =>
	error instanceof Error && 'code' in error && error.code === 'ENOENT';

/**
 * Check for the legacy credential file without reading its tokens.
 * @returns True when `~/.c15t/config.json` exists.
 */
export const hasLegacyCredentials = async (): Promise<boolean> => {
	try {
		await lstat(getLegacyCredentialsPath());
		return true;
	} catch {
		return false;
	}
};

/**
 * Delete the legacy plaintext credential file, leaving the rest of `~/.c15t`.
 * @returns True when a file was removed.
 * @throws {CliError} FILE_WRITE_ERROR when the file exists but cannot be removed.
 */
export const removeLegacyCredentials = async (): Promise<boolean> => {
	try {
		await unlink(getLegacyCredentialsPath());
		return true;
	} catch (error) {
		if (isMissing(error)) {
			return false;
		}
		throw new CliError('FILE_WRITE_ERROR', {
			details: `Could not remove ${getLegacyCredentialsPath()}.`,
		});
	}
};

/**
 * Add the legacy-session notice to a not-logged-in error when the old file exists.
 * @param error Any error raised by a hosted command.
 * @returns The same error, or a not-logged-in error that explains the old session.
 */
export const withLegacySessionNotice = async (
	error: unknown
): Promise<unknown> => {
	if (
		!(error instanceof CliError && error.code === 'AUTH_NOT_LOGGED_IN') ||
		!(await hasLegacyCredentials())
	) {
		return error;
	}
	return new CliError('AUTH_NOT_LOGGED_IN', {
		...error.context,
		details: LEGACY_SESSION_NOTICE,
	});
};
