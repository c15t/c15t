import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import { expect, it } from 'vitest';

import {
	assertRepeatVisitor,
	createRepeatVisitorCookie,
} from '../../nuxt-browser-bench/scripts/repeat-visitor';

it.each([Date.UTC(2025, 0, 1), Date.UTC(2030, 0, 1)])(
	'restores the real repeat-visitor cookie at %s',
	(now) => {
		const records = readStoredRecordsFromCookieHeader(
			`c15t=${createRepeatVisitorCookie(now)}`,
			undefined,
			now
		);
		expect(records.choice).not.toBeNull();
		expect(records.subject?.subjectId).toBe('sub_2VZxR7YmNpKq3WfLs8TgHd');
		expect(records.choice?.categories).toEqual(
			Object.fromEntries(
				['functionality', 'experience', 'measurement', 'marketing'].map(
					(category) => [
						category,
						{
							basis: { kind: 'legacy-v2' },
							confirmedAt: now - 60_000,
							value: true,
						},
					]
				)
			)
		);
	}
);

const restored = {
	bannerCount: 0,
	bannerInFirstHtml: false,
	hasStoredChoice: true,
};

it('accepts a restored visitor without a banner', () => {
	expect(() => assertRepeatVisitor(restored)).not.toThrow();
});

it.each([
	{ hasStoredChoice: false },
	{ hasStoredChoice: undefined },
	{ bannerInFirstHtml: true },
	{ bannerCount: 1 },
])('rejects a repeat measurement with invalid state: %j', (observation) => {
	expect(() => assertRepeatVisitor({ ...restored, ...observation })).toThrow(
		'Repeat visitor did not restore a stored choice without a banner'
	);
});
