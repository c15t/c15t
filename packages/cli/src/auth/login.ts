import type { CliContext } from '../context/types';
import { CliError } from '../core/errors';
import { runInth } from '../inth/runner';
import { getAuthState } from './status';

/** Delegate login to the installed Inth CLI using its existing session and store. */
export const login = async (
	context: CliContext
): Promise<{ authenticated: boolean; expiresAt?: number }> => {
	const options = { cwd: context.projectRoot ?? context.cwd };
	const state = await getAuthState(options);
	if (state.isLoggedIn && !state.isExpired && !context.flags.force) {
		return { authenticated: true, expiresAt: state.expiresAt };
	}
	await runInth(
		['login', ...(context.flags['no-browser'] ? ['--no-browser'] : [])],
		{
			...options,
			interactive:
				context.flags['non-interactive'] !== true &&
				context.flags.json !== true,
		}
	);
	const signedIn = await getAuthState(options);
	if (!signedIn.isLoggedIn) {
		throw new CliError('INPUT_REQUIRED', {
			details: 'Complete your Inth sign-in before continuing setup.',
		});
	}
	return { authenticated: true, expiresAt: signedIn.expiresAt };
};
