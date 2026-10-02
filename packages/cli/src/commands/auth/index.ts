import { getAuthState, getSelectedInstanceId } from '../../auth';
import {
	hasLegacyCredentials,
	LEGACY_SESSION_NOTICE,
	removeLegacyCredentials,
} from '../../auth/legacy';
import { login } from '../../auth/login';
import type { CliCommand, CliContext } from '../../context/types';
import { CliError } from '../../core/errors';
import { TelemetryEventName } from '../../core/telemetry';
import { getAuthenticationStatus } from '../../frontend/status';
import { runInth } from '../../inth/runner';

const requireNoArguments = (context: CliContext) => {
	if (context.commandArgs.length) {
		throw new CliError('FLAG_INVALID', {
			details: `Unexpected argument: ${context.commandArgs.join(' ')}`,
		});
	}
};

const loginAction = async (context: CliContext) => {
	requireNoArguments(context);
	context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_STARTED);
	try {
		const result = await login(context);
		if (result.authenticated) {
			context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_SUCCEEDED);
			context.logger.success('Logged in');
		}
		return result;
	} catch (error) {
		context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_FAILED);
		throw error;
	}
};

const logoutAction = async (context: CliContext) => {
	requireNoArguments(context);
	const options = { cwd: context.projectRoot ?? context.cwd };
	// Remove the old plaintext file first so a failing Inth logout cannot keep it.
	const legacyCredentialsRemoved = await removeLegacyCredentials();
	// Inth signs out the selected connection; `c15t login --email` may also
	// have left an agent connection or pending approval. An API key in
	// INTH_TOKEN cannot be combined with an explicit agent selection.
	const signedOut = await runInth(['logout'], options);
	if (!process.env.INTH_TOKEN) {
		await runInth(['logout', '--auth', 'agent'], options);
	}
	context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGOUT);
	context.logger.success(
		'Signed out of Inth. This also signs out the inth CLI, which shares the session.'
	);
	if (legacyCredentialsRemoved) {
		context.logger.info('Removed the old c15t session in ~/.c15t/config.json.');
	}
	const apiKeyStillActive =
		typeof signedOut === 'object' &&
		signedOut !== null &&
		'apiKeyStillActive' in signedOut &&
		signedOut.apiKeyStillActive === true;
	if (apiKeyStillActive) {
		context.logger.warn(
			'INTH_TOKEN is still set. Unset it to stop using the API key.'
		);
	}
	return { apiKeyStillActive, authenticated: false, legacyCredentialsRemoved };
};

const statusAction = async (context: CliContext) => {
	requireNoArguments(context);
	const state = await getAuthState({ cwd: context.projectRoot ?? context.cwd });
	const result = getAuthenticationStatus({
		expiresAt: state.expiresAt,
		isExpired: state.isExpired,
		isLoggedIn: state.isLoggedIn,
		selectedProject:
			(await getSelectedInstanceId(context.projectRoot ?? context.cwd)) ??
			undefined,
	});
	context.logger.message(`Authentication: ${result.status}`);
	if (!state.isLoggedIn && (await hasLegacyCredentials())) {
		context.logger.info(LEGACY_SESSION_NOTICE);
		return { ...result, legacySession: true };
	}
	return result;
};

export const loginCommand: CliCommand = {
	action: loginAction,
	description:
		'Sign in to Inth in a browser, or with --email get an approval link for another device',
	hint: 'Authenticate with Inth',
	label: 'Login',
	name: 'login',
};
export const logoutCommand: CliCommand = {
	action: logoutAction,
	description:
		'Sign out of the Inth session shared with the inth CLI and remove old c15t credentials',
	hint: 'Sign out of Inth',
	label: 'Logout',
	name: 'logout',
};
export const authStatusCommand: CliCommand = {
	action: statusAction,
	description: 'Check the local Inth session without contacting the server',
	hint: 'Check authentication status',
	label: 'Status',
	name: 'status',
};
export const authCommands = [loginCommand, logoutCommand, authStatusCommand];
