/**
 * Instance management commands
 */

import * as p from '@clack/prompts';
import {
	getControlPlaneBaseUrl,
	getSelectedInstanceId,
	isLoggedIn,
	setSelectedInstanceId,
} from '../../auth';
import { createControlPlaneClientFromConfig } from '../../control-plane';
import { CliError } from '../../core/errors';
import { color } from '../../core/logger';
import { TelemetryEventName } from '../../core/telemetry';
import type { CliCommand, CliContext, Instance } from '../../types';
import { createTaskSpinner } from '../../utils/spinner';
import { validateInstanceName } from '../../utils/validation';

function formatInstanceLabel(instance: Instance): string {
	if (instance.organizationSlug) {
		return `${instance.organizationSlug}/${instance.name}`;
	}
	return instance.name;
}

function formatInstanceRegion(instance: Instance): string {
	return `(${instance.region ?? 'unknown'})`;
}

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
	const baseUrl = getControlPlaneBaseUrl();

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching instances...');
	spinner.start();

	try {
		const client = await createControlPlaneClientFromConfig(baseUrl);
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
			const label = formatInstanceLabel(instance);

			logger.message(
				`${marker}${color.bold(label)} ${color.dim(`(${instance.id})`)}`
			);
			logger.message(
				`    Region: ${color.cyan(formatInstanceRegion(instance))}`
			);
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
	const baseUrl = getControlPlaneBaseUrl();

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching instances...');
	spinner.start();

	try {
		const client = await createControlPlaneClientFromConfig(baseUrl);
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
			const found = instances.find(
				(i) =>
					i.id === query || i.name === query || formatInstanceLabel(i) === query
			);

			if (!found) {
				throw new CliError('INSTANCE_NOT_FOUND', {
					details: `No instance found with ID, name, or org/name: ${query}`,
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
					label: formatInstanceLabel(instance),
					hint:
						instance.id === currentId
							? `(currently selected) • ${formatInstanceRegion(instance)}`
							: formatInstanceRegion(instance),
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

		logger.success(
			`Selected instance: ${color.cyan(formatInstanceLabel(selectedInstance))}`
		);
		logger.message(`Region: ${formatInstanceRegion(selectedInstance)}`);
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
	const baseUrl = getControlPlaneBaseUrl();

	await requireAuth(context);

	const client = await createControlPlaneClientFromConfig(baseUrl);
	if (!client) {
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}

	try {
		const preloadSpinner = createTaskSpinner(
			'Loading organizations and regions...'
		);
		preloadSpinner.start();
		let organizations: Awaited<ReturnType<typeof client.listOrganizations>>;
		let regions: Awaited<ReturnType<typeof client.listRegions>>;
		try {
			[organizations, regions] = await Promise.all([
				client.listOrganizations(),
				client.listRegions(),
			]);
		} finally {
			preloadSpinner.stop();
		}

		if (organizations.length === 0) {
			throw new CliError('API_ERROR', {
				details: 'No organizations available for this account',
			});
		}

		if (regions.length === 0) {
			throw new CliError('API_ERROR', {
				details: 'No provisioning regions available',
			});
		}

		let name: string;
		if (commandArgs.length > 0) {
			const providedName = commandArgs[0];
			if (!providedName) {
				throw new CliError('INSTANCE_NAME_INVALID', {
					details: 'Instance name is required',
				});
			}

			const error = validateInstanceName(providedName);
			if (error) {
				throw new CliError('INSTANCE_NAME_INVALID', { details: error });
			}

			name = providedName;
		} else {
			const result = await p.text({
				message: 'Instance slug:',
				placeholder: 'my-app',
				validate: (value) => validateInstanceName(value.trim()),
			});

			if (p.isCancel(result)) {
				logger.info('Creation cancelled');
				return;
			}

			name = result;
		}

		name = name.trim();
		const nameValidationError = validateInstanceName(name);
		if (nameValidationError) {
			throw new CliError('INSTANCE_NAME_INVALID', {
				details: nameValidationError,
			});
		}

		const orgSelection = await p.select<string | symbol>({
			message: 'Select organization:',
			options: organizations.map((org) => ({
				value: org.organizationSlug,
				label: org.organizationName,
				hint: `${org.organizationSlug} • ${org.role}`,
			})),
			initialValue: organizations[0]?.organizationSlug,
		});

		if (p.isCancel(orgSelection)) {
			logger.info('Creation cancelled');
			return;
		}

		const v2Regions = regions.filter((region) => region.family === 'v2');
		if (v2Regions.length === 0) {
			throw new CliError('API_ERROR', {
				details: 'No v2 provisioning regions available',
			});
		}

		const regionSelection = await p.select<string | symbol>({
			message: 'Select V2 region:',
			options: v2Regions.map((region) => ({
				value: region.id,
				label: region.id,
				hint: region.label,
			})),
			initialValue: v2Regions.find((region) => region.id === 'us-east-1')?.id,
		});

		if (p.isCancel(regionSelection)) {
			logger.info('Creation cancelled');
			return;
		}

		const spinner = createTaskSpinner(`Creating instance "${name}"...`);
		spinner.start();
		let instance: Instance;
		try {
			instance = await client.createInstance({
				name,
				config: {
					organizationSlug: orgSelection,
					region: regionSelection,
				},
			});
			spinner.success('Instance created');
		} catch (error) {
			spinner.error('Failed to create instance');
			throw error;
		}

		telemetry.trackEvent(TelemetryEventName.INSTANCE_CREATED, {
			instanceId: instance.id,
		});

		logger.message('');
		logger.message(`Name: ${color.bold(instance.name)}`);
		logger.message(`ID: ${color.dim(instance.id)}`);
		logger.message(`URL: ${color.cyan(instance.url)}`);
		logger.message('');
		logger.info(
			'Created as a v2 development instance. Enable production mode in the dashboard when you are ready.'
		);

		// Ask if user wants to select this instance
		const shouldSelect = await p.confirm({
			message: 'Would you like to use this instance for your project?',
			initialValue: true,
		});

		if (shouldSelect && !p.isCancel(shouldSelect)) {
			await setSelectedInstanceId(instance.id);
			logger.info('Instance selected');
		}
	} finally {
		await client.close();
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
