/**
 * Kernel positive correctness tests.
 *
 * These run against the public kernel implementation and must pass.
 */
import { describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../index';
import { choiceRecords, NOW } from './fixtures/kernel-fixtures';

describe('kernel: pure construction', () => {
	test('createConsentKernel() performs no window writes', () => {
		const writes = new Set<string | symbol>();
		const guardedWindow = new Proxy(
			{},
			{
				get: () => undefined,
				set(_target, prop) {
					writes.add(prop);
					return true;
				},
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

	test('createConsentKernel() installs no MutationObservers and no timers', () => {
		const observeCalls: number[] = [];
		class TrackingObserver {
			observe = vi.fn(() => {
				observeCalls.push(1);
			});
			disconnect = vi.fn();
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			takeRecords = () => [];
		}
		vi.stubGlobal('MutationObserver', TrackingObserver);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

		try {
			createConsentKernel({
				initialRecords: choiceRecords({ marketing: true }),
				now: NOW,
			});
			expect(observeCalls).toEqual([]);
			expect(timeoutSpy).not.toHaveBeenCalled();
		} finally {
			timeoutSpy.mockRestore();
			vi.unstubAllGlobals();
		}
	});
});

describe('kernel: snapshot identity', () => {
	test('getSnapshot() returns the same reference when no mutations occur', () => {
		const kernel = createConsentKernel();
		expect(kernel.getSnapshot()).toBe(kernel.getSnapshot());
	});

	test('snapshot is deeply frozen', () => {
		const kernel = createConsentKernel();
		const snap = kernel.getSnapshot();
		expect(Object.isFrozen(snap)).toBe(true);
		expect(Object.isFrozen(snap.effectivePermissions)).toBe(true);
		expect(Object.isFrozen(snap.overrides)).toBe(true);
		expect(Object.isFrozen(snap.promptRequirement)).toBe(true);
	});

	test('a recorded choice produces a new snapshot with incremented revision', async () => {
		const kernel = createConsentKernel();
		const before = kernel.getSnapshot();
		await kernel.commands.save({ marketing: true });
		const after = kernel.getSnapshot();

		expect(after).not.toBe(before);
		expect(after.revision).toBe(before.revision + 1);
		expect(after.effectivePermissions.marketing).toBe(true);
		expect(before.effectivePermissions.marketing).toBe(false);
	});

	test('a no-op save does NOT produce a new snapshot', async () => {
		const kernel = createConsentKernel();
		const before = kernel.getSnapshot();
		const result = await kernel.commands.save({ necessary: true });
		expect(result).toEqual({ confirmed: [], ok: true, subjectId: undefined });
		expect(kernel.getSnapshot()).toBe(before);
	});
});

describe('kernel: subscribe', () => {
	test('subscribers fire on state change', async () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		kernel.subscribe(listener);

		await kernel.commands.save({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0]?.effectivePermissions.marketing).toBe(
			true
		);

		// Draft staging does not touch the snapshot.
		kernel.set.draft({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);

		await kernel.commands.save({ marketing: false });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	test('unsubscribe stops future notifications', async () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		const unsubscribe = kernel.subscribe(listener);

		await kernel.commands.save({ marketing: true });
		unsubscribe();
		await kernel.commands.save({ marketing: false });

		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('kernel: commands', () => {
	test('save("all") grants every category in scope and records a choice', async () => {
		const kernel = createConsentKernel();
		const result = await kernel.commands.save('all');

		expect(result.ok).toBe(true);
		expect(result.confirmed).toEqual([
			'experience',
			'functionality',
			'marketing',
			'measurement',
		]);
		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.effectivePermissions).toEqual({
			experience: true,
			functionality: true,
			marketing: true,
			measurement: true,
			necessary: true,
		});
		expect(snap.promptRequirement).toEqual({ kind: 'none' });
	});

	test('save("none") keeps necessary, denies everything else', async () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true, measurement: true }),
		});
		await kernel.commands.save('none');
		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.effectivePermissions.necessary).toBe(true);
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.restrictions.marketing).toEqual(['explicit-denial']);
	});

	test('save(object) generates a subject id lazily and notifies once', async () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		kernel.subscribe(listener);

		await kernel.commands.save({ marketing: false });

		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.subject?.subjectId ?? null).toMatch(/^sub_/u);
		expect(snap.subject?.subjectId).toBe(snap.subject?.subjectId ?? null);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	test('identify writes user into snapshot', async () => {
		const kernel = createConsentKernel();
		await kernel.commands.identify({ externalId: 'user-42' });
		expect(kernel.getSnapshot().user?.externalId).toBe('user-42');
	});
});

describe('kernel: events', () => {
	test('choice:recorded fires on save with the confirmed coverage', async () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		kernel.events.on('choice:recorded', listener);

		await kernel.commands.save({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0]).toMatchObject({
			confirmed: ['marketing'],
			type: 'choice:recorded',
		});
	});

	test('events.on returns working unsubscribe', async () => {
		const kernel = createConsentKernel();
		const listener = vi.fn();
		const off = kernel.events.on('permissions:changed', listener);

		await kernel.commands.save({ marketing: true });
		off();
		await kernel.commands.save({ marketing: false });

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
