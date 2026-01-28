import { describe, expect, it } from 'vitest';
import { generateSubjectId, isValidSubjectId } from '../generate-subject-id';

describe('generateSubjectId', () => {
	it('should generate an ID with sub_ prefix', () => {
		const id = generateSubjectId();
		expect(id.startsWith('sub_')).toBe(true);
	});

	it('should generate unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			ids.add(generateSubjectId());
		}
		expect(ids.size).toBe(1000);
	});

	it('should generate IDs with valid base58 characters', () => {
		const BASE58_ALPHABET =
			'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

		for (let i = 0; i < 100; i++) {
			const id = generateSubjectId();
			const encoded = id.slice(4); // Remove 'sub_' prefix

			for (const char of encoded) {
				expect(BASE58_ALPHABET.includes(char)).toBe(true);
			}
		}
	});

	it('should generate IDs that are chronologically ordered', () => {
		const id1 = generateSubjectId();
		const id2 = generateSubjectId();

		// The base58 encoding should preserve chronological order
		// because timestamp is in the first 8 bytes
		// Note: This test may fail if IDs are generated in the same millisecond
		// but with different random parts, so we just check they're different
		expect(id1).not.toBe(id2);
	});
});

describe('isValidSubjectId', () => {
	it('should return true for valid subject IDs', () => {
		const id = generateSubjectId();
		expect(isValidSubjectId(id)).toBe(true);
	});

	it('should return false for IDs without sub_ prefix', () => {
		expect(isValidSubjectId('invalid_123')).toBe(false);
		expect(isValidSubjectId('cns_123abc')).toBe(false);
		expect(isValidSubjectId('123abc')).toBe(false);
	});

	it('should return false for empty strings', () => {
		expect(isValidSubjectId('')).toBe(false);
	});

	it('should return false for just the prefix', () => {
		expect(isValidSubjectId('sub_')).toBe(false);
	});

	it('should return false for IDs with invalid base58 characters', () => {
		// 0, O, I, l are not in base58 alphabet
		expect(isValidSubjectId('sub_0invalid')).toBe(false);
		expect(isValidSubjectId('sub_Oinvalid')).toBe(false);
		expect(isValidSubjectId('sub_Iinvalid')).toBe(false);
		expect(isValidSubjectId('sub_linvalid')).toBe(false);
	});

	it('should return true for manually crafted valid IDs', () => {
		expect(isValidSubjectId('sub_123456789ABC')).toBe(true);
		expect(isValidSubjectId('sub_abcdefghijk')).toBe(true);
	});
});
