import { createCliContext as createHexbusCliContext } from 'hexbus';
import { createTelemetry, TelemetryEventName } from '../utils/telemetry';
import { mapCliCommandsToHexbusCommands, parseCliArgs } from './parser';
import type { AvailablePackages, CliCommand, CliContext } from './types';

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
	const parsed = parseCliArgs(rawArgs, commands);
	const hexbusContext = await createHexbusCliContext<AvailablePackages>({
		appName: 'c15t',
		commands: mapCliCommandsToHexbusCommands(commands),
		configName: 'c15t',
		cwd,
		interactivePackageManagerDetection: true,
		packageMap: {
			core: 'c15t',
			next: '@c15t/nextjs',
			react: '@c15t/react',
		},
		rawArgs,
	});
	const framework = {
		...hexbusContext.framework,
		pkg: hexbusContext.framework.pkg ?? 'c15t',
	};
	const { logger } = hexbusContext;
	const { parsedFlags: flags, commandName, commandArgs } = parsed;

	// Add telemetry, respecting the telemetry flag if present
	const telemetryDisabled = flags['no-telemetry'] === true;
	const telemetryDebug = flags['telemetry-debug'] === true;
	let telemetry = createTelemetry({ disabled: true, logger });

	try {
		telemetry = createTelemetry({
			disabled: telemetryDisabled,
			debug: telemetryDebug,
			defaultProperties: {
				entryCommand: commandName ?? 'interactive',
				commandArgsCount: commandArgs.length,
				enabledFlags: Object.entries(flags)
					.filter(([, value]) => value !== false && value !== undefined)
					.map(([key]) => key)
					.sort(),
				cliVersion: hexbusContext.fs.getPackageInfo().version,
				framework: framework.framework ?? 'unknown',
				frameworkVersion: framework.frameworkVersion ?? 'unknown',
				packageManager: hexbusContext.packageManager.name,
				packageManagerVersion:
					hexbusContext.packageManager.version ?? 'unknown',
				hasReact: framework.hasReact,
				reactVersion: framework.reactVersion ?? 'unknown',
				package: framework.pkg,
			},
			logger,
		});

		if (telemetryDisabled) {
			logger.debug('Telemetry is disabled by user preference');
		} else if (telemetryDebug) {
			logger.debug('Telemetry initialized with debug mode enabled');
		} else {
			logger.debug('Telemetry initialized');
		}

		telemetry.trackEvent(TelemetryEventName.CLI_ENVIRONMENT_DETECTED, {
			command: commandName ?? 'interactive',
			projectRootChanged: hexbusContext.projectRoot !== cwd,
			framework: framework.framework ?? 'unknown',
			frameworkVersion: framework.frameworkVersion ?? 'unknown',
			packageManager: hexbusContext.packageManager.name,
			packageManagerVersion: hexbusContext.packageManager.version ?? 'unknown',
			hasReact: framework.hasReact,
			reactVersion: framework.reactVersion ?? 'unknown',
			tailwindVersion: framework.tailwindVersion ?? 'unknown',
		});
	} catch {
		// If telemetry initialization fails, create a disabled instance
		logger.warn(
			'Failed to initialize telemetry, continuing with telemetry disabled'
		);
		telemetry = createTelemetry({
			disabled: true,
			logger,
		});
	}

	const context: CliContext = {
		...hexbusContext,
		commandArgs,
		commandName,
		flags,
		framework,
		telemetry,
	};

	logger.debug('CLI context fully initialized with all utilities');

	return context;
}
