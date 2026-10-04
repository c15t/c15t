/**
 * Compact cookie projection for the notice dismissal: round trip through
 * the shared validator, reject malformed or future input, and never touch
 * the consent record.
 */
import { describe, expect, it } from 'vitest';

import { decodeNoticeDismissalCompact } from '../record-codec';
import { encodeNoticeDismissalCompact } from '../writer/encode';

const NOW = 1_800_000_000_000;

describe('notice dismissal compact projection', () => {
	it('round-trips with a percent-encoded fingerprint', () => {
		const record = {
			dismissedAt: NOW - 1,
			fingerprint: 'notice v1/&=|.%',
			version: 1 as const,
		};
		const text = encodeNoticeDismissalCompact(record);
		expect(text.startsWith('v=1&t=')).toBe(true);
		expect(decodeNoticeDismissalCompact(text, NOW)).toEqual({
			ok: true,
			record,
		});
	});

	it.each([
		['unknown version', 'v=2&t=1&f=x'],
		['future time', `v=1&t=${NOW + 1}&f=x`],
		['missing fingerprint', `v=1&t=${NOW - 1}`],
		['unknown field', `v=1&t=${NOW - 1}&f=x&z=1`],
		['duplicate field', `v=1&t=${NOW - 1}&t=${NOW - 2}&f=x`],
		['non-integer time', 'v=1&t=12.5&f=x'],
		['bad encoding', `v=1&t=${NOW - 1}&f=%E0%A4%A`],
	])('rejects %s', (_label, text) => {
		expect(decodeNoticeDismissalCompact(text, NOW).ok).toBe(false);
	});
});
