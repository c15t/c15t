import { createCliContext as createHexbusCliContext } from 'hexbus';
import { createTelemetry, TelemetryEventName } from '../utils/telemetry';
import { globalFlags } from './parser';
import type { CliCommand, CliContext } from './types';

/**
 * Parses arguments, creates the logger, and returns the application context.
 *
 * @param rawArgs - The raw command line arguments (process.argv.slice(2)).
 * @param cwd - The current working directory (process.cwd()).
 * @param commands - The list of available CLI commands.
 * @returns The CLI context object.
 */
export async function createCliContext(
	rawArgs: string[],
	cwd: string,
	commands: CliCommand[]
): Promise<CliContext> {
	const context = (await createHexbusCliContext({
		appName: 'c15t',
		commands: commands as never,
		configName: 'c15t',
		cwd,
		globalFlags,
		interactivePackageManagerDetection: true,
		packageMap: {
			core: 'c15t',
			next: '@c15t/nextjs',
			react: '@c15t/react',
		},
		rawArgs,
	})) as unknown as CliContext;

	const { logger, flags, commandName, commandArgs } = context;

	// Add telemetry, respecting the telemetry flag if present
	const telemetryDisabled = flags['no-telemetry'] === true;
	const telemetryDebug = flags['telemetry-debug'] === true;

	try {
		context.telemetry = createTelemetry({
			disabled: telemetryDisabled,
			debug: telemetryDebug,
			defaultProperties: {
				entryCommand: commandName ?? 'interactive',
				commandArgsCount: commandArgs.length,
				enabledFlags: Object.entries(flags)
					.filter(([, value]) => value !== false && value !== undefined)
					.map(([key]) => key)
					.sort(),
				cliVersion: context.fs.getPackageInfo().version,
				framework: context.framework.framework ?? 'unknown',
				frameworkVersion: context.framework.frameworkVersion ?? 'unknown',
				packageManager: context.packageManager.name,
				packageManagerVersion: context.packageManager.version ?? 'unknown',
				hasReact: context.framework.hasReact,
				reactVersion: context.framework.reactVersion ?? 'unknown',
				package: context.framework.pkg ?? 'unknown',
			},
			logger: context.logger,
		});

		if (telemetryDisabled) {
			logger.debug('Telemetry is disabled by user preference');
		} else if (telemetryDebug) {
			logger.debug('Telemetry initialized with debug mode enabled');
		} else {
			logger.debug('Telemetry initialized');
		}

		context.telemetry.trackEvent(TelemetryEventName.CLI_ENVIRONMENT_DETECTED, {
			command: commandName ?? 'interactive',
			projectRootChanged: context.projectRoot !== cwd,
			framework: context.framework.framework ?? 'unknown',
			frameworkVersion: context.framework.frameworkVersion ?? 'unknown',
			packageManager: context.packageManager.name,
			packageManagerVersion: context.packageManager.version ?? 'unknown',
			hasReact: context.framework.hasReact,
			reactVersion: context.framework.reactVersion ?? 'unknown',
			tailwindVersion: context.framework.tailwindVersion ?? 'unknown',
		});
	} catch {
		// If telemetry initialization fails, create a disabled instance
		logger.warn(
			'Failed to initialize telemetry, continuing with telemetry disabled'
		);
		context.telemetry = createTelemetry({
			disabled: true,
			logger: context.logger,
		});
	}

	logger.debug('CLI context fully initialized with all utilities');

	return context;
}
