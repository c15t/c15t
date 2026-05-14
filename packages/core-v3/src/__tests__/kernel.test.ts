/**
 * v3 kernel — positive correctness tests.
 *
 * These run against the actual v3 kernel and must PASS. Separately,
 * packages/core/src/__tests__/v3-correctness-gates.test.ts still runs
 * against the v2 code with `test.fails` — those gates will be flipped to
 * run against the v3 kernel here once the adapter rewrite lands.
 */
import { describe, expect, test, vi } from 'vitest';
import { createConsentKernel } from '../index';

describe('v3 kernel: pure construction', () => {
	test('createConsentKernel() performs no window writes', () => {
		const writes = new Set<string | symbol>();
		const guardedWindow = new Proxy(
			{},
			{
				set(_target, prop) {
					writes.add(prop);
					return true;
				},
				get: () => undefined,
			}
		);
		vi.stubGlobal('window', guardedWindow);

		try {
			createConsentKernel();
			expect(writes.size).toBe(0);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	test('createConsentKernel() performs no network calls', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		vi.stubGlobal('fetch', fetchSpy);

		try {
			createConsentKernel();
			await Promise.resolve();
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	test('createConsentKernel() installs no MutationObservers', () => {
		const observeCalls: number[] = [];
		class TrackingObserver {
			observe = vi.fn(() => {
				observeCalls.push(1);
			});
			disconnect = vi.fn();
			takeRecords = () => [];
		}
		vi.stubGlobal('MutationObserver', TrackingObserver);

		try {
			createConsentKernel();
			expect(observeCalls).toEqual([]);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('v3 kernel: snapshot identity', () => {
	test('getSnapshot() returns the same reference when no mutations occur', () => {
		const kernel = createConsentKernel();
		const a = kernel.getSnapshot();
		const b = kernel.getSnapshot();
		expect(a).toBe(b);
	});

	test('snapshot is deeply frozen', () => {
		const kernel = createConsentKernel();
		const snap = kernel.getSnapshot();
		expect(Object.isFrozen(snap)).toBe(true);
		expect(Object.isFrozen(snap.consents)).toBe(true);
		expect(Object.isFrozen(snap.overrides)).toBe(true);
	});

	test('mutation produces a new snapshot with incremented revision', () => {
		const kernel = createConsentKernel();
		const before = kernel.getSnapshot();
		kernel.set.consent({ marketing: true });
		const after = kernel.getSnapshot();

		expect(after).not.toBe(before);
		expect(after.revision).toBe(before.revision + 1);
		expect(after.consents.marketing).toBe(true);
		expect(before.consents.marketing).toBe(false);
	});

	test('no-op mutation does NOT produce a new snapshot', () => {
		const kernel = createConsentKernel();
		const before = kernel.getSnapshot();
		kernel.set.consent({ necessary: true }); // already true
		const after = kernel.getSnapshot();

		expect(after).toBe(before);
		expect(after.revision).toBe(before.revision);
	});
});

describe('v3 kernel: subscribe', () => {
	test('subscribers fire on state change', () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		kernel.subscribe(listener);

		kernel.set.consent({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0]?.consents.marketing).toBe(true);

		kernel.set.consent({ marketing: true }); // no-op
		expect(listener).toHaveBeenCalledTimes(1);

		kernel.set.consent({ marketing: false });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	test('unsubscribe stops future notifications', () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		const unsubscribe = kernel.subscribe(listener);

		kernel.set.consent({ marketing: true });
		unsubscribe();
		kernel.set.consent({ marketing: false });

		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('v3 kernel: commands', () => {
	test('save("all") flips every category true and marks hasConsented', async () => {
		const kernel = createConsentKernel();
		const result = await kernel.commands.save('all');

		expect(result.ok).toBe(true);
		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.consents.marketing).toBe(true);
		expect(snap.consents.measurement).toBe(true);
		expect(snap.consents.experience).toBe(true);
		expect(snap.consents.functionality).toBe(true);
	});

	test('save("none") keeps necessary, clears everything else', async () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true, measurement: true },
		});
		await kernel.commands.save('none');
		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.consents.necessary).toBe(true);
		expect(snap.consents.marketing).toBe(false);
		expect(snap.consents.measurement).toBe(false);
	});

	test('identify writes user into snapshot', async () => {
		const kernel = createConsentKernel();
		await kernel.commands.identify({ externalId: 'user-42' });
		expect(kernel.getSnapshot().user?.externalId).toBe('user-42');
	});
});

describe('v3 kernel: events', () => {
	test('events.on("consent:set") fires on set.consent', () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		kernel.events.on('consent:set', listener);

		kernel.set.consent({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0]?.type).toBe('consent:set');
	});

	test('events.on returns working unsubscribe', () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		const off = kernel.events.on('consent:set', listener);

		kernel.set.consent({ marketing: true });
		off();
		kernel.set.consent({ marketing: false });

		expect(listener).toHaveBeenCalledTimes(1);
	});

	test('init command emits started + completed', async () => {
		const kernel = createConsentKernel();
		const events: string[] = [];
		kernel.events.on('command:init:started', () => events.push('started'));
		kernel.events.on('command:init:completed', () => events.push('completed'));

		await kernel.commands.init();
		expect(events).toEqual(['started', 'completed']);
	});
});
