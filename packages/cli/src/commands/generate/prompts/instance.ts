/**
 * Instance selection prompts for hosted mode
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';
import { URLS } from '../../../constants';

/**
 * Instance type
 */
interface Instance {
	id: string;
	name: string;
	url: string;
	status: 'active' | 'inactive' | 'pending';
}

/**
 * Validate URL format
 */
function validateUrl(value: string): string | undefined {
	if (!value.match(/^https?:\/\/.+/)) {
		return 'Please enter a valid URL';
	}
	return undefined;
}

/**
 * Normalize URL
 */
function normalizeUrl(url: string): string {
	let normalized = url.trim();
	if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
		normalized = `https://${normalized}`;
	}
	normalized = normalized.replace(/\/+$/, '');
	return normalized;
}

/**
 * Create a spinner
 */
function createTaskSpinner(message: string) {
	const spinner = p.spinner();
	return {
		start: () => spinner.start(message),
		stop: (msg?: string) => spinner.stop(msg || 'Done'),
		success: (msg: string) => spinner.stop(msg),
		error: (msg: string) => spinner.stop(msg),
	};
}

/**
 * Check if logged in (stub for now)
 */
async function isLoggedIn(): Promise<boolean> {
	try {
		const { isLoggedIn: checkLoggedIn } = await import(
			'../../../auth/config-store'
		);
		return checkLoggedIn();
	} catch {
		return false;
	}
}

/**
 * Get selected instance ID (stub for now)
 */
async function getSelectedInstanceId(): Promise<string | null> {
	try {
		const { getSelectedInstanceId: getId } = await import(
			'../../../auth/config-store'
		);
		return getId();
	} catch {
		return null;
	}
}

/**
 * Create MCP client from config (stub for now)
 */
async function createMCPClientFromConfig(_baseUrl: string): Promise<{
	listInstances: () => Promise<Instance[]>;
	close: () => Promise<void>;
} | null> {
	// This will be implemented when MCP is fully integrated
	return null;
}

/**
 * Instance selection result
 */
export interface InstanceSelectionResult {
	/** Selected instance or null if manual URL */
	instance: Instance | null;
	/** Backend URL to use */
	backendUrl: string;
	/** Whether user wants to sign up */
	wantSignup?: boolean;
}

/**
 * Prompt for c15t instance selection
 *
 * If logged in, shows instance picker.
 * If not logged in, offers: login / manual URL / signup
 */
export async function promptForInstance(
	context: CliContext
): Promise<InstanceSelectionResult> {
	const { logger } = context;

	// Check if user is logged in
	const authenticated = await isLoggedIn();

	if (authenticated) {
		// Show instance picker
		return promptInstancePicker(context);
	}

	// Not logged in - offer options
	logger.message('');
	logger.message(color.bold('Connect to consent.io'));
	logger.message(color.dim('Store consent data securely in the cloud'));
	logger.message('');

	const choice = await p.select({
		message: 'How would you like to proceed?',
		options: [
			{
				value: 'login',
				label: 'Log in',
				hint: 'Connect to your existing account',
			},
			{
				value: 'manual',
				label: 'Enter URL manually',
				hint: 'I have my instance URL',
			},
			{
				value: 'signup',
				label: 'Create an account',
				hint: 'Get started with consent.io',
			},
		],
	});

	if (p.isCancel(choice)) {
		context.error.handleCancel('Instance selection cancelled');
	}

	switch (choice) {
		case 'login':
			// TODO: Import and run login flow when auth module is integrated
			// For now, fall through to manual URL entry
			context.logger.warn(
				'Login flow not yet integrated, using manual URL entry'
			);
			return promptManualUrl(context);

		case 'manual':
			return promptManualUrl(context);

		case 'signup':
			return {
				instance: null,
				backendUrl: '',
				wantSignup: true,
			};

		default:
			context.error.handleCancel();
	}
}

/**
 * Show instance picker for logged-in users
 */
async function promptInstancePicker(
	context: CliContext
): Promise<InstanceSelectionResult> {
	const { logger } = context;

	const spinner = createTaskSpinner('Fetching your instances...');
	spinner.start();

	try {
		const client = await createMCPClientFromConfig(URLS.CONSENT_IO);
		if (!client) {
			spinner.stop();
			// Session expired, redirect to manual entry
			logger.warn(
				'Session expired. Please log in again or enter URL manually.'
			);
			return promptManualUrl(context);
		}

		const instances = await client.listInstances();
		await client.close();

		spinner.stop();

		if (instances.length === 0) {
			logger.message('');
			logger.message("You don't have any instances yet.");

			const shouldCreate = await p.confirm({
				message: 'Would you like to create one now?',
				initialValue: true,
			});

			if (p.isCancel(shouldCreate) || !shouldCreate) {
				return promptManualUrl(context);
			}

			// TODO: Create new instance when instances module is integrated
			context.logger.warn(
				'Instance creation not yet integrated, using manual URL entry'
			);
			return promptManualUrl(context);
		}

		const currentId = await getSelectedInstanceId();

		logger.message('');
		const result = await p.select({
			message: 'Select an instance for this project:',
			options: [
				...instances.map((instance) => ({
					value: instance.id,
					label: instance.name,
					hint:
						instance.id === currentId
							? color.green('(currently selected)')
							: instance.url,
				})),
				{
					value: '_manual',
					label: 'Enter URL manually',
					hint: 'Use a different instance',
				},
			],
		});

		if (p.isCancel(result)) {
			context.error.handleCancel('Instance selection cancelled');
		}

		if (result === '_manual') {
			return promptManualUrl(context);
		}

		const selectedInstance = instances.find((i) => i.id === result)!;

		return {
			instance: selectedInstance,
			backendUrl: selectedInstance.url,
		};
	} catch (error) {
		spinner.stop();
		logger.warn('Could not fetch instances. Falling back to manual entry.');
		return promptManualUrl(context);
	}
}

/**
 * Prompt for manual URL entry
 */
async function promptManualUrl(
	context: CliContext
): Promise<InstanceSelectionResult> {
	const { logger } = context;

	logger.message('');
	const url = await p.text({
		message: 'Enter your c15t instance URL:',
		placeholder: 'https://my-app.c15t.dev',
		validate: validateUrl,
	});

	if (p.isCancel(url)) {
		context.error.handleCancel('URL entry cancelled');
	}

	return {
		instance: null,
		backendUrl: normalizeUrl(url),
	};
}
