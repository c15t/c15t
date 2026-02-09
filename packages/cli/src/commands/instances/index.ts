/**
 * Instance management commands
 */

import * as p from '@clack/prompts';
import {
	getSelectedInstanceId,
	isLoggedIn,
	setSelectedInstanceId,
} from '../../auth';
import { URLS } from '../../constants';
import { CliError } from '../../core/errors';
import { color } from '../../core/logger';
import { TelemetryEventName } from '../../core/telemetry';
import { createMCPClientFromConfig } from '../../mcp';
import type { CliCommand, CliContext, Instance } from '../../types';
import { createTaskSpinner } from '../../utils/spinner';
import { validateInstanceName } from '../../utils/validation';

/**
 * Ensure user is logged in
 */
async function requireAuth(context: CliContext): Promise<void> {
	if (!(await isLoggedIn())) {
		context.logger.error('You must be logged in to manage instances');
		context.logger.message(`Run ${color.cyan('c15t login')} to authenticate`);
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}
}

/**
 * List instances command
 */
async function listAction(context: CliContext): Promise<void> {
	const { logger, telemetry } = context;

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching instances...');
	spinner.start();

	try {
		const client = await createMCPClientFromConfig(URLS.CONSENT_IO);
		if (!client) {
			spinner.stop();
			throw new CliError('AUTH_NOT_LOGGED_IN');
		}

		const instances = await client.listInstances();
		await client.close();

		spinner.stop();

		telemetry.trackEvent(TelemetryEventName.INSTANCES_LISTED, {
			count: instances.length,
		});

		if (instances.length === 0) {
			logger.message('');
			logger.message('No instances found.');
			logger.message('');
			logger.message(
				`Run ${color.cyan('c15t instances create')} to create one`
			);
			return;
		}

		const selectedId = await getSelectedInstanceId();

		logger.message('');
		logger.message(color.bold('Your instances:'));
		logger.message('');

		for (const instance of instances) {
			const isSelected = instance.id === selectedId;
			const status = getStatusColor(instance.status);
			const marker = isSelected ? color.green('▸ ') : '  ';

			logger.message(
				`${marker}${color.bold(instance.name)} ${color.dim(`(${instance.id})`)}`
			);
			logger.message(`    URL: ${color.cyan(instance.url)}`);
			logger.message(`    Status: ${status}`);
			logger.message('');
		}

		if (selectedId) {
			logger.message(color.dim('▸ indicates the currently selected instance'));
		}
	} catch (error) {
		spinner.stop();
		throw error;
	}
}

/**
 * Select instance command
 */
async function selectAction(context: CliContext): Promise<void> {
	const { logger, telemetry, commandArgs } = context;

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching instances...');
	spinner.start();

	try {
		const client = await createMCPClientFromConfig(URLS.CONSENT_IO);
		if (!client) {
			spinner.stop();
			throw new CliError('AUTH_NOT_LOGGED_IN');
		}

		const instances = await client.listInstances();
		await client.close();

		spinner.stop();

		if (instances.length === 0) {
			logger.message('No instances found.');
			logger.message(
				`Run ${color.cyan('c15t instances create')} to create one`
			);
			return;
		}

		let selectedInstance: Instance;

		// Check if instance ID/name was provided as argument
		if (commandArgs.length > 0) {
			const query = commandArgs[0]!;
			const found = instances.find((i) => i.id === query || i.name === query);

			if (!found) {
				throw new CliError('INSTANCE_NOT_FOUND', {
					details: `No instance found with ID or name: ${query}`,
				});
			}

			selectedInstance = found;
		} else {
			// Interactive selection
			const currentId = await getSelectedInstanceId();

			const result = await p.select({
				message: 'Select an instance:',
				options: instances.map((instance) => ({
					value: instance.id,
					label: instance.name,
					hint:
						instance.id === currentId ? '(currently selected)' : instance.url,
				})),
			});

			if (p.isCancel(result)) {
				logger.info('Selection cancelled');
				return;
			}

			selectedInstance = instances.find((i) => i.id === result)!;
		}

		await setSelectedInstanceId(selectedInstance.id);

		telemetry.trackEvent(TelemetryEventName.INSTANCE_SELECTED, {
			instanceId: selectedInstance.id,
		});

		logger.success(`Selected instance: ${color.cyan(selectedInstance.name)}`);
		logger.message(`URL: ${selectedInstance.url}`);
	} catch (error) {
		spinner.stop();
		throw error;
	}
}

