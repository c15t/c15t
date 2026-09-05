/**
 * Compact cookie projections for the notice dismissal and the privacy
 * directives: round trip through the shared validators, reject malformed
 * or future input, and never touch the consent record.
 */
import { describe, expect, it } from 'vitest';

import {
	decodeNoticeDismissalCompact,
	decodePrivacyOptOutsCompact,
	encodeNoticeDismissalCompact,
	encodePrivacyOptOutsCompact,
} from '../record-codec';

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

describe('privacy opt-out compact projection', () => {
	it('round-trips sorted categories and several directives', () => {
		const directives = [
			{
				categories: ['marketing', 'measurement'] as const,
				recordedAt: NOW - 2,
				source: 'gpc' as const,
			},
			{
				categories: ['functionality'] as const,
				recordedAt: NOW - 1,
				source: 'gpc' as const,
			},
		];
		const text = encodePrivacyOptOutsCompact({ directives, version: 1 });
		expect(text).toBe(`v=1&d=gpc.${NOW - 2}.mk-me|gpc.${NOW - 1}.fn`);
		expect(decodePrivacyOptOutsCompact(text, NOW)).toEqual({
			ok: true,
			record: {
				directives: directives.map((directive) => ({
					...directive,
					categories: [...directive.categories],
				})),
				version: 1,
			},
		});
	});

	it('an empty directive list round-trips', () => {
		expect(decodePrivacyOptOutsCompact('v=1', NOW)).toEqual({
			ok: true,
			record: { directives: [], version: 1 },
		});
	});

	it.each([
		['unknown source', `v=1&d=other.${NOW - 1}.mk`],
		['unknown category code', `v=1&d=gpc.${NOW - 1}.zz`],
		['necessary', `v=1&d=gpc.${NOW - 1}.necessary`],
		['duplicate category', `v=1&d=gpc.${NOW - 1}.mk-mk`],
		['future time', `v=1&d=gpc.${NOW + 1}.mk`],
		['extra tuple part', `v=1&d=gpc.${NOW - 1}.mk.extra`],
		['unknown version', `v=9&d=gpc.${NOW - 1}.mk`],
	])('rejects %s', (_label, text) => {
		expect(decodePrivacyOptOutsCompact(text, NOW).ok).toBe(false);
	});
});
