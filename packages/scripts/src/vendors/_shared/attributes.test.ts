import { describe, expect, it } from 'vitest';
import { booleanDataAttribute, listDataAttribute } from './attributes';

describe('vendor attribute helpers', () => {
	describe('booleanDataAttribute', () => {
		it('omits undefined values', () => {
			expect(booleanDataAttribute(undefined)).toBeUndefined();
		});

		it('serializes booleans as data attribute strings', () => {
			expect(booleanDataAttribute(true)).toBe('true');
			expect(booleanDataAttribute(false)).toBe('false');
		});
	});

	describe('listDataAttribute', () => {
		it('omits undefined values', () => {
			expect(listDataAttribute(undefined)).toBeUndefined();
		});

		it('passes through strings', () => {
			expect(listDataAttribute('example.com')).toBe('example.com');
		});

		it('joins arrays with commas', () => {
			expect(listDataAttribute(['example.com', 'www.example.com'])).toBe(
				'example.com,www.example.com'
			);
		});
	});
});
