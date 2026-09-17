/**
 * Subject ids pinned byte for byte.
 *
 * These cases are the shared contract between this function and the two native
 * cores: `native/core-android` and `native/core-swift` assert the same inputs and
 * the same strings in their own suites. The backend decides with `subjectIdSchema`
 * in `@c15t/schema`, so an encoder change that moves these outputs would have to be
 * made in all three places at once, and this test is what makes changing only one of
 * them a build failure.
 *
 * Each case is the 12 random bytes, the wall clock in epoch milliseconds, and the id.
 * The clock is the *reading* the generator is pinned to, not the offset it encodes:
 * every implementation subtracts the custom epoch itself, the way `generateSubjectId`
 * subtracts `EPOCH_TIMESTAMP` from `Date.now()`. The literal is easy to misread as an
 * offset, and reading it that way still produces a well formed `sub_` id, so only the
 * expected string catches the mistake.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateSubjectId } from '../generate-subject-id';

/**
 * The random half as bytes. `generateSubjectId` fills all 20 bytes from the CSPRNG
 * and then writes the timestamp over the first eight, so a stub only has to supply
 * the tail.
 */
const fromHex = (hex: string): number[] => {
	const bytes: number[] = [];
	for (let index = 0; index < hex.length; index += 2) {
		bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
	}
	return bytes;
};

const CASES = [
	{
		bytes: '000000000000000000000000',
		id: 'sub_4Zrjtb44miwSTU2EYMYtuVWfaAPR',
		nowMillis: 1,
	},
	{
		bytes: '000000000000000000000001',
		id: 'sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc',
		nowMillis: 58_123_456_789,
	},
	{
		bytes: 'ffffffffffffffffffffffff',
		id: 'sub_4ZrjtiRsJnoasFgQkJmLeDNrs7fC',
		nowMillis: 58_123_456_789,
	},
	// A clock set before the epoch: the offset is negative and still encodes as
	// two's complement, which is the case a native port is most likely to get wrong.
	{
		bytes: '01096a7b8c9d0e1f20ab11cd',
		id: 'sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk',
		nowMillis: -100_000_000_000,
	},
	{
		bytes: 'a1b2c3d4e5f60718293a4b5c',
		id: 'sub_4ZrjtiRsJnoZ63G1p3FjTdWdHA6P',
		nowMillis: 58_123_456_789,
	},
	// A clock ahead of the epoch, which is every real device. The five above are all
	// behind it, so without this one an encoder that handles only negative offsets
	// would pass the whole table.
	{
		bytes: '9a0f1c2b3d4e5f60718293ab',
		id: 'sub_4ZrjtmCtGLiMkPniH4rf1naxRKTp',
		nowMillis: 80_000_000_000,
	},
	// One millisecond past the epoch: seven zero bytes in front of the offset, so
	// seven `1`s in front of the digits.
	{
		bytes: '000000000000000000000000',
		id: 'sub_11111115qCHTcgbQwpvYZQ9d',
		nowMillis: 1_700_000_000_001,
	},
	// The one input where the division loop never runs, so the leading zeros are the
	// whole encoding.
	{
		bytes: '000000000000000000000000',
		id: 'sub_11111111111111111111',
		nowMillis: 1_700_000_000_000,
	},
] as const;

const pin = (bytes: number[], nowMillis: number): void => {
	vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
		<BufferSource>(buffer: BufferSource): BufferSource => {
			// A view, never `new Uint8Array(buffer)`: called with a typed array that
			// constructor copies, and the copy would leave the caller's buffer zeros.
			const target =
				buffer instanceof ArrayBuffer
					? new Uint8Array(buffer)
					: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
			for (let index = 0; index < 12; index += 1) {
				target[8 + index] = bytes[index] ?? 0;
			}
			return buffer;
		}
	);
	vi.spyOn(Date, 'now').mockReturnValue(nowMillis);
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('generateSubjectId cross-language vectors', () => {
	it.each(CASES)(
		'encodes $bytes at clock $nowMillis',
		({ bytes, id, nowMillis }: (typeof CASES)[number]) => {
			pin(fromHex(bytes), nowMillis);

			expect(generateSubjectId()).toBe(id);
		}
	);
});
