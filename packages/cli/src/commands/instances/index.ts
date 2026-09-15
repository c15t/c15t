import * as p from '@clack/prompts';

import { getSelectedInstanceId, setSelectedInstanceId } from '../../auth';
import type { CliCommand, CliContext } from '../../context/types';
import {
	createControlPlaneClientFromConfig,
	createProject,
	resolveInstance,
} from '../../control-plane';
import { CliError } from '../../core/errors';
import { TelemetryEventName } from '../../core/telemetry';
import { validateInstanceName } from '../../utils/validation';

const getClient = async () => {
	const client = await createControlPlaneClientFromConfig();
	if (!client) {
		throw new CliError('AUTH_NOT_LOGGED_IN');
	}
	return client;
};
const flag = (context: CliContext, name: string): string | undefined => {
	const value = context.flags[name];
	return typeof value === 'string' ? value : undefined;
};
const selectedValue = <Value>(value: Value | symbol): Value => {
	if (p.isCancel(value)) {
		throw new CliError('CANCELLED');
	}
	return value as Value;
};
const requireInteractive = (context: CliContext, needed: string) => {
	if (context.flags['non-interactive']) {
		throw new CliError('CONFIG_INVALID', {
			details: `Supply ${needed} in noninteractive mode.`,
		});
	}
};

export const listAction = async (context: CliContext) => {
	const projects = await (await getClient()).listInstances();
	const selectedProject = await getSelectedInstanceId();
	for (const project of projects) {
		context.logger.message(
			`${project.organizationSlug ? `${project.organizationSlug}/` : ''}${project.name} (${project.id}) ${project.status}${project.id === selectedProject ? ' [selected]' : ''}`
		);
	}
	if (!projects.length) {
		context.logger.info(
			'No projects found. Run c15t projects create to create one.'
		);
	}
	context.telemetry.trackEvent(TelemetryEventName.PROJECTS_LISTED, {
		count: projects.length,
	});
	return { projects, selectedProject };
};

export const selectAction = async (context: CliContext) => {
	const projects = await (await getClient()).listInstances();
	if (!projects.length) {
		throw new CliError('INSTANCE_NOT_FOUND', {
			details: 'No projects available. Create one first.',
		});
	}
	let query = flag(context, 'project') ?? context.commandArgs[0];
	if (!query) {
		requireInteractive(context, '--project <id|organization/name>');
		query = selectedValue(
			await p.select({
				initialValue: (await getSelectedInstanceId()) ?? undefined,
				message: 'Select the default project for setup:',
				options: projects.map((project) => ({
					label: `${project.organizationSlug ?? ''}/${project.name}`,
					value: project.id,
				})),
			})
		);
	}
	const project = resolveInstance(query, projects);
	await setSelectedInstanceId(project.id);
	context.telemetry.trackEvent(TelemetryEventName.PROJECT_SELECTED, {
		projectId: project.id,
	});
	context.logger.success(`Selected default project: ${project.name}`);
	return { project };
};

export const createAction = async (context: CliContext) => {
	let name = flag(context, 'name') ?? context.commandArgs[0];
	let organizationSlug = flag(context, 'organization');
	let region = flag(context, 'region');
	if (!name || !organizationSlug || !region) {
		requireInteractive(context, '--name, --organization and --region');
	}
	const client = await getClient();
	if (!name) {
		name = selectedValue(
			await p.text({
				message: 'Project slug:',
				validate: (value) => validateInstanceName(value?.trim() ?? ''),
			})
		);
	}
	if (!organizationSlug) {
		const organizations = await client.listOrganizations();
		if (!organizations.length) {
			throw new CliError('API_ERROR', {
				details: 'No organizations available to this account',
			});
		}
		organizationSlug = selectedValue(
			await p.select({
				message: 'Organization:',
				options: organizations.map((organization) => ({
					label: organization.organizationName,
					value: organization.organizationSlug,
				})),
			})
		);
	}
	if (!region) {
		const regions = (await client.listRegions()).filter(
			(item) => item.family === 'v2'
		);
		if (!regions.length) {
			throw new CliError('API_ERROR', {
				details: 'No v2 provisioning regions available',
			});
		}
		region = selectedValue(
			await p.select({
				message: 'Region:',
				options: regions.map((item) => ({ label: item.label, value: item.id })),
			})
		);
	}
	const project = await createProject(client, {
		config: { organizationSlug, region },
		name,
	});
	await setSelectedInstanceId(project.id);
	context.telemetry.trackEvent(TelemetryEventName.PROJECT_CREATED, {
		projectId: project.id,
	});
	context.logger.success(
		`Created development project ${project.name} (${project.id}). Status: ${project.status}.`
	);
	context.logger.info(
		'Enable production mode in the Inth dashboard when ready. This is now the default project for setup.'
	);
	return { project };
};

export const projectsAction = (context: CliContext): Promise<unknown> => {
	const [subcommand = 'list', ...args] = context.commandArgs;
	const allowedFlags: string[] = [];
	if (subcommand === 'create') {
		allowedFlags.push('name', 'organization', 'region');
	}
	if (subcommand === 'select') {
		allowedFlags.push('project');
	}
	for (const name of ['name', 'organization', 'region', 'project']) {
		if (context.flags[name] !== undefined && !allowedFlags.includes(name)) {
			throw new CliError('FLAG_INVALID', {
				details: `--${name} is not supported by projects ${subcommand}.`,
			});
		}
	}
	if ((subcommand === 'list' && args.length > 0) || args.length > 1) {
		throw new CliError('FLAG_INVALID', {
			details: `Unexpected argument for projects ${subcommand}: ${args.join(' ')}`,
		});
	}
	const namedInput = flag(
		context,
		subcommand === 'create' ? 'name' : 'project'
	);
	if (namedInput && args[0] && namedInput !== args[0]) {
		throw new CliError('FLAG_INVALID', {
			details:
				'The positional project and named flag disagree. Supply one project.',
		});
	}

	const childContext = { ...context, commandArgs: args };
	switch (subcommand) {
		case 'list':
			return listAction(childContext);
		case 'select':
			return selectAction(childContext);
		case 'create':
			return createAction(childContext);
		default:
			throw new CliError('COMMAND_NOT_FOUND', {
				details: `Unknown projects subcommand: ${subcommand}`,
			});
	}
};
export const projectsCommand: CliCommand = {
	action: projectsAction,
	description: 'List, select and create hosted projects',
	hint: 'Manage hosted projects',
	label: 'Projects',
	name: 'projects',
	subcommands: [
		{
			action: listAction,
			description: 'List hosted projects',
			hint: 'List projects',
			label: 'List',
			name: 'list',
		},
		{
			action: selectAction,
			description: 'Select the account default project used by setup',
			hint: 'Select default project',
			label: 'Select',
			name: 'select',
		},
		{
			action: createAction,
			description: 'Create and select a development project',
			hint: 'Create project',
			label: 'Create',
			name: 'create',
		},
	],
};
export const instancesAliasCommand: CliCommand = {
	...projectsCommand,
	description: 'Alias for c15t projects',
	hidden: true,
	label: 'Instances',
	name: 'instances',
};
