import logger from '../utils/logger'; // Import the logger

/**
 * Parses simple CLI arguments like --key value or -k value or flags like -y.
 * Returns an object mapping argument keys (without leading dashes) to their values.
 */
export function parseArgs(args: string[]): Record<string, string | boolean> {
	logger.info('Parsing CLI arguments...'); // Add info log
	logger.debug('Raw arguments:', args); // Add debug log for raw args
	const options: Record<string, string | boolean> = {};
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) {
			continue;
		}
		if (arg.startsWith('--')) {
			const key = arg.substring(2);
			const nextArg = args[i + 1];
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++;
			} else {
				options[key] = true;
			}
		} else if (arg.startsWith('-')) {
			const key = arg.substring(1);
			const nextArg = args[i + 1];
			if (nextArg && !nextArg.startsWith('-')) {
				options[key] = nextArg;
				i++;
			} else {
				options[key] = true;
			}
		}
		// Ignore non-option arguments (positional args)
	}
	logger.debug('Parsed arguments:', options); // Add debug log for parsed args
	return options;
}
