import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateSubjectId, isValidSubjectId } from '../generate-subject-id';

const decodeSubjectBytes = (id: string): number[] => {
	const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
	const encoded = id.slice(4);
	let value = BigInt(0);
	for (const character of encoded) {
		value = value * BigInt(58) + BigInt(alphabet.indexOf(character));
	}
	const bytes: number[] = [];
	while (value > BigInt(0)) {
		bytes.unshift(Number(value % BigInt(256)));
		value /= BigInt(256);
	}
	for (const character of encoded) {
		if (character !== '1') {
			break;
		}
		bytes.unshift(0);
	}
	return bytes;
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('generateSubjectId', () => {
	it.each([
		1_700_000_000_000,
		1_700_000_000_001,
		1_700_000_000_000 + 2 ** 32 - 1,
		1_700_000_000_000 + 2 ** 32,
		1_800_000_000_000,
		Number.MAX_SAFE_INTEGER,
	])('preserves timestamp and all random bytes at %s', (now) => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
		for (const fill of [0, 1, 255]) {
			const getRandomValues = vi.fn((bytes: Uint8Array) => {
				bytes.fill(fill);
				return bytes;
			});
			vi.stubGlobal('crypto', { getRandomValues });
			const expected = new Uint8Array(20).fill(fill);
			const timestamp = now - 1_700_000_000_000;
			const view = new DataView(expected.buffer);
			view.setUint32(0, Math.floor(timestamp / 2 ** 32), false);
			view.setUint32(4, timestamp % 2 ** 32, false);

			expect(decodeSubjectBytes(generateSubjectId())).toEqual([...expected]);
			expect(getRandomValues).toHaveBeenCalledTimes(1);
		}
	});

	it('preserves mixed random bytes without changing the entropy request', () => {
		const now = 1_800_000_000_000;
		vi.spyOn(Date, 'now').mockReturnValue(now);
		let seed = 1025;
		for (let sample = 0; sample < 64; sample += 1) {
			const random = new Uint8Array(20);
			for (let index = 0; index < random.length; index += 1) {
				seed = (seed * 1_664_525 + 1_013_904_223) % 2 ** 32;
				random[index] = Math.floor(seed / 2 ** 24);
			}
			const getRandomValues = vi.fn((bytes: Uint8Array) => {
				expect(bytes.byteLength).toBe(20);
				bytes.set(random);
				return bytes;
			});
			vi.stubGlobal('crypto', { getRandomValues });
			const expected = random.slice();
			const timestamp = now - 1_700_000_000_000;
			const view = new DataView(expected.buffer);
			view.setUint32(0, Math.floor(timestamp / 2 ** 32), false);
			view.setUint32(4, timestamp % 2 ** 32, false);

			expect(decodeSubjectBytes(generateSubjectId())).toEqual([...expected]);
			expect(getRandomValues).toHaveBeenCalledTimes(1);
		}
	});

	it('propagates secure randomness failures', () => {
		const error = new Error('Randomness unavailable');
		vi.stubGlobal('crypto', {
			getRandomValues: () => {
				throw error;
			},
		});
		expect(generateSubjectId).toThrow(error);
	});

	it('should generate an ID with sub_ prefix', () => {
		const id = generateSubjectId();
		expect(id.startsWith('sub_')).toBe(true);
	});

	it('should generate unique IDs', () => {
		const ids = new Set<string>();
		for (let i = 0; i < 1000; i += 1) {
			ids.add(generateSubjectId());
		}
		expect(ids.size).toBe(1000);
	});

	it('should generate IDs with valid base58 characters', () => {
		const BASE58_ALPHABET =
			'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

		for (let i = 0; i < 100; i += 1) {
			const id = generateSubjectId();
			const encoded = id.slice(4);

			for (const char of encoded) {
				expect(BASE58_ALPHABET.includes(char)).toBe(true);
			}
		}
	});

	it('should generate IDs that are unique when generated back to back', () => {
		const id1 = generateSubjectId();
		const id2 = generateSubjectId();

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
