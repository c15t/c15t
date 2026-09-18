import { assert, describe, it } from 'vitest';

import { mergeSubjectVendorChoice } from './subject-choice';

const grants = (id: string, granted: boolean, confirmedAt: number) => ({
	confirmedAt,
	grants: { [id]: granted },
	version: 1 as const,
});

describe('mergeSubjectVendorChoice', () => {
	it('returns the map of the latest act by givenAt', () => {
		const merged = mergeSubjectVendorChoice([
			{
				givenAt: new Date(2),
				id: 'cns_1',
				type: 'cookie_banner',
				vendorChoice: { kind: 'grants', vendorChoice: grants('a', true, 1) },
			},
			{
				givenAt: new Date(1),
				id: 'cns_2',
				type: 'cookie_banner',
				vendorChoice: { kind: 'grants', vendorChoice: grants('a', false, 9) },
			},
		]);
		assert.deepStrictEqual(merged?.grants, { a: true });
	});

	it('skips acts without a map but not an unreadable newer one', () => {
		const older = {
			givenAt: new Date(1),
			id: 'cns_1',
			type: 'cookie_banner',
			vendorChoice: {
				kind: 'grants' as const,
				vendorChoice: grants('a', false, 1),
			},
		};
		assert.deepStrictEqual(
			mergeSubjectVendorChoice([
				older,
				{
					givenAt: new Date(2),
					id: 'cns_2',
					type: 'cookie_banner',
					vendorChoice: { kind: 'absent' },
				},
			])?.grants,
			{ a: false }
		);
		assert.isNull(
			mergeSubjectVendorChoice([
				older,
				{
					givenAt: new Date(2),
					id: 'cns_2',
					type: 'cookie_banner',
					vendorChoice: { kind: 'unreadable' },
				},
			])
		);
	});

	it('breaks a givenAt tie by row id regardless of query order', () => {
		const rows = [
			{
				givenAt: new Date(5),
				id: 'cns_a',
				type: 'cookie_banner',
				vendorChoice: {
					kind: 'grants' as const,
					vendorChoice: grants('a', true, 5),
				},
			},
			{
				givenAt: new Date(5),
				id: 'cns_b',
				type: 'cookie_banner',
				vendorChoice: {
					kind: 'grants' as const,
					vendorChoice: grants('a', false, 5),
				},
			},
		];
		assert.deepStrictEqual(mergeSubjectVendorChoice(rows)?.grants, {
			a: false,
		});
		assert.deepStrictEqual(
			mergeSubjectVendorChoice([...rows].reverse())?.grants,
			{ a: false }
		);
	});
});
