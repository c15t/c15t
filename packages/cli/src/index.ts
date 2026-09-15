import path from 'node:path';

import * as p from '@clack/prompts';

import { formatHelp, getCommandHelp } from './actions/show-help-menu';
import { commands as defaultCommands } from './commands/registry';
import { createCliContext } from './context/creator';
import { parseCliArgs } from './context/parser';
import type { CliCommand, CliContext } from './context/types';
import { CliError } from './core/errors';
import { packageInfo } from './package-info';
import { createCliLogger } from './utils/logger';
import type { CliLogger } from './utils/logger';
import { TelemetryEventName } from './utils/telemetry';

export interface CliResult {
	schemaVersion: 1;
	success: boolean;
	command?: string;
	exitCode: number;
	data?: unknown;
	error?: { code: string; message: string; hint?: string };
}
export interface RunCliOptions {
	/** Project directory. The caller's working directory is never changed. */
	cwd?: string;
	/** Enable terminal prompts. Defaults to false for library callers. */
	interactive?: boolean;
	/** Receive human diagnostics separately from returned data. */
	logger?: CliLogger;
	/** Opt into CLI telemetry. Disabled by default for library callers. */
	telemetry?: boolean;
	/** Override command registration when embedding or testing the runner. */
	commands?: CliCommand[];
}

const selectCommand = async (commands: CliCommand[]): Promise<string> => {
	const selected = await p.select({
		message: 'Choose a command',
		options: commands
			.filter((command) => !command.hidden && !command.hiddenFromMenu)
			.map((command) => ({
				hint: command.hint,
				label: command.label,
				value: command.name,
			})),
	});
	if (p.isCancel(selected)) {
		throw new CliError('CANCELLED');
	}
	return selected;
};

const failureResult = (
	error: unknown,
	logger: CliLogger,
	command?: string
): CliResult => {
	const failure = CliError.from(error);
	const details = failure.context?.details;
	const message =
		typeof details === 'string'
			? `${failure.message}: ${details}`
			: failure.message;
	const hint = 'hint' in failure.entry ? failure.entry.hint : undefined;
	logger.error(message);
	if (hint) {
		logger.info(hint);
	}
	return {
		command,
		error: { code: failure.code, hint, message },
		exitCode: failure.code === 'CANCELLED' ? 130 : 1,
		schemaVersion: 1,
		success: false,
	};
};

/**
 * Run a command without changing process arguments, cwd, or exit status.
 * @param args Command arguments, excluding the executable name.
 * @param options Host integration options.
 * @returns A versioned result, including failure details and a suggested exit code.
 * @example
 * const result = await runCli(['projects', 'list', '--json'], { cwd: projectDir });
 */
export const runCli = async (
	args: string[],
	options: RunCliOptions = {}
): Promise<CliResult> => {
	const commands = options.commands ?? defaultCommands;
	let logger =
		options.logger ??
		createCliLogger('info', {
			write: (line) => {
				process.stderr.write(`${line}\n`);
			},
		});
	let context: CliContext | undefined;
	let commandName: string | undefined;
	try {
		const parsed = parseCliArgs(args, commands);
		({ commandName } = parsed);
		const interactive =
			options.interactive === true &&
			parsed.parsedFlags['non-interactive'] !== true &&
			parsed.parsedFlags.json !== true;
		const result = (data: unknown = null): CliResult => ({
			command: commandName,
			data,
			exitCode: 0,
			schemaVersion: 1,
			success: true,
		});
		if (parsed.parsedFlags.version) {
			if (!parsed.parsedFlags.json) {
				logger.message(packageInfo.version);
			}
			return result({ version: packageInfo.version });
		}
		if (parsed.parsedFlags.help || (!commandName && !interactive)) {
			const help = getCommandHelp(commands, commandName);
			if (!parsed.parsedFlags.json) {
				logger.message(formatHelp(help));
			}
			return result(help);
		}
		if (!commandName) {
			commandName = await selectCommand(commands);
			parsed.commandName = commandName;
		}
		const command = commands.find(
			(candidate) => candidate.name === commandName
		);
		if (!command) {
			throw new CliError('COMMAND_NOT_FOUND', { details: commandName });
		}
		const cwd = path.resolve(
			options.cwd ?? process.cwd(),
			typeof parsed.parsedFlags.cwd === 'string' ? parsed.parsedFlags.cwd : '.'
		);
		context = await createCliContext(args, cwd, commands, {
			interactive,
			logger: options.logger,
			parsed,
			telemetry: options.telemetry === true,
			write: (line) => {
				process.stderr.write(`${line}\n`);
			},
		});
		({ logger } = context);
		context.telemetry.trackCommand(
			command.name,
			context.commandArgs,
			context.flags
		);
		const start = performance.now();
		const data = await command.action(context);
		context.telemetry.trackEvent(TelemetryEventName.COMMAND_SUCCEEDED, {
			command: command.name,
			executionTime: performance.now() - start,
		});
		return result(data);
	} catch (error) {
		const result = failureResult(error, logger, commandName);
		context?.telemetry.trackEvent(TelemetryEventName.COMMAND_FAILED, {
			code: result.error?.code,
		});
		return result;
	} finally {
		await context?.telemetry.shutdown();
	}
};

export { CliError } from './core/errors';
export type { CliCommand, CliContext, CliFlag } from './context/types';
export { createCliLogger } from './utils/logger';
export type { CliLogger } from './utils/logger';

export { authenticate } from './auth/authenticate';
export {
	ControlPlaneClient,
	createControlPlaneClient,
	createControlPlaneClientFromConfig,
	createProject,
	resolveInstance,
	requireInstanceBackendUrl,
} from './control-plane';
export type {
	ControlPlaneClientConfig,
	CreateInstanceRequest,
} from './control-plane';
export type { Instance } from './types';
