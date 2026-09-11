import { clearConfig, getAuthState, getControlPlaneBaseUrl } from '../../auth';
import { login } from '../../auth/login';
import type { CliCommand, CliContext } from '../../context/types';
import { CliError } from '../../core/errors';
import { TelemetryEventName } from '../../core/telemetry';

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
		context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_SUCCEEDED);
		context.logger.success('Logged in');
		return result;
	} catch (error) {
		context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_FAILED);
		throw error;
	}
};

const logoutAction = async (context: CliContext) => {
	requireNoArguments(context);
	// Local credential removal must work even after token expiry or corruption.
	await clearConfig();
	context.telemetry.trackEvent(TelemetryEventName.AUTH_LOGOUT);
	context.logger.success('Logged out');
	return { authenticated: false };
};

const statusAction = async (context: CliContext) => {
	requireNoArguments(context);
	const state = await getAuthState();
	let status = 'logged-out';
	if (state.isLoggedIn) {
		status = state.isExpired ? 'expired' : 'logged-in';
	}
	context.logger.message(`Authentication: ${status}`);
	return {
		authenticated: state.isLoggedIn && !state.isExpired,
		expiresAt: state.config?.expiresAt,
		origin: getControlPlaneBaseUrl(),
		selectedProject: state.config?.selectedInstanceId,
		status,
	};
};

export const loginCommand: CliCommand = {
	action: loginAction,
	description: 'Authenticate with Inth using a device code',
	hint: 'Authenticate with Inth',
	label: 'Login',
	name: 'login',
};
export const logoutCommand: CliCommand = {
	action: logoutAction,
	description: 'Remove locally stored authentication credentials',
	hint: 'Sign out of Inth',
	label: 'Logout',
	name: 'logout',
};
export const authStatusCommand: CliCommand = {
	action: statusAction,
	description: 'Check locally stored authentication status',
	hint: 'Check authentication status',
	label: 'Status',
	name: 'status',
};
export const authCommands = [loginCommand, logoutCommand, authStatusCommand];
