import { describe, expect, test } from 'vitest';
import { deepMerge } from '../deep-merge';

describe('deepMerge', () => {
	test('returns target when source is undefined', () => {
		const target = { a: 1 };
		expect(deepMerge(target, undefined)).toEqual({ a: 1 });
	});

	test('returns target when source is null', () => {
		const target = { a: 1 };
		expect(deepMerge(target, null)).toEqual({ a: 1 });
	});

	test('returns target when source is not an object', () => {
		const target = { a: 1 };
		expect(deepMerge(target, 'string')).toEqual({ a: 1 });
		expect(deepMerge(target, 123)).toEqual({ a: 1 });
	});

	test('merges flat objects', () => {
		const target = { a: 1, b: 2 };
		const source = { b: 3, c: 4 };
		expect(deepMerge(target, source)).toEqual({ a: 1, b: 3, c: 4 });
	});

	test('merges nested objects', () => {
		const target = {
			a: 1,
			nested: {
				x: 10,
				y: 20,
			},
		};
		const source = {
			nested: {
				y: 30,
				z: 40,
			},
		};
		expect(deepMerge(target, source)).toEqual({
			a: 1,
			nested: {
				x: 10,
				y: 30,
				z: 40,
			},
		});
	});

	test('handles deeply nested objects', () => {
		const target = {
			level1: {
				level2: {
					level3: {
						a: 1,
					},
				},
			},
		};
		const source = {
			level1: {
				level2: {
					level3: {
						b: 2,
					},
				},
			},
		};
		expect(deepMerge(target, source)).toEqual({
			level1: {
				level2: {
					level3: {
						a: 1,
						b: 2,
					},
				},
			},
		});
	});

	test('replaces arrays instead of merging', () => {
		const target = { arr: [1, 2, 3] };
		const source = { arr: [4, 5] };
		expect(deepMerge(target, source)).toEqual({ arr: [4, 5] });
	});

	test('does not mutate the original target', () => {
		const target = { a: 1, nested: { x: 10 } };
		const source = { b: 2, nested: { y: 20 } };
		const result = deepMerge(target, source);

		expect(target).toEqual({ a: 1, nested: { x: 10 } });
		expect(result).toEqual({ a: 1, b: 2, nested: { x: 10, y: 20 } });
	});

	test('handles empty target', () => {
		const target = {};
		const source = { a: 1, nested: { x: 10 } };
		expect(deepMerge(target, source)).toEqual({ a: 1, nested: { x: 10 } });
	});

	test('handles empty source', () => {
		const target = { a: 1 };
		const source = {};
		expect(deepMerge(target, source)).toEqual({ a: 1 });
	});

	test('overwrites primitive values', () => {
		const target = { a: 'original' };
		const source = { a: 'updated' };
		expect(deepMerge(target, source)).toEqual({ a: 'updated' });
	});

	test('handles null values in source object', () => {
		const target = { a: 1, b: { x: 10 } };
		const source = { b: null };
		expect(deepMerge(target, source)).toEqual({ a: 1, b: null });
	});
});
