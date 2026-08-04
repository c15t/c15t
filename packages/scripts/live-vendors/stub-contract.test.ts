/**
 * @vitest-environment jsdom
 *
 * Replays the live monitor's two stub-side contracts without touching the
 * network, so they hold on every PR instead of once a vendor probe runs.
 *
 * jsdom never fetches or executes the remote loader, which is precisely the
 * state both contracts are about: bootstrapped, nothing else.
 *
 * 1. Every `bootstrapCheck` must pass. Bootstrap state is a pure function of
 *    our own manifest, and several of these checks transcribe a vendor's
 *    duplicate-install guard — the predicate their loader applies before it
 *    will install over our stub. Failing one means the vendor silently never
 *    starts in production, with a 200 loader and no console error.
 * 2. Every `runtimeCheck` must fail. The runtime phase is the only signal that
 *    catches a vendor refusing to install, so a check our own stub already
 *    satisfies protects nothing and reports green forever.
 */
import { describe, expect, it } from 'vitest';
import {
	loadScripts,
	registerVendorContractCleanup,
} from '../src/e2e-test-utils';
import type { LiveVendorProbeConfig } from './types';
import { liveVendorProbeConfigs } from './vendors';

/** Grants every category — the stub a fully consenting visitor would see. */
const allGranted = {
	necessary: true,
	functionality: true,
	measurement: true,
	marketing: true,
	experience: true,
};

function configsDeclaring(
	key: 'bootstrapCheck' | 'runtimeCheck'
): [string, LiveVendorProbeConfig][] {
	return liveVendorProbeConfigs
		.filter(
			(config) =>
				config.tier !== 'skip' && config.createScript?.() && config[key]
		)
		.map((config) => [config.vendor, config]);
}

/** Bootstraps a vendor with the remote loader never executing. */
function bootstrapOnly(config: LiveVendorProbeConfig): void {
	const script = config.createScript?.();
	expect(script, `${config.vendor} must build a script`).toBeDefined();
	if (script) {
		loadScripts([script], allGranted);
	}
}

const bootstrapConfigs = configsDeclaring('bootstrapCheck');
const runtimeConfigs = configsDeclaring('runtimeCheck');

describe('vendor stub contracts', () => {
	registerVendorContractCleanup();

	it('replays a meaningful number of vendor contracts', () => {
		expect(bootstrapConfigs.length).toBeGreaterThan(0);
		expect(runtimeConfigs.length).toBeGreaterThan(0);
	});

	it('requires the real PostHog loader to replay a snippet queue', () => {
		const config = liveVendorProbeConfigs.find(
			(candidate) => candidate.vendor === 'posthog'
		);
		expect(config).toBeDefined();

		const queue = [] as unknown[] & { _i?: unknown[][] };
		queue._i = [['phc_test', {}, 'posthog']];
		window.posthog = queue as unknown as Window['posthog'];

		expect(config?.bootstrapCheck?.().ok).toBe(true);
		const replayProbe = queue.at(-1);
		expect(replayProbe).toBeTypeOf('function');
		if (typeof replayProbe === 'function') {
			replayProbe();
		}

		window.posthog = {
			init: () => undefined,
			opt_in_capturing: () => undefined,
			opt_out_capturing: () => undefined,
			get_explicit_consent_status: () => 'granted',
			capture: () => undefined,
			__loaded: true,
		} as Window['posthog'];

		expect(config?.runtimeCheck?.().ok).toBe(true);

		delete (window as unknown as Record<string, unknown>)
			.__c15tPosthogQueueReplayExpected;
		delete (window as unknown as Record<string, unknown>)
			.__c15tPosthogQueueReplayed;
	});

	describe('bootstrap stubs satisfy their vendor contract', () => {
		it.each(bootstrapConfigs)('%s', (_vendor, config) => {
			bootstrapOnly(config);

			const result = config.bootstrapCheck?.();

			expect(
				result?.ok,
				`${config.vendor}: bootstrapCheck fails against our own bootstrap — ${result?.detail ?? 'no detail'}`
			).toBe(true);
		});
	});

	describe('runtime checks reject the bootstrap stub', () => {
		// Vendors declaring `runtimeReplacedGlobals` are structurally protected:
		// the harness compares the global against its pre-load identity before
		// any custom check runs, which the stub can never satisfy. Their
		// `runtimeCheck` is then free to be a plain shape assertion.
		const unprotected = runtimeConfigs.filter(
			([, config]) => (config.runtimeReplacedGlobals?.length ?? 0) === 0
		);

		it.each(unprotected)('%s', (_vendor, config) => {
			bootstrapOnly(config);

			const result = config.runtimeCheck?.();

			expect(
				result?.ok,
				`${config.vendor}: runtimeCheck passes against the bootstrap stub alone, so the live monitor would report this vendor healthy even if its SDK stopped installing. Assert a marker only the vendor runtime can set, or declare runtimeReplacedGlobals.`
			).toBe(false);
		});
	});
});
