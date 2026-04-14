/**
 * Authentication commands (login/logout)
 */

import * as p from '@clack/prompts';
import open from 'open';
import {
	clearConfig,
	formatUserCode,
	getAuthState,
	getControlPlaneBaseUrl,
	getVerificationUrl,
	initiateDeviceFlow,
	isLoggedIn,
	pollForToken,
	storeTokens,
} from '../../auth';
import { color } from '../../core/logger';
import { TelemetryEventName } from '../../core/telemetry';
import type { CliCommand, CliContext } from '../../types';
import { createTaskSpinner } from '../../utils/spinner';

/**
 * Login command
 */
async function loginAction(context: CliContext): Promise<void> {
	const { logger, telemetry } = context;
	const baseUrl = getControlPlaneBaseUrl();

	// Check if already logged in
	const authState = await getAuthState();
	if (authState.isLoggedIn && !authState.isExpired) {
		logger.info('You are already logged in');
		if (authState.config?.email) {
			logger.message(`Logged in as: ${color.cyan(authState.config.email)}`);
		}

		const shouldRelogin = await p.confirm({
			message: 'Would you like to log in with a different account?',
			initialValue: false,
		});

		if (p.isCancel(shouldRelogin) || !shouldRelogin) {
			return;
		}
	}

	telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_STARTED);

	logger.message('');
	logger.message('Starting login flow...');

	const spinner = createTaskSpinner('Requesting device code...');
	spinner.start();

	try {
		// Step 1: Get device code
		const deviceCode = await initiateDeviceFlow(baseUrl);
		spinner.stop('Device code received');

		const userCode = formatUserCode(deviceCode.user_code);
		const verificationUrl = getVerificationUrl(deviceCode);

		// Display instructions
		logger.message('');
		logger.note(
			`Your code: ${color.bold(color.cyan(userCode))}\n\n` +
				`This code will expire in ${Math.floor(deviceCode.expires_in / 60)} minutes.`,
			'Verification Code'
		);

		logger.message('');
		logger.message(
			`Open this URL to continue: ${color.underline(verificationUrl)}`
		);
		logger.message('');

		// Try to open the browser
		const shouldOpen = await p.confirm({
			message: 'Open the verification page in your browser?',
			initialValue: true,
		});

		if (shouldOpen && !p.isCancel(shouldOpen)) {
			await open(verificationUrl);
			logger.info('Browser opened');
		}

		// Step 2: Poll for token
		logger.message('');
		const pollSpinner = createTaskSpinner('Waiting for authorization...');
		pollSpinner.start();

		const token = await pollForToken(
			baseUrl,
			deviceCode.device_code,
			deviceCode.interval,
			deviceCode.expires_in
		);

		pollSpinner.success('Authorization received');

		// Step 3: Store tokens
		await storeTokens(token.access_token, {
			refreshToken: token.refresh_token,
			expiresIn: token.expires_in,
		});

		telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_SUCCEEDED);

		logger.message('');
		logger.success('Successfully logged in!');
		logger.message('');
		logger.message('You can now:');
		logger.message(
			`  ${color.dim('•')} Run ${color.cyan('c15t projects')} to manage your projects`
		);
		logger.message(
			`  ${color.dim('•')} Run ${color.cyan('c15t generate')} to set up c15t in your project`
		);
	} catch (error) {
		spinner.stop();

		telemetry.trackEvent(TelemetryEventName.AUTH_LOGIN_FAILED, {
			error: error instanceof Error ? error.message : String(error),
		});

		throw error;
	}
}

/**
 * Logout command
 */
async function logoutAction(context: CliContext): Promise<void> {
	const { logger, telemetry } = context;

	const isAuthenticated = await isLoggedIn();
	if (!isAuthenticated) {
		logger.info('You are not logged in');
		return;
	}

	const shouldLogout = await context.confirm(
		'Are you sure you want to log out?'
	);
	if (!shouldLogout) {
		logger.info('Logout cancelled');
		return;
	}

	await clearConfig();

	telemetry.trackEvent(TelemetryEventName.AUTH_LOGOUT);

	logger.success('Successfully logged out');
}

/**
 * Auth status command
 */
async function statusAction(context: CliContext): Promise<void> {
	const { logger } = context;

	const authState = await getAuthState();

	if (!authState.isLoggedIn) {
		logger.message('Status: ' + color.yellow('Not logged in'));
		logger.message('');
		logger.message(`Run ${color.cyan('c15t login')} to authenticate`);
		return;
	}

	if (authState.isExpired) {
		logger.message('Status: ' + color.yellow('Session expired'));
		logger.message('');
		logger.message(`Run ${color.cyan('c15t login')} to refresh your session`);
		return;
	}

	logger.message('Status: ' + color.green('Logged in'));

	if (authState.config?.email) {
		logger.message(`Account: ${authState.config.email}`);
	}

	if (authState.config?.lastLogin) {
		const lastLogin = new Date(authState.config.lastLogin).toLocaleString();
		logger.message(`Last login: ${lastLogin}`);
	}

	if (authState.config?.selectedInstanceId) {
		logger.message(`Selected project: ${authState.config.selectedInstanceId}`);
	}
}

/**
 * Login command definition
 */
export const loginCommand: CliCommand = {
	name: 'login',
	label: 'Login',
	hint: 'Authenticate with inth.com',
	description:
		'Log in to your inth.com account using device flow authentication',
	action: loginAction,
};

/**
 * Logout command definition
 */
export const logoutCommand: CliCommand = {
	name: 'logout',
	label: 'Logout',
	hint: 'Sign out of inth.com',
	description: 'Log out of your inth.com account',
	action: logoutAction,
};

/**
 * Auth status command definition (hidden, used as subcommand)
 */
export const authStatusCommand: CliCommand = {
	name: 'status',
	label: 'Status',
	hint: 'Check authentication status',
	description: 'Check your current authentication status',
	action: statusAction,
	hidden: true,
};

/**
 * All auth commands
 */
export const authCommands = [loginCommand, logoutCommand, authStatusCommand];
