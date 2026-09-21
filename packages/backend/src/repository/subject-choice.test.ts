import { assert, describe, it } from 'vitest';

import {
	decodeStoredVendorChoice,
	mergeSubjectVendorChoice,
} from './subject-choice';

const grants = (id: string, granted: boolean, confirmedAt: number) => ({
	confirmedAt,
	grants: { [id]: granted },
	version: 1 as const,
});

describe('mergeSubjectVendorChoice', () => {
	it('lets the latest act by givenAt decide the vendors it names', () => {
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
		assert.deepStrictEqual(merged, {
			confirmedAt: 1,
			grants: { a: true },
			version: 1,
		});
	});

	it('keeps an earlier decision for a vendor the latest act omits', () => {
		// The later act came from a client on an older vendor list: it never saw
		// `b`, so its silence must not drop the denial another tab recorded.
		const merged = mergeSubjectVendorChoice([
			{
				givenAt: new Date(1),
				id: 'cns_1',
				type: 'cookie_banner',
				vendorChoice: {
					kind: 'grants',
					vendorChoice: {
						confirmedAt: 1,
						grants: { a: true, b: false },
						version: 1,
					},
				},
			},
			{
				givenAt: new Date(2),
				id: 'cns_2',
				type: 'cookie_banner',
				vendorChoice: { kind: 'grants', vendorChoice: grants('a', false, 2) },
			},
		]);
		// The composite is dated by its oldest surviving decision, so the
		// retained `b` is never presented as newer than it is.
		assert.deepStrictEqual(merged, {
			confirmedAt: 1,
			grants: { a: false, b: false },
			version: 1,
		});
	});

	it('takes the latest time when the latest act names every vendor', () => {
		const merged = mergeSubjectVendorChoice([
			{
				givenAt: new Date(1),
				id: 'cns_1',
				type: 'cookie_banner',
				vendorChoice: {
					kind: 'grants',
					vendorChoice: {
						confirmedAt: 1,
						grants: { a: true, b: false },
						version: 1,
					},
				},
			},
			{
				givenAt: new Date(2),
				id: 'cns_2',
				type: 'cookie_banner',
				vendorChoice: {
					kind: 'grants',
					vendorChoice: {
						confirmedAt: 2,
						grants: { a: false, b: true },
						version: 1,
					},
				},
			},
		]);
		assert.deepStrictEqual(merged, {
			confirmedAt: 2,
			grants: { a: false, b: true },
			version: 1,
		});
	});

	it('dates an aggregate of empty maps by the latest act', () => {
		// A valid map may name no vendor at all. There is then no per-vendor
		// time to take the oldest of, and the read must still produce a
		// bounded timestamp or the subject route fails its output schema.
		const empty = (confirmedAt: number) => ({
			confirmedAt,
			grants: {},
			version: 1 as const,
		});
		const merged = mergeSubjectVendorChoice([
			{
				givenAt: new Date(1),
				id: 'cns_1',
				type: 'cookie_banner',
				vendorChoice: { kind: 'grants', vendorChoice: empty(5) },
			},
			{
				givenAt: new Date(2),
				id: 'cns_2',
				type: 'cookie_banner',
				vendorChoice: { kind: 'grants', vendorChoice: empty(7) },
			},
		]);
		assert.deepStrictEqual(merged, { confirmedAt: 7, grants: {}, version: 1 });
		assert.isTrue(Number.isFinite(merged?.confirmedAt));
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

	it('reads a stored JSON null as an absent map, on text columns too', () => {
		assert.deepStrictEqual(decodeStoredVendorChoice(null), { kind: 'absent' });
		assert.deepStrictEqual(decodeStoredVendorChoice('null'), {
			kind: 'absent',
		});
		assert.deepStrictEqual(decodeStoredVendorChoice('{}'), {
			kind: 'unreadable',
		});
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
