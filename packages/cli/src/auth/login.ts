import { z } from 'zod';

import type { CliContext } from '../context/types';
import { CliError } from '../core/errors';
import { runInth } from '../inth/runner';
import { hasLegacyCredentials, LEGACY_SESSION_NOTICE } from './legacy';
import { getAuthState } from './status';

/** Permissions hosted c15t setup needs: read organizations, manage projects. */
export const LOGIN_SCOPES =
	'organizations.read,organizations.write,projects.read,projects.write';

const COMPLETE_COMMAND = 'c15t login --complete --json';

const approvalSchema = z.object({
	expiresAt: z.number().nullish(),
	userCode: z.string().min(1),
	verificationUri: z.string().url(),
});

/** Result of `c15t login`. Never contains tokens. */
export type LoginResult =
	| { authenticated: true; expiresAt?: number; status: 'logged-in' }
	| {
			authenticated: false;
			expiresAt?: number;
			nextStep: { command: string; instruction: string };
			status: 'pending';
			userCode: string;
			verificationUri: string;
	  };

const stringFlag = (context: CliContext, name: string): string | undefined => {
	const value = context.flags[name];
	return typeof value === 'string' ? value : undefined;
};

const readTimeout = (context: CliContext): string[] => {
	const timeout = stringFlag(context, 'timeout');
	if (timeout === undefined) {
		return [];
	}
	const seconds = Number(timeout);
	if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
		throw new CliError('FLAG_INVALID', {
			details: '--timeout must be a whole number of seconds from 1 to 3600.',
		});
	}
	return ['--timeout', String(seconds)];
};

const signedIn = async (
	options: { cwd: string },
	pendingDetails: string
): Promise<LoginResult> => {
	const state = await getAuthState(options);
	if (!state.isLoggedIn || state.isExpired) {
		throw new CliError('INPUT_REQUIRED', { details: pendingDetails });
	}
	return {
		authenticated: true,
		expiresAt: state.expiresAt,
		status: 'logged-in',
	};
};

/** Wait for browser approval of a pending email login and select it. */
const completeLogin = async (
	context: CliContext,
	options: { cwd: string }
): Promise<LoginResult> => {
	await runInth(
		['login', '--complete', '--wait', ...readTimeout(context)],
		options
	);
	return signedIn(
		options,
		'Inth finished waiting, but no signed-in session is selected.'
	);
};

/** Ask Inth for an approval link a person can open on any device. */
const startEmailLogin = async (
	context: CliContext,
	email: string,
	options: { cwd: string }
): Promise<LoginResult> => {
	const approval = approvalSchema.safeParse(
		await runInth(
			['login', '--email', email, '--scopes', LOGIN_SCOPES],
			options
		)
	);
	if (!approval.success) {
		throw new CliError('API_ERROR', {
			details: 'Inth returned an invalid approval link.',
		});
	}
	const { expiresAt, userCode, verificationUri } = approval.data;
	context.logger.message(`Open ${verificationUri} to approve this sign-in.`);
	context.logger.message(`Confirm that the page shows the code ${userCode}.`);
	if (context.flags.json === true) {
		context.logger.info(`Then run \`${COMPLETE_COMMAND}\` to finish.`);
		return {
			authenticated: false,
			expiresAt: expiresAt ?? undefined,
			nextStep: {
				command: COMPLETE_COMMAND,
				instruction:
					'Show verificationUri and userCode to the person, then run the command right away in the background. It waits for approval and finishes sign-in.',
			},
			status: 'pending',
			userCode,
			verificationUri,
		};
	}
	context.logger.info('Waiting for approval…');
	return completeLogin(context, options);
};

/**
 * Sign in through Inth, the shared session store for c15t and the inth CLI.
 *
 * - Interactive terminals run Inth's browser login.
 * - `--email` requests an approval link and code that a person opens on any
 *   device. Human output waits for approval; `--json` returns the link at once
 *   and `--complete` waits for approval in a separate call.
 * - CI can skip login by setting INTH_TOKEN to an organization API key.
 * @param context CLI context with `email`, `complete`, `timeout`, `force` and
 * `no-browser` flags.
 * @returns Login state, or the pending approval link for `--email --json`.
 * @throws {CliError} INPUT_REQUIRED without a terminal or email, plus any
 * mapped Inth failure.
 */
export const login = async (context: CliContext): Promise<LoginResult> => {
	const options = { cwd: context.projectRoot ?? context.cwd };
	const email = stringFlag(context, 'email');
	const complete = context.flags.complete === true;
	if (email !== undefined && complete) {
		throw new CliError('FLAG_INVALID', {
			details: 'Use --email to start sign-in and --complete to finish it.',
		});
	}
	if (
		stringFlag(context, 'timeout') !== undefined &&
		email === undefined &&
		!complete
	) {
		throw new CliError('FLAG_INVALID', {
			details: '--timeout applies only with --email or --complete.',
		});
	}
	if (complete) {
		return completeLogin(context, options);
	}
	const state = await getAuthState(options);
	if (state.isLoggedIn && !state.isExpired && !context.flags.force) {
		context.logger.info('Already logged in. Use --force to sign in again.');
		return {
			authenticated: true,
			expiresAt: state.expiresAt,
			status: 'logged-in',
		};
	}
	if (!state.isLoggedIn && (await hasLegacyCredentials())) {
		context.logger.info(LEGACY_SESSION_NOTICE);
	}
	if (email !== undefined) {
		return startEmailLogin(context, email, options);
	}
	if (
		context.flags['non-interactive'] === true ||
		context.flags.json === true
	) {
		throw new CliError('INPUT_REQUIRED', {
			details:
				'Browser sign-in needs an interactive terminal. Run `c15t login --email <email>` for an approval link and code, then `c15t login --complete`. In CI, set INTH_TOKEN to an organization API key instead.',
		});
	}
	await runInth(
		['login', ...(context.flags['no-browser'] ? ['--no-browser'] : [])],
		{ ...options, interactive: true }
	);
	return signedIn(options, 'Complete your Inth sign-in before continuing.');
};
