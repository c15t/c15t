/**
 * Project management commands
 */

import * as p from '@clack/prompts';
import {
	getControlPlaneBaseUrl,
	getSelectedInstanceId,
	isLoggedIn,
	setSelectedInstanceId,
} from '../../auth';
import type { CliCommand, CliContext } from '../../context/types';
import { createControlPlaneClientFromConfig } from '../../control-plane';
import { CliError } from '../../core/errors';
import { color } from '../../core/logger';
import { TelemetryEventName } from '../../core/telemetry';
import type { Instance } from '../../types';
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
		context.logger.error('You must be logged in to manage projects');
		context.logger.message(`Run ${color.cyan('c15t login')} to authenticate`);
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}
}

/**
 * List projects command
 */
async function listAction(context: CliContext): Promise<void> {
	const { logger, telemetry } = context;
	const baseUrl = getControlPlaneBaseUrl();

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching projects...');
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

		telemetry.trackEvent(TelemetryEventName.PROJECTS_LISTED, {
			count: instances.length,
		});

		if (instances.length === 0) {
			logger.message('');
			logger.message('No projects found.');
			logger.message('');
			logger.message(`Run ${color.cyan('c15t projects create')} to create one`);
			return;
		}

		const selectedId = await getSelectedInstanceId();

		logger.message('');
		logger.message(color.bold('Your projects:'));
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
			logger.message(color.dim('▸ indicates the currently selected project'));
		}
	} catch (error) {
		spinner.stop();
		throw error;
	}
}

/**
 * Select project command
 */
async function selectAction(context: CliContext): Promise<void> {
	const { logger, telemetry, commandArgs } = context;
	const baseUrl = getControlPlaneBaseUrl();

	await requireAuth(context);

	const spinner = createTaskSpinner('Fetching projects...');
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
			logger.message('No projects found.');
			logger.message(`Run ${color.cyan('c15t projects create')} to create one`);
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
					details: `No project found with ID, name, or org/name: ${query}`,
				});
			}

			selectedInstance = found;
		} else {
			// Interactive selection
			const currentId = await getSelectedInstanceId();

			const result = await p.select({
				message: 'Select a project:',
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

		telemetry.trackEvent(TelemetryEventName.PROJECT_SELECTED, {
			projectId: selectedInstance.id,
		});

		logger.success(
			`Selected project: ${color.cyan(formatInstanceLabel(selectedInstance))}`
		);
		logger.message(`Region: ${formatInstanceRegion(selectedInstance)}`);
	} catch (error) {
		spinner.stop();
		throw error;
	}
}

/**
 * Create project command
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
					details: 'Project slug is required',
				});
			}

			const error = validateInstanceName(providedName);
			if (error) {
				throw new CliError('INSTANCE_NAME_INVALID', { details: error });
			}

			name = providedName;
		} else {
			const result = await p.text({
				message: 'Project slug:',
				placeholder: 'my-app',
				validate: (value) => validateInstanceName(value?.trim() ?? ''),
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

		const spinner = createTaskSpinner(`Creating project "${name}"...`);
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
			spinner.success('Project created');
		} catch (error) {
			spinner.error('Failed to create project');
			throw error;
		}

		telemetry.trackEvent(TelemetryEventName.PROJECT_CREATED, {
			projectId: instance.id,
		});

		logger.message('');
		logger.message(`Name: ${color.bold(instance.name)}`);
		logger.message(`ID: ${color.dim(instance.id)}`);
		logger.message(`URL: ${color.cyan(instance.url)}`);
		logger.message('');
		logger.info(
			'Created as a v2 development project. Enable production mode in the dashboard when you are ready.'
		);

		// Ask if user wants to select this project
		const shouldSelect = await p.confirm({
			message: 'Would you like to use this project for your project?',
			initialValue: true,
		});

		if (shouldSelect && !p.isCancel(shouldSelect)) {
			await setSelectedInstanceId(instance.id);
			logger.info('Project selected');
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
 * Main projects command (defaults to list)
 */
async function projectsAction(context: CliContext): Promise<void> {
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
 * Projects command definition
 */
export const projectsCommand: CliCommand = {
	name: 'projects',
	label: 'Projects',
	hint: 'Manage your c15t projects',
	description: 'List, select, and create c15t projects',
	action: projectsAction,
	subcommands: [
		{
			name: 'list',
			label: 'List',
			hint: 'List all projects',
			description: 'List all c15t projects for your account',
			action: listAction,
		},
		{
			name: 'select',
			label: 'Select',
			hint: 'Select a project',
			description: 'Select a project for your local project',
			action: selectAction,
		},
		{
			name: 'create',
			label: 'Create',
			hint: 'Create a new project',
			description: 'Create a new c15t project',
			action: createAction,
		},
	],
};

export const instancesAliasCommand: CliCommand = {
	...projectsCommand,
	name: 'instances',
	label: 'Instances',
	description: 'Alias for `c15t projects`',
	hidden: true,
};

export { createAction, listAction, projectsAction, selectAction };
