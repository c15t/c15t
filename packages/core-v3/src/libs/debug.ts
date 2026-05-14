/**
 * Debug logging utility for c15t.
 *
 * @remarks
 * When debug mode is disabled, `log` and `debug` are no-ops.
 * `console.warn` and `console.error` are always shown regardless of debug mode.
 *
 * @packageDocumentation
 */

export interface DebugLogger {
	log: (...args: unknown[]) => void;
	debug: (...args: unknown[]) => void;
}

const noop = () => {};

/**
 * Creates a debug logger that gates `console.log` and `console.debug`
 * behind a boolean flag. When disabled, calls are no-ops.
 *
 * @param enabled - Whether debug logging is enabled
 * @returns A logger with `log` and `debug` methods
 */
export function createDebugLogger(enabled: boolean): DebugLogger {
	if (!enabled) {
		return { log: noop, debug: noop };
	}

	return {
		log: (...args: unknown[]) => console.log('[c15t]', ...args),
		debug: (...args: unknown[]) => console.debug('[c15t]', ...args),
	};
}

/**
 * Global debug logger instance.
 *
 * @remarks
 * This is the default logger used throughout the core package.
 * It starts disabled and can be enabled via {@link setDebugEnabled}.
 */
let _debugLogger: DebugLogger = createDebugLogger(false);

/**
 * Returns the current global debug logger.
 */
export function getDebugLogger(): DebugLogger {
	return _debugLogger;
}

/**
 * Enables or disables the global debug logger.
 *
 * @param enabled - Whether to enable debug logging
 */
export function setDebugEnabled(enabled: boolean): void {
	_debugLogger = createDebugLogger(enabled);
}
