import { generate, parseGenerateOptions } from '../generate';
import type { GenerateOptions, GenerationPlan } from '../generate';
import {
	listProjects,
	requireProjectBackendURL,
	resolveProject,
	selectProject,
} from './projects';
import type { HostedProject, ProjectListResult } from './projects';
import { getAuthenticationStatus } from './status';
import type { AuthenticationSnapshot, AuthenticationStatus } from './status';

export {
	listProjects,
	requireProjectBackendURL,
	resolveProject,
	selectProject,
} from './projects';
export type { HostedProject, ProjectListResult } from './projects';
export { getAuthenticationStatus } from './status';
export type { AuthenticationSnapshot, AuthenticationStatus } from './status';

/** Explicit frontend state supplied by Inth or a standalone CLI adapter. */
export interface FrontendCommandContext {
	/** Generation defaults. Mode defaults to hosted; framework must be supplied. */
	generation?: Partial<GenerateOptions>;
	/** Already-fetched projects; omitted when the host supplies a backend URL directly. */
	projects?: HostedProject[];
	/** Selected project ID or organization/name, used when no backend URL is supplied. */
	selectedProject?: string;
	/** Already-resolved session state. No tokens are accepted or returned. */
	authentication?: AuthenticationSnapshot;
}

/** Frontend command data. The host owns serialization, writes, and persistence. */
export type FrontendCommandResult =
	| { command: 'generate' | 'setup'; data: GenerationPlan }
	| { command: 'projects list'; data: ProjectListResult }
	| {
			command: 'projects select';
			data: { project: HostedProject; selectedProject: string };
	  }
	| { command: 'status'; data: AuthenticationStatus };

const runProjectCommand = (
	commandArgs: string[],
	context: FrontendCommandContext
): FrontendCommandResult => {
	if (!context.projects) {
		throw new Error(
			'Supply projects from the host before running project commands.'
		);
	}
	const [subcommand = 'list', query, ...extra] = commandArgs;
	if (subcommand === 'list' && commandArgs.length <= 1) {
		return {
			command: 'projects list',
			data: listProjects(context.projects, context.selectedProject),
		};
	}
	if (
		subcommand === 'select' &&
		query &&
		!query.startsWith('-') &&
		!extra.length
	) {
		return {
			command: 'projects select',
			data: selectProject(query, context.projects),
		};
	}
	throw new Error(
		'Use projects list or projects select <id|organization/name>. The host owns project creation.'
	);
};

/**
 * Dispatch frontend commands with explicit host state and no runtime dependencies.
 * @param args Arguments after the host's c15t namespace.
 * @param context Generation defaults, projects, and session state supplied by the host.
 * @returns A generation plan, project selection/list, or account status.
 * @throws {Error} When arguments or required host state are invalid or unavailable.
 * @example
 * const result = runFrontendCommand(['setup', '--framework', 'react'], {
 *   generation: { backendURL: 'https://consent.example.com' },
 * });
 */
export const runFrontendCommand = (
	args: string[],
	context: FrontendCommandContext = {}
): FrontendCommandResult => {
	const [command, ...commandArgs] = args;
	if (command === 'generate' || command === 'setup') {
		const options = parseGenerateOptions(commandArgs, {
			...context.generation,
			mode: context.generation?.mode ?? 'hosted',
		});
		if (
			options.mode === 'hosted' &&
			!options.backendURL &&
			context.selectedProject
		) {
			if (!context.projects) {
				throw new Error(
					'Supply projects from the host to resolve the selected backend.'
				);
			}
			options.backendURL = requireProjectBackendURL(
				resolveProject(context.selectedProject, context.projects)
			);
		}
		return { command, data: generate(options) };
	}
	if (command === 'projects') {
		return runProjectCommand(commandArgs, context);
	}
	if (command === 'status') {
		if (commandArgs.length || !context.authentication) {
			throw new Error(
				'Status accepts no arguments and requires session state from the host.'
			);
		}
		return {
			command: 'status',
			data: getAuthenticationStatus(context.authentication),
		};
	}
	throw new Error(
		'Use setup, generate, projects list, projects select, or status.'
	);
};
