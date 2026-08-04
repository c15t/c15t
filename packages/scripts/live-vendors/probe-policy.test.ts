import { describe, expect, it } from 'vitest';
import { assertsRuntime, digestBody } from './probe-policy';
import { liveVendorProbeConfigs } from './vendors';

const ok = () => ({ ok: true, detail: 'stub' });

describe('assertsRuntime', () => {
	it('always asserts runtime at full tier', () => {
		expect(assertsRuntime({ tier: 'full' })).toBe(true);
	});

	it('asserts runtime for a loader-only vendor that declares a check', () => {
		// The gap the tier-only gate left: a declared `runtimeCheck` that never
		// ran, reporting coverage the monitor was not actually performing.
		expect(assertsRuntime({ tier: 'loader-only' })).toBe(false);
		expect(assertsRuntime({ tier: 'loader-only', runtimeCheck: ok })).toBe(
			true
		);
		expect(
			assertsRuntime({
				tier: 'loader-only',
				runtimeReplacedGlobals: ['va'],
			})
		).toBe(true);
	});

	it('never asserts runtime for a skipped vendor without checks', () => {
		expect(assertsRuntime({ tier: 'skip' })).toBe(false);
	});

	it('agrees with the documented gap list across the real configs', () => {
		// Ties the gate to `vendors.test.ts`'s snapshot: a vendor is a documented
		// runtime gap exactly when this gate declines to assert runtime for it.
		const notAsserted = liveVendorProbeConfigs
			.filter((config) => config.tier !== 'skip' && !assertsRuntime(config))
			.map((config) => config.vendor);

		for (const vendor of notAsserted) {
			const config = liveVendorProbeConfigs.find((c) => c.vendor === vendor);
			expect(
				config?.notes,
				`${vendor} is not runtime-asserted and must document the gap`
			).toBeTypeOf('string');
		}
	});
});

describe('digestBody', () => {
	it('returns the first 16 hex characters of the body SHA-256', () => {
		// Fixed vector: sha256('') = e3b0c44298fc1c14...
		expect(digestBody(new Uint8Array())).toBe('e3b0c44298fc1c14');
		expect(digestBody(new Uint8Array())).toHaveLength(16);
	});

	it('distinguishes two loader bundles that differ by one byte', () => {
		// The whole point of recording it: telling "same bundle as the last green
		// run" from "upstream shipped something new".
		const before = new TextEncoder().encode('!function(){var a=1}();');
		const after = new TextEncoder().encode('!function(){var a=2}();');

		expect(digestBody(before)).not.toBe(digestBody(after));
	});

	it('digests Buffer and Uint8Array views of the same bytes identically', () => {
		// `loaderResponseDetails` hands it a Playwright Buffer; the Node fetch
		// fallback hands it a Uint8Array. Both must digest to the same value or
		// the two code paths would report different bundles for one response.
		const bytes = new TextEncoder().encode('console.log("loader")');

		expect(digestBody(Buffer.from(bytes))).toBe(digestBody(bytes));
	});
});
