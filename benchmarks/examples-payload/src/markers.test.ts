import { describe, expect, it } from 'vitest';

import {
	STATIC_MARKERS,
	findBoundaries,
	markerTableFor,
	snapshotMarkersOf,
} from './markers';

const manifest = {
	policyPacks: [
		{ fingerprints: { policy: 'aaa111' }, rule: { id: 'europe_opt_in' } },
		{ fingerprints: { policy: 'bbb222' }, rule: { id: 'world_none' } },
	],
	revision: 'rev999',
};

describe('snapshotMarkersOf', () => {
	it('uses the revision and policy fingerprints, not policy ids', () => {
		expect(snapshotMarkersOf(manifest)).toEqual(['rev999', 'aaa111', 'bbb222']);
	});

	it('skips the fingerprint of the policy /init resolves, which SSR pages carry', () => {
		const init = { policyResolution: { fingerprints: { policy: 'aaa111' } } };
		expect(snapshotMarkersOf(manifest, init)).toEqual(['rev999', 'bbb222']);
	});

	it('reads policy-rule manifests too', () => {
		expect(
			snapshotMarkersOf({ policyRules: [{ fingerprints: { policy: 'ccc' } }] })
		).toEqual(['ccc']);
	});

	it('refuses a manifest it could never detect', () => {
		expect(() => snapshotMarkersOf({ revision: 3 })).toThrow(
			'no revision or unresolved policy fingerprints'
		);
	});
});

describe('findBoundaries', () => {
	const markers = markerTableFor(manifest);

	it('finds nothing in unrelated code', () => {
		expect(findBoundaries('console.log("europe_opt_in")', markers)).toEqual([]);
	});

	it('finds an inlined snapshot by any of its markers', () => {
		expect(findBoundaries('const s={"policy":"bbb222"}', markers)).toEqual([
			'snapshotBytes',
		]);
	});

	it('reports every boundary a chunk carries', () => {
		const chunk = [
			'throw new Error("createManifestTransport: either `manifest` or `manifestURL` is required.")',
			'{id:"quebec_opt_in"}',
			'{title:"Wir respektieren deine Privatsph\\xE4re."}',
			'window.__tcfapi=function(){}',
			'className:"c15t-dev-tools__panel"',
		].join(';');
		expect(findBoundaries(chunk, markers).sort()).toEqual(
			[
				'devtoolsBytes',
				'iabBytes',
				'nonEnLocaleBytes',
				'offlinePolicyBytes',
				'resolverBytes',
			].sort()
		);
	});

	it('keeps every static marker ASCII, since minifiers may escape the rest', () => {
		for (const marker of Object.values(STATIC_MARKERS).flat()) {
			expect(marker).toMatch(/^[ -~]+$/u);
		}
	});
});
