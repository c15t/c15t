import { describe, expect, it } from 'vitest';
import type { LogLevel, LoggableError, Logger, LoggerOptions } from '../types';

describe('types', () => {
	// These tests mainly serve as type checks during compilation
	// and documentation of our type structure

	describe('LogLevel', () => {
		it('should allow valid log levels', () => {
			// Type checking is done at compile time, this is just to document the allowed values
			const levels: LogLevel[] = ['info', 'success', 'warn', 'error', 'debug'];
			expect(levels).toHaveLength(5);

			// This would fail TypeScript compilation:
			// const invalidLevel: LogLevel = 'trace';
		});
	});

	describe('LoggerOptions', () => {
		it('should allow creating valid logger options', () => {
			// Create a valid options object to test the interface shape
			const options: LoggerOptions = {
				disabled: false,
				level: 'warn',
				log: (level, message, ...args) => {
					// This is just for type checking
					// biome-ignore lint/suspicious/noConsole: its okay its a test
					// biome-ignore lint/suspicious/noConsoleLog: its okay its a test
					console.log(level, message, args);
				},
			};

			expect(options).toHaveProperty('disabled');
			expect(options).toHaveProperty('level');
			expect(options).toHaveProperty('log');

			// All properties should be optional
			const emptyOptions: LoggerOptions = {};
			expect(emptyOptions).not.toBeNull();
		});
	});

	describe('Logger', () => {
		it('should have methods for all log levels', () => {
			// Create an object that satisfies the Logger type
			const logger: Logger = {
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				info: (_message: string, ..._args: unknown[]) => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				success: (_message: string, ..._args: unknown[]) => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				warn: (_message: string, ..._args: unknown[]) => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				error: (_message: string, ..._args: unknown[]) => {},
				// biome-ignore lint/suspicious/noEmptyBlockStatements: its okay its a test
				debug: (_message: string, ..._args: unknown[]) => {},
			};

			expect(logger).toHaveProperty('info');
			expect(logger).toHaveProperty('success');
			expect(logger).toHaveProperty('warn');
			expect(logger).toHaveProperty('error');
			expect(logger).toHaveProperty('debug');
		});
	});

	describe('LoggableError', () => {
		it('should allow creating error objects with required properties', () => {
			// Create a minimal LoggableError
			const minimalError: LoggableError = {
				message: 'Test error',
			};

			expect(minimalError).toHaveProperty('message');

			// Create a complete LoggableError
			const fullError: LoggableError = {
				message: 'Test error',
				code: 'TEST_ERROR',
				status: 400,
				meta: { test: true },
				category: 'test',
				stack: 'Error stack trace',
			};

			expect(fullError).toHaveProperty('message');
			expect(fullError).toHaveProperty('code');
			expect(fullError).toHaveProperty('status');
			expect(fullError).toHaveProperty('meta');
			expect(fullError).toHaveProperty('category');
			expect(fullError).toHaveProperty('stack');
		});
	});
});
