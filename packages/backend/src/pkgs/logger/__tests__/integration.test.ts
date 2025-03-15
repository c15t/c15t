import { err, errAsync } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../logger-factory';
import { logResult, logResultAsync } from '../result-logging';
import type { LoggableError } from '../types';

describe('logger integration', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('full logger pipeline', () => {
		it('should work with default logger and result logging together', () => {
			// Create a default logger
			const logger = createLogger();

			// Create an error result
			const testError: LoggableError = {
				message: 'Integration test error',
				code: 'INTEGRATION_TEST',
			};
			const errorResult = err(testError);

			// Log the error using the result logging utility
			logResult(errorResult, logger);

			// Verify that console.error was called with a formatted message
			expect(console.error).toHaveBeenCalledTimes(1);
			const mockedConsoleError = vi.mocked(console.error);
			expect(mockedConsoleError.mock.calls[0]?.[0]).toContain('ERROR');
			expect(mockedConsoleError.mock.calls[0]?.[0]).toContain(
				'Integration test error'
			);
			expect(mockedConsoleError.mock.calls[0]?.[1]).toEqual({
				code: 'INTEGRATION_TEST',
				status: undefined,
				data: undefined,
				category: undefined,
				stack: undefined,
			});
		});

		it('should work with custom log level and error logging together', () => {
			// Create a logger with custom configuration
			const logger = createLogger({
				level: 'info', // Change from 'debug' to 'info' to allow info, warn, and error logs
			});

			// Test standard logging
			logger.info('Info message');
			logger.debug('Debug message');
			logger.warn('Warning message');

			expect(console.log).toHaveBeenCalledTimes(1);
			expect(console.debug).toHaveBeenCalledTimes(0); // Debug won't be logged with info level
			expect(console.warn).toHaveBeenCalledTimes(1);

			// Create an error for result logging
			const testError: LoggableError = {
				message: 'Integration error',
			};

			// Log using the result logging utility
			logResult(err(testError), logger);

			expect(console.error).toHaveBeenCalledTimes(1);
		});

		it('should work with custom log handler and result logging', () => {
			// Create a mock log handler
			const customLogHandler = vi.fn();

			// Create a logger with the custom handler
			const logger = createLogger({
				level: 'info', // Change from 'debug' to 'info' to allow info, warn, and error logs
				log: customLogHandler,
			});

			// Use direct logging
			logger.info('Direct info');
			logger.error('Direct error');

			expect(customLogHandler).toHaveBeenCalledTimes(2);

			// Use result logging
			const testError: LoggableError = {
				message: 'Result error',
			};

			logResult(err(testError), logger);

			// Check that the custom handler was called again
			expect(customLogHandler).toHaveBeenCalledTimes(3);
			const mockedCustomLogHandler = vi.mocked(customLogHandler);
			expect(mockedCustomLogHandler.mock.calls[2]?.[0]).toBe('error');
			expect(mockedCustomLogHandler.mock.calls[2]?.[1]).toBe(
				'Error occurred: Result error'
			);
		});

		it('should support async result logging with the logger', async () => {
			const logger = createLogger();

			const testError: LoggableError = {
				message: 'Async integration error',
			};

			const errorResultAsync = errAsync(testError);

			await logResultAsync(errorResultAsync, logger).match(
				() => {},
				() => {}
			);

			expect(console.error).toHaveBeenCalledTimes(1);
			const mockedConsoleError = vi.mocked(console.error);
			expect(mockedConsoleError.mock.calls[0]?.[0]).toContain(
				'Async integration error'
			);
		});

		it('should use custom application name in logs', () => {
			// Create a logger with a custom application name
			const customAppName = 'c15t-api';
			const logger = createLogger({
				level: 'info',
				appName: customAppName,
			});

			// Log messages at different levels
			logger.info('Application started');
			logger.warn('Configuration incomplete');
			logger.error('Failed to connect to database');

			// Verify logs contain the custom app name
			const mockedConsoleLog = vi.mocked(console.log);
			const mockedConsoleWarn = vi.mocked(console.warn);
			const mockedConsoleError = vi.mocked(console.error);

			expect(mockedConsoleLog.mock.calls[0]?.[0]).toContain(
				`[${customAppName}]`
			);
			expect(mockedConsoleWarn.mock.calls[0]?.[0]).toContain(
				`[${customAppName}]`
			);
			expect(mockedConsoleError.mock.calls[0]?.[0]).toContain(
				`[${customAppName}]`
			);

			// Verify logs don't contain the default app name
			expect(mockedConsoleLog.mock.calls[0]?.[0]).not.toContain(
				'[🪢 doubletie]'
			);

			// Check that the custom app name works with result logging too
			const testError: LoggableError = {
				message: 'Integration error with custom app name',
			};

			logResult(err(testError), logger);

			expect(mockedConsoleError.mock.calls[1]?.[0]).toContain(
				`[${customAppName}]`
			);
			expect(mockedConsoleError.mock.calls[1]?.[0]).toContain(
				'Integration error with custom app name'
			);
		});
	});
});
