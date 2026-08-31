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

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

const formatInstanceLabel = function formatInstanceLabel(
	instance: Instance
): string {
	if (instance.organizationSlug) {
		return `${instance.organizationSlug}/${instance.name}`;
	}
	return instance.name;
};

const formatInstanceRegion = function formatInstanceRegion(
	instance: Instance
): string {
	return `(${instance.region ?? 'unknown'})`;
};

/**
 * Ensure user is logged in
 */
const requireAuth = async function requireAuth(
	context: CliContext
): Promise<void> {
	if (!(await isLoggedIn())) {
		context.logger.error('You must be logged in to manage projects');
		context.logger.message(`Run ${color.cyan('c15t login')} to authenticate`);
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}
};

/**
 * Get colored status string
 */
const getStatusColor = function getStatusColor(
	status: Instance['status']
): string {
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
};

/**
 * List projects command
 */
const listAction = async function listAction(
	context: CliContext
): Promise<void> {
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
};

/**
 * Select project command
 */
const selectAction = async function selectAction(
	context: CliContext
): Promise<void> {
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
			const query = getDefined(commandArgs[0]);
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
					hint:
						instance.id === currentId
							? `(currently selected) • ${formatInstanceRegion(instance)}`
							: formatInstanceRegion(instance),
					label: formatInstanceLabel(instance),
					value: instance.id,
				})),
			});

			if (p.isCancel(result)) {
				logger.info('Selection cancelled');
				return;
			}

			selectedInstance = getDefined(instances.find((i) => i.id === result));
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
};

/**
 * Create project command
 */
const createAction = async function createAction(
	context: CliContext
): Promise<void> {
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
			// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
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
			initialValue: organizations[0]?.organizationSlug,
			message: 'Select organization:',
			options: organizations.map((org) => ({
				hint: `${org.organizationSlug} • ${org.role}`,
				label: org.organizationName,
				value: org.organizationSlug,
			})),
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
			initialValue: v2Regions.find((region) => region.id === 'us-east-1')?.id,
			message: 'Select V2 region:',
			options: v2Regions.map((region) => ({
				hint: region.label,
				label: region.id,
				value: region.id,
			})),
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
				config: {
					organizationSlug: orgSelection,
					region: regionSelection,
				},
				name,
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
			initialValue: true,
			message: 'Would you like to use this project for your project?',
		});

		if (shouldSelect && !p.isCancel(shouldSelect)) {
			await setSelectedInstanceId(instance.id);
			logger.info('Project selected');
		}
	} finally {
		await client.close();
	}
};

/**
 * Main projects command (defaults to list)
 */
const projectsAction = function projectsAction(
	context: CliContext
): Promise<void> {
	const { commandArgs } = context;

	// Check for subcommand
	// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
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
};

/**
 * Projects command definition
 */
export const projectsCommand: CliCommand = {
	action: projectsAction,
	description: 'List, select, and create c15t projects',
	hint: 'Manage your c15t projects',
	label: 'Projects',
	name: 'projects',
	subcommands: [
		{
			action: listAction,
			description: 'List all c15t projects for your account',
			hint: 'List all projects',
			label: 'List',
			name: 'list',
		},
		{
			action: selectAction,
			description: 'Select a project for your local project',
			hint: 'Select a project',
			label: 'Select',
			name: 'select',
		},
		{
			action: createAction,
			description: 'Create a new c15t project',
			hint: 'Create a new project',
			label: 'Create',
			name: 'create',
		},
	],
};

export const instancesAliasCommand: CliCommand = {
	...projectsCommand,
	description: 'Alias for `c15t projects`',
	hidden: true,
	label: 'Instances',
	name: 'instances',
};

export { createAction, listAction, projectsAction, selectAction };
