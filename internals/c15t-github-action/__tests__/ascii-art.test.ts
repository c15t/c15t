import { describe, expect, it } from 'vitest';

import { ASCII_SET, BRAILLE_SPACE, LEFT_PAD } from '../src/steps/ascii-art';

describe('ascii-art constants', () => {
	it('ASCII_SET is non-empty and entries have art and weight', () => {
		expect(Array.isArray(ASCII_SET)).toBe(true);
		expect(ASCII_SET.length).toBeGreaterThan(0);
		for (const entry of ASCII_SET) {
			expect(typeof entry.art).toBe('string');
			expect(typeof entry.weight).toBe('number');
		}
	});

	it('constants exported', () => {
		expect(BRAILLE_SPACE).toBeTypeOf('string');
		expect(LEFT_PAD).toBeTypeOf('string');
	});
});
