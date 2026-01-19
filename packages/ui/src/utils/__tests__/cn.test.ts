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
});
