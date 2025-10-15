import pc from 'picocolors';
import type { LogLevel } from '../core/types';

/**
 * Log message formatter function signature.
 */
export type LogFormatter = (
	level: LogLevel,
	message: string,
	args: unknown[],
	appName?: string
) => string;

/**
 * Registry of named formatters that can be used for different contexts.
 */
const formatters: Record<string, LogFormatter> = {};

/**
 * Default formatter - formatted output with color and timestamp.
 */
const defaultFormatter: LogFormatter = (
	level,
	message,
	args,
	appName = 'c15t'
) => {
	// Extract only time portion from timestamp (HH:MM:SS.sss)
	const now = new Date();
	const timestamp = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
	const formattedArgs = formatArgs(args);

	// Format message based on log level with colorized badges
	let levelBadge: string;

	switch (level) {
		case 'error': {
			levelBadge = pc.bgRed(pc.black(` ${level.toUpperCase()} `));
			break;
		}
		case 'warn': {
			levelBadge = pc.bgYellow(pc.black(` ${level.toUpperCase()} `));
			break;
		}
		case 'info': {
			levelBadge = pc.bgBlue(pc.white(` ${level.toUpperCase()} `));
			break;
		}
		case 'debug': {
			levelBadge = pc.bgBlack(pc.white(` ${level.toUpperCase()} `));
			break;
		}
		case 'success': {
			levelBadge = pc.bgGreen(pc.black(` ${level.toUpperCase()} `));
			break;
		}
		default: {
			levelBadge = pc.bold(`[${String(level).toUpperCase()}]`);
			break;
		}
	}

	return `${pc.gray(timestamp)} ${levelBadge} ${pc.bold(`[${appName}]`)} ${message}${formattedArgs}`;
};

/**
 * Format additional arguments for logging in a structured way.
 *
 * @param args - Array of arguments to format
 * @returns Formatted string representation of arguments
 */
export const formatArgs = (args: unknown[]): string => {
	if (args.length === 0) {
		return '';
	}

	return `\n${args
		.map((arg) => {
			if (arg === null) {
				return '  - null';
			}
			if (arg === undefined) {
				return '  - undefined';
			}

			try {
				// Handle Error objects specially
				if (arg instanceof Error) {
					return `  - ${arg.name}: ${arg.message}\n    ${arg.stack || ''}`;
				}

				// Format other objects
				return `  - ${JSON.stringify(arg, null, 2).replace(/\n/g, '\n    ')}`;
			} catch {
				// Fallback for objects that can't be stringified
				return `  - [Object: ${Object.prototype.toString.call(arg)}]`;
			}
		})
		.join('\n')}`;
};

/**
 * Next.js specific formatter with time-only timestamps and cleaner format
 */
export const nextjsFormatter: LogFormatter = (
	level,
	message,
	args,
	appName = 'c15t'
) => {
	// Extract only time portion from timestamp (HH:MM:SS.sss)
	const now = new Date();
	const timestamp = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
	const formattedArgs = formatArgs(args);

	// Format message based on log level with markers that work well in Next.js output
	const levelMarker = `[${level.toUpperCase()}]`;
	const appMarker = `[${appName}]`;

	return `${timestamp} ${levelMarker} ${appMarker} ${message}${formattedArgs}`;
};

// Register the default formatter
formatters.default = defaultFormatter;
// Register the Next.js formatter
formatters.nextjs = nextjsFormatter;

/**
 * Register a custom formatter for log messages.
 *
 * @param name - Name to identify the formatter
 * @param formatter - The formatter function
 */
export const registerFormatter = (
	name: string,
	formatter: LogFormatter
): void => {
	formatters[name] = formatter;
};

/**
 * Get a formatter by name, falling back to default if not found.
 *
 * @param name - The formatter name to retrieve
 * @returns The formatter function
 */
export const getFormatter = (name = 'default'): LogFormatter => {
	return formatters[name] || defaultFormatter;
};

/**
 * Format a log message using the specified formatter.
 *
 * @param level - Log level
 * @param message - Log message
 * @param args - Additional log arguments
 * @param formatterName - Name of formatter to use
 * @param appName - Optional application name
 * @returns Formatted log message
 */
export const formatMessage = (
	level: LogLevel,
	message: string,
	args: unknown[] = [],
	formatterName = 'default',
	appName?: string
): string => {
	const formatter = getFormatter(formatterName);
	return formatter(level, message, args, appName);
};
