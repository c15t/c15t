import { type Logger, createLogger } from '@c15t/backend/pkgs/logger';
import * as p from '@clack/prompts';

// Define standard log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export const validLogLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

// This function creates a logger instance based on the provided level
// It includes the custom log handler for clack integration.
export const createCliLogger = (level: LogLevel): Logger => {
	return createLogger({
		level: level,
		appName: 'c15t',
		log: (logLevel, message, ...args) => {
			// Level filtering is primarily handled by the createLogger factory's level setting.
			// This function now just focuses on routing output.
			const messageStr =
				typeof message === 'string' ? message : String(message);

			const formatArgs = (args: unknown[]): string => {
				if (args.length === 0) {
					return '';
				}
				return `\n${args.map((arg) => `  - ${JSON.stringify(arg, null, 2)}`).join('\n')}`;
			};

			switch (logLevel) {
				case 'error': {
					// Handles 'error' and implicitly 'fatal'
					const fullMessage = `[ERROR] ${messageStr}${formatArgs(args)}`;
					p.log.error(fullMessage);
					break;
				}
				case 'warn': {
					const fullMessage = `[WARN] ${messageStr}${formatArgs(args)}`;
					p.log.warn(fullMessage);
					break;
				}
				case 'info': {
					const fullMessage = `[INFO] ${messageStr}${formatArgs(args)}`;
					p.log.info(fullMessage);
					break;
				}
				case 'debug': {
					// Debug messages use console directly for less clutter
					// Only log if the actual logger level allows it (checked by createLogger)
					console.debug(`[DEBUG] ${messageStr}`, ...args);
					break;
				}
				default: {
					// Handle unexpected levels
					const levelStr = logLevel as string;
					console.log(`[${levelStr.toUpperCase()}] ${messageStr}`, ...args);
					break;
				}
			}
		},
	});
};
