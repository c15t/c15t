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
/**
 * Creates a debug logger that gates `console.log` and `console.debug`
 * behind a boolean flag. When disabled, calls are no-ops.
 *
 * @param enabled - Whether debug logging is enabled
 * @returns A logger with `log` and `debug` methods
 */
export declare function createDebugLogger(enabled: boolean): DebugLogger;
/**
 * Returns the current global debug logger.
 */
export declare function getDebugLogger(): DebugLogger;
/**
 * Enables or disables the global debug logger.
 *
 * @param enabled - Whether to enable debug logging
 */
export declare function setDebugEnabled(enabled: boolean): void;
