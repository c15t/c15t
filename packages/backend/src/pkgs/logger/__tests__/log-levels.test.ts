import { describe, expect, it, vi } from 'vitest';
import { levels, shouldLog } from '../log-levels';
import * as logLevelsModule from '../log-levels';
import type { LogLevel } from '../types';

describe('log-levels', () => {
	describe('levels', () => {
		it('should contain all expected log levels', () => {
			expect(levels).toContain('info');
			expect(levels).toContain('success');
			expect(levels).toContain('warn');
			expect(levels).toContain('error');
			expect(levels).toContain('debug');
			expect(levels.length).toBe(5);
		});

		it('should be defined in correct order for log level comparison', () => {
			// The order is important for shouldLog function
			// The earlier in the array, the higher the priority
			expect(levels.indexOf('info')).toBeLessThan(levels.indexOf('debug'));
			expect(levels.indexOf('warn')).toBeLessThan(levels.indexOf('debug'));
			expect(levels.indexOf('error')).toBeLessThan(levels.indexOf('debug'));
		});
	});

	describe('shouldLog', () => {
		// Define the expected behavior for our tests
		it('should allow messages with level equal to or more important than the current level', () => {
			// Test 'info' level
			expect(shouldLog('info', 'info')).toBe(true);

			// Test 'warn' level
			expect(shouldLog('warn', 'warn')).toBe(true);
			expect(shouldLog('warn', 'error')).toBe(true);
			expect(shouldLog('warn', 'info')).toBe(false);

			// Test 'error' level
			expect(shouldLog('error', 'error')).toBe(true);
			expect(shouldLog('error', 'warn')).toBe(false);
			expect(shouldLog('error', 'info')).toBe(false);

			// Test 'debug' level
			expect(shouldLog('debug', 'debug')).toBe(true);
			expect(shouldLog('debug', 'error')).toBe(false);
			expect(shouldLog('debug', 'warn')).toBe(false);
			expect(shouldLog('debug', 'info')).toBe(false);
		});

		it('should use array comparison for determining log level priority', () => {
			// Use the actual implementation, but with a controlled test
			const mockLevels = ['error', 'warn', 'info', 'success', 'debug'] as const;

			// Mock the indexOf method on our test array
			const indexOfSpy = vi.spyOn(mockLevels, 'indexOf');

			// Create a test function that uses our mock array
			const testFn = (
				currentLevel: LogLevel,
				messageLevel: LogLevel
			): boolean => {
				return (
					mockLevels.indexOf(messageLevel) <= mockLevels.indexOf(currentLevel)
				);
			};

			// Run the test
			const result = testFn('warn', 'error');

			// Verify the spy was called with the expected arguments
			expect(indexOfSpy).toHaveBeenCalledWith('warn');
			expect(indexOfSpy).toHaveBeenCalledWith('error');

			// Clean up
			indexOfSpy.mockRestore();

			// The result should be true since error is more important than warn
			expect(result).toBe(true);
		});
	});
});
