import { describe, expect, it } from 'vitest';
import type { LogFormatter } from '../../formatting/formatter';
import {
	formatArgs,
	formatMessage,
	getFormatter,
	registerFormatter,
} from '../../formatting/formatter';

describe('formatter', () => {
	describe('formatArgs', () => {
		it('should return empty string for empty args array', () => {
			expect(formatArgs([])).toBe('');
		});

		it('should format primitive values properly', () => {
			const result = formatArgs([42, 'test', true, null, undefined]);
			expect(result).toContain('  - 42');
			expect(result).toContain('  - "test"');
			expect(result).toContain('  - true');
			expect(result).toContain('  - null');
			expect(result).toContain('  - undefined');
		});

		it('should format objects with indentation', () => {
			const obj = { name: 'test', nested: { value: 123 } };
			const result = formatArgs([obj]);
			expect(result).toContain('"name": "test"');
			expect(result).toContain('"nested": {');
			expect(result).toContain('"value": 123');
		});

		it('should handle error objects specially', () => {
			const error = new Error('Test error');
			const result = formatArgs([error]);
			expect(result).toContain('Error: Test error');
			expect(result).toContain(error.stack || '');
		});
	});

	describe('registerFormatter and getFormatter', () => {
		it('should register and retrieve a custom formatter', () => {
			const customFormatter: LogFormatter = (level, message) =>
				`${level}: ${message}`;
			registerFormatter('custom', customFormatter);

			const formatter = getFormatter('custom');
			expect(formatter).toBe(customFormatter);

			const result = formatter('error', 'Test message', []);
			expect(result).toBe('error: Test message');
		});

		it('should return default formatter when name not found', () => {
			const formatter = getFormatter('non-existent');
			expect(formatter).not.toBeNull();

			const result = formatter('info', 'Test', [], 'app');
			expect(result).toContain('INFO');
			expect(result).toContain('[app]');
			expect(result).toContain('Test');
		});
	});

	describe('formatMessage', () => {
		it('should use the specified formatter', () => {
			const customFormatter: LogFormatter = (level, message) =>
				`[CUSTOM] ${level}: ${message}`;
			registerFormatter('test-formatter', customFormatter);

			const result = formatMessage(
				'error',
				'Test message',
				[],
				'test-formatter'
			);
			expect(result).toBe('[CUSTOM] error: Test message');
		});

		it('should use default formatter when none specified', () => {
			const result = formatMessage('info', 'Default format test');
			expect(result).toContain('INFO');
			expect(result).toContain('[c15t]');
			expect(result).toContain('Default format test');
		});

		it('should pass app name to formatter when provided', () => {
			const result = formatMessage(
				'warn',
				'App name test',
				[],
				'default',
				'test-app'
			);
			expect(result).toContain('[test-app]');
		});
	});
});
