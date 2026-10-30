import { describe, expect, test } from 'vitest';

import { copyPlainData } from '../copy-plain-data';

describe('copyPlainData', () => {
	test('returns primitives unchanged', () => {
		for (const value of ['a', 1, true, null, undefined]) {
			expect(copyPlainData(value)).toBe(value);
		}
	});

	test('copies nested objects, arrays and dates without sharing them', () => {
		const original = {
			category: { and: ['measurement', { not: 'marketing' }] },
			created: new Date(Date.UTC(2026, 9, 1)),
			ids: [1, 2, 3],
		};
		const copy = copyPlainData(original);

		expect(copy).toEqual(original);
		expect(copy).not.toBe(original);
		expect(copy.category).not.toBe(original.category);
		expect(copy.category.and).not.toBe(original.category.and);
		expect(copy.category.and[1]).not.toBe(original.category.and[1]);
		expect(copy.ids).not.toBe(original.ids);
		expect(copy.created).toBeInstanceOf(Date);
		expect(copy.created).not.toBe(original.created);
		expect(copy.created.getTime()).toBe(original.created.getTime());
	});

	test('keeps an own __proto__ key as data', () => {
		const original = JSON.parse('{"__proto__":{"polluted":true}}') as Record<
			string,
			unknown
		>;
		const copy = copyPlainData(original);

		expect(Object.hasOwn(copy, '__proto__')).toBe(true);
		expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
	});
});