/**
 * Create instance command
 */
async function createAction(context: CliContext): Promise<void> {
	const { logger, telemetry, commandArgs } = context;

	await requireAuth(context);

	let name: string;

	// Check if name was provided as argument
	if (commandArgs.length > 0) {
		name = commandArgs[0]!;
		const error = validateInstanceName(name);
		if (error) {
			throw new CliError('INSTANCE_NAME_INVALID', { details: error });
		}
	} else {
		// Interactive name input
		const result = await p.text({
			message: 'Instance name:',
			placeholder: 'my-app',
			validate: validateInstanceName,
		});

		if (p.isCancel(result)) {
			logger.info('Creation cancelled');
			return;
		}

		name = result;
	}

	const spinner = createTaskSpinner(`Creating instance "${name}"...`);
	spinner.start();

	try {
		const client = await createMCPClientFromConfig(URLS.CONSENT_IO);
		if (!client) {
			spinner.stop();
			throw new CliError('AUTH_NOT_LOGGED_IN');
		}

		const instance = await client.createInstance({ name });
		await client.close();

		spinner.success('Instance created');

		telemetry.trackEvent(TelemetryEventName.INSTANCE_CREATED, {
			instanceId: instance.id,
		});

		logger.message('');
		logger.message(`Name: ${color.bold(instance.name)}`);
		logger.message(`ID: ${color.dim(instance.id)}`);
		logger.message(`URL: ${color.cyan(instance.url)}`);
		logger.message('');

		// Ask if user wants to select this instance
		const shouldSelect = await p.confirm({
			message: 'Would you like to use this instance for your project?',
			initialValue: true,
		});

		if (shouldSelect && !p.isCancel(shouldSelect)) {
			await setSelectedInstanceId(instance.id);
			logger.info('Instance selected');
		}
	} catch (error) {
		spinner.stop();
		throw error;
	}
}

/**
 * Get colored status string
 */
function getStatusColor(status: Instance['status']): string {
	switch (status) {
		case 'active':
			return color.green('active');
		case 'inactive':
			return color.yellow('inactive');
		case 'pending':
			return color.blue('pending');
		default:
			return status;
	}
}

/**
 * Main instances command (defaults to list)
 */
async function instancesAction(context: CliContext): Promise<void> {
	const { commandArgs } = context;

	// Check for subcommand
	const subcommand = commandArgs[0];

	switch (subcommand) {
		case 'list':
			context.commandArgs = commandArgs.slice(1);
			return listAction(context);
		case 'select':
			context.commandArgs = commandArgs.slice(1);
			return selectAction(context);
		case 'create':
			context.commandArgs = commandArgs.slice(1);
			return createAction(context);
		default:
			// Default to list
			return listAction(context);
	}
}

/**
 * Instances command definition
 */
export const instancesCommand: CliCommand = {
	name: 'instances',
	label: 'Instances',
	hint: 'Manage your c15t instances',
	description: 'List, select, and create c15t instances',
	action: instancesAction,
	subcommands: [
		{
			name: 'list',
			label: 'List',
			hint: 'List all instances',
			description: 'List all c15t instances for your account',
			action: listAction,
		},
		{
			name: 'select',
			label: 'Select',
			hint: 'Select an instance',
			description: 'Select an instance for your project',
			action: selectAction,
		},
		{
			name: 'create',
			label: 'Create',
			hint: 'Create a new instance',
			description: 'Create a new c15t instance',
			action: createAction,
		},
	],
};

export { listAction, selectAction, createAction };
