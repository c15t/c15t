import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Arbitrary structured logging fields for contextual metadata.
 *
 * @remarks
 * Values should be JSON-serializable. Non-serializable values will be omitted
 * when rendering the log line.
 */
export type LogFields = Record<string, unknown>;

/**
 * Minimal logger interface used across the action.
 *
 * @remarks
 * This interface intentionally mirrors common logger APIs and routes messages
 * through `@actions/core` sinks. `debug` messages are emitted only when
 * `debug_mode` is enabled via inputs.
 */
export type Logger = {
	/** Log a verbose diagnostic message (hidden unless debug is enabled). */
	debug: (message: string, fields?: LogFields) => void;
	/** Log an informational message. */
	info: (message: string, fields?: LogFields) => void;
	/** Log a warning message. */
	warn: (message: string, fields?: LogFields) => void;
	/** Log an error message. */
	error: (message: string, fields?: LogFields) => void;
	/**
	 * Create a derived logger that always includes the provided fields.
	 *
	 * @param fields - Additional fields to merge into subsequent log calls
	 */
	child: (fields: LogFields) => Logger;
};

/**
 * Render structured fields as a JSON suffix for a single-line log entry.
 *
 * @param fields - Optional fields to render
 * @returns A string beginning with a leading space or an empty string when no
 * fields are provided or serialization fails
 * @internal
 */
function formatFields(fields?: LogFields): string {
	if (!fields || Object.keys(fields).length === 0) {
		return '';
	}
	try {
		return ` ${JSON.stringify(fields)}`;
	} catch {
		return '';
	}
}

/**
 * Create a logger that writes to GitHub Actions logging streams.
 *
 * @param debugEnabled - When true, `debug` logs are emitted via `core.info`
 * @param base - Optional base fields included with every log line
 * @returns A `Logger` instance
 *
 * @example
 * ```ts
 * const logger = createLogger(true, { component: 'deploy' });
 * logger.info('starting');
 * logger.debug('payload', { size: 123 });
 * ```
 */
export function createLogger(
	debugEnabled: boolean,
	base: LogFields = {}
): Logger {
	const baseMeta = {
		event: github.context.eventName,
		ref: github.context.ref,
		sha: github.context.sha,
		actor: github.context.actor,
		...base,
	};

	function log(
		level: 'debug' | 'info' | 'warn' | 'error',
		message: string,
		fields?: LogFields
	): void {
		const line = `[c15t] ${message}${formatFields({ ...baseMeta, ...(fields || {}) })}`;
		if (level === 'debug') {
			if (debugEnabled) {
				core.info(line);
			}
			return;
		}
		if (level === 'info') {
			core.info(line);
			return;
		}
		if (level === 'warn') {
			core.warning(line);
			return;
		}
		core.error(line);
	}

	return {
		debug: (m, f) => log('debug', m, f),
		info: (m, f) => log('info', m, f),
		warn: (m, f) => log('warn', m, f),
		error: (m, f) => log('error', m, f),
		child: (childFields: LogFields) =>
			createLogger(debugEnabled, { ...baseMeta, ...childFields }),
	};
}
