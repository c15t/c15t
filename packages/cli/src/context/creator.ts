import type { CliContext as HexbusCliContext } from 'hexbus';
import type { AvailablePackages, CliContext } from './types';

/**
 * Adds c15t-specific services to the base Hexbus context.
 *
 * @param hexbusContext - Context created by Hexbus' shared lifecycle.
 * @param cliVersion - Version of the running c15t CLI package.
 * @returns The CLI context object.
 */
export async function createCliContext(
	hexbusContext: HexbusCliContext<AvailablePackages>
): Promise<CliContext> {
	const framework = {
		...hexbusContext.framework,
		pkg: hexbusContext.framework.pkg ?? 'c15t',
	};
	const { logger } = hexbusContext;
	const { commandArgs, commandName, flags, telemetry } = hexbusContext;

	if (telemetry.isDisabled()) {
		logger.debug('Telemetry is disabled by user preference');
	} else if (flags['telemetry-debug'] === true) {
		logger.debug('Telemetry initialized with debug mode enabled');
	} else {
		logger.debug('Telemetry initialized');
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
