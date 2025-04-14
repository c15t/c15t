import { describe, expect, it } from 'vitest';
import { levels, shouldPublishLog } from '../log-levels';
import type { LogLevel } from '../types';

describe('log-levels', () => {
	describe('levels', () => {
		it('should contain all expected log levels', () => {
			expect(levels).toContain('error');
			expect(levels).toContain('warn');
			expect(levels).toContain('info');
			expect(levels).toContain('success');
			expect(levels).toContain('debug');
		});

		it('should be defined in correct order for log level comparison', () => {
			// Lower index = more important (error should be first)
			expect(levels.indexOf('error')).toBeLessThan(levels.indexOf('warn'));
			expect(levels.indexOf('warn')).toBeLessThan(levels.indexOf('info'));
			expect(levels.indexOf('info')).toBeLessThan(levels.indexOf('success'));
			expect(levels.indexOf('success')).toBeLessThan(levels.indexOf('debug'));
		});
	});

	describe('shouldPublishLog', () => {
		// Define the expected behavior for our tests
		it('should allow messages with level equal to or more important than the current level', () => {
			// Test 'info' level
			expect(shouldPublishLog('info', 'info')).toBe(true);

			// Test 'warn' level
			expect(shouldPublishLog('warn', 'warn')).toBe(true);
			expect(shouldPublishLog('warn', 'error')).toBe(true);
			expect(shouldPublishLog('warn', 'info')).toBe(false);

			// Test 'error' level
			expect(shouldPublishLog('error', 'error')).toBe(true);
			expect(shouldPublishLog('error', 'warn')).toBe(false);
			expect(shouldPublishLog('error', 'info')).toBe(false);

			// Test 'debug' level (special case)
			expect(shouldPublishLog('debug', 'debug')).toBe(true);
			expect(shouldPublishLog('debug', 'error')).toBe(false);
			expect(shouldPublishLog('debug', 'warn')).toBe(false);
			expect(shouldPublishLog('debug', 'info')).toBe(false);
			expect(shouldPublishLog('debug', 'success')).toBe(false);
		});

		it('should use array comparison for determining log level priority', () => {
			const testFn = (
				currentLevel: LogLevel,
				messageLevel: LogLevel
			): boolean => {
				// Simulate the logic from shouldPublishLog
				const currentLevelIndex = levels.indexOf(currentLevel);
				const messageLevelIndex = levels.indexOf(messageLevel);

				if (currentLevel === 'debug') {
					return messageLevel === 'debug';
				}

				return messageLevelIndex <= currentLevelIndex;
			};

			// Test various combinations
			expect(testFn('info', 'error')).toBe(true);
			expect(testFn('warn', 'error')).toBe(true);
			expect(testFn('error', 'error')).toBe(true);
			expect(testFn('error', 'warn')).toBe(false);

			// Compare with the actual function
			expect(testFn('info', 'error')).toBe(shouldPublishLog('info', 'error'));
			expect(testFn('warn', 'error')).toBe(shouldPublishLog('warn', 'error'));
			expect(testFn('error', 'error')).toBe(shouldPublishLog('error', 'error'));
			expect(testFn('error', 'warn')).toBe(shouldPublishLog('error', 'warn'));
		});
	});
});
