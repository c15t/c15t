import { describe, expect, test } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
	test('returns empty string for no arguments', () => {
		expect(cn()).toBe('');
	});

	test('returns single class name', () => {
		expect(cn('foo')).toBe('foo');
	});

	test('merges multiple class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	test('filters out falsy values', () => {
		expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar');
	});

	test('handles empty strings', () => {
		expect(cn('foo', '', 'bar')).toBe('foo bar');
	});

	test('handles arrays of class names', () => {
		expect(cn(['foo', 'bar'])).toBe('foo bar');
	});

	test('handles nested arrays', () => {
		expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
	});

	test('handles objects with boolean values', () => {
		expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
	});

	test('handles mixed types', () => {
		expect(cn('foo', ['bar'], { baz: true, qux: false })).toBe('foo bar baz');
	});

	test('handles conditional classes', () => {
		const isActive = true;
		const isDisabled = false;
		expect(
			cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')
		).toBe('btn btn-active');
	});

	test('handles numeric values in arrays', () => {
		expect(cn(['class1', 0])).toBe('class1');
	});

	test('keeps truthy numeric class names', () => {
		expect(cn(1, 'foo', 2)).toBe('1 foo 2');
	});

	test('keeps truthy bigint class names', () => {
		expect(cn(1n, 'foo')).toBe('1 foo');
	});

	test('uses only own enumerable object keys', () => {
		const classes = Object.create({ inherited: true }) as Record<
			string,
			unknown
		>;
		classes.own = true;
		classes.hidden = false;

		expect(cn(classes)).toBe('own');
	});

	test('preserves order through nested arrays and objects', () => {
		expect(
			cn('alpha', ['beta', { gamma: true }], { delta: 1, epsilon: 0 }, 'zeta')
		).toBe('alpha beta gamma delta zeta');
	});
});
