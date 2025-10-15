import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels } from '../../core/levels';
import { createLogger } from '../../core/logger';

describe('logger', () => {
	// Mock console methods
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createLogger', () => {
		it('should create a logger with all log level methods', () => {
			const logger = createLogger();
			for (const level of levels) {
				expect(typeof logger[level]).toBe('function');
			}
		});

		it('should respect disabled option', () => {
			const logger = createLogger({ disabled: true });
			logger.error('This should not be logged');
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should respect log level option', () => {
			const logger = createLogger({ level: 'warn' });

			logger.error('This should be logged'); // Should be logged
			logger.warn('This should be logged'); // Should be logged
			logger.info('This should not be logged'); // Should not be logged
			logger.debug('This should not be logged'); // Should not be logged

			// Verify calls - with 'warn' level, only error and warn should be logged
			expect(console.error).toHaveBeenCalled();
			expect(console.warn).toHaveBeenCalled();
			expect(console.log).not.toHaveBeenCalled();
			expect(console.debug).not.toHaveBeenCalled();
		});

		it('should use custom log handler when provided', () => {
			const customLog = vi.fn();
			const logger = createLogger({
				log: customLog,
				level: 'debug',
			});

			logger.info('Info message');
			logger.error('Error message');
			logger.success('Success message');

			expect(customLog).toHaveBeenCalledTimes(3);
			expect(customLog).toHaveBeenCalledWith('info', 'Info message');
			expect(customLog).toHaveBeenCalledWith('error', 'Error message');
			// 'success' should be treated as 'info' when using custom log handler
			expect(customLog).toHaveBeenCalledWith('info', 'Success message');
		});

		it('should format messages with timestamp and level', () => {
			const logger = createLogger({ level: 'error' });
			logger.error('Test message');

			// Check that console.error was called with a formatted message
			expect(console.error).toHaveBeenCalled();

			// Extract the first argument from the first call
			const mockedConsoleError = vi.mocked(console.error);
			const firstCallArg = mockedConsoleError.mock.calls[0]?.[0];

			// Check that the message contains the expected parts
			expect(firstCallArg).toContain('ERROR');
			expect(firstCallArg).toContain('[c15t]');
			expect(firstCallArg).toContain('Test message');

			// Check that timestamp matches the current time-only format (HH:MM:SS.mmm)
			expect(firstCallArg).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
		});

		it('should pass additional arguments to console methods', () => {
			const logger = createLogger({ level: 'error' });
			const meta = { userId: 'user123' };

			logger.error('Error with meta', meta);

			expect(console.error).toHaveBeenCalled();
			const mockedConsoleError = vi.mocked(console.error);
			expect(mockedConsoleError.mock.calls[0]?.[1]).toBe(meta);
		});

		it('should use custom app name when provided', () => {
			// Create a logger with a custom app name
			const customAppName = 'test-app';
			const logger = createLogger({ appName: customAppName, level: 'info' });

			// Log a test message
			logger.info('Test message with custom app name');

			// Check that console.log was called with a formatted message
			expect(console.log).toHaveBeenCalled();

			// Extract the first argument from the first call
			const mockedConsoleLog = vi.mocked(console.log);
			const logMessage = mockedConsoleLog.mock.calls[0]?.[0];

			// Verify the message contains the custom app name
			expect(logMessage).toContain(`[${customAppName}]`);
			// And doesn't contain the default app name
			expect(logMessage).not.toContain('[c15t]');
		});
	});
});
