import * as p from '@clack/prompts';
import color from 'picocolors';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export const validLogLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
export interface CliLogger {
	debug: (message: string, ...args: unknown[]) => void;
	info: (message: string, ...args: unknown[]) => void;
	warn: (message: string, ...args: unknown[]) => void;
	error: (message: string, ...args: unknown[]) => void;
	message: (message: string) => void;
	note: (content: string, title?: string) => void;
	outro: (message: string) => void;
	success: (message: string) => void;
	failed: (message: string) => never;
	step: (current: number, total: number, label: string) => void;
}
export type CliExtensions = Pick<
	CliLogger,
	'message' | 'note' | 'outro' | 'success' | 'failed' | 'step'
>;

const formatArg = (value: unknown): string => {
	if (value instanceof Error) {
		return value.message;
	}
	if (typeof value === 'string') {
		return value;
	}
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
};
export const formatLogMessage = (
	level: string,
	message: unknown,
	args: unknown[] = []
): string => `${level}: ${[String(message), ...args.map(formatArg)].join(' ')}`;

export interface LoggerOptions {
	/** Use terminal prompts for human-readable output. */
	interactive?: boolean;
	/** Receive diagnostic lines. Defaults to stderr so stdout remains data-only. */
	write?: (line: string) => void;
}

/** Create a logger without installing process handlers or terminating callers. */
export const createCliLogger = (
	level: LogLevel = 'info',
	options: LoggerOptions = {}
): CliLogger => {
	const write =
		options.write ??
		((line: string) => {
			process.stderr.write(`${line}\n`);
		});
	const emit = (target: LogLevel, message: string, args: unknown[] = []) => {
		if (validLogLevels.indexOf(target) > validLogLevels.indexOf(level)) {
			return;
		}
		const line = formatLogMessage(target, message, args);
		if (options.interactive) {
			p.log[target === 'debug' ? 'info' : target](line);
		} else {
			write(line);
		}
	};
	const writeMessage =
		options.write ??
		((line: string) => {
			process.stdout.write(`${line}\n`);
		});
	const message = (line: string) => {
		if (options.interactive) {
			p.log.message(line);
		} else {
			writeMessage(line);
		}
	};
	return {
		debug: (line, ...args) => emit('debug', line, args),
		error: (line, ...args) => emit('error', line, args),
		failed: (line) => {
			throw new Error(line);
		},
		info: (line, ...args) => emit('info', line, args),
		message,
		note: (content, title) => message(title ? `${title}\n${content}` : content),
		outro: message,
		step: (current, total, label) =>
			message(`Step ${current}/${total}: ${label}`),
		success: (line) => emit('info', line),
		warn: (line, ...args) => emit('warn', line, args),
	};
};

export const logMessage = (
	level: string,
	message: unknown,
	...args: unknown[]
): void => {
	process.stderr.write(`${formatLogMessage(level, message, args)}\n`);
};
export { color };
