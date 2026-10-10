/**
 * @vitest-environment jsdom
 *
 * Persistence before its write code has landed. Hydration is synchronous
 * and needs none of it; everything that writes, clears or reconciles waits
 * for the code and runs when it lands, and a save waits for the write it
 * belongs to.
 *
 * The setup file preloads the page's write code, so a handle created with
 * the default loader writes as before; the tests use one to seed storage.
 * The handle under test gets a loader whose code lands on `land()`.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createKernel as createConsentKernel } from '../../../kernel';
import type { InternalKernel } from '../../../kernel/internals';
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../../../libs/storage-keys';
import type { SaveResult } from '../../../types';
import { watchRevocationReload } from '../../revocation-reload';
import { createScriptLoader } from '../../script-loader';
import { mountPersistence as createPersistence } from '../mount';
import { readStoredConsentRecord } from '../record-storage';
import { createWriterLoader } from '../writer-loader';
import type { WriterLoader } from '../writer-loader';
import { clearStoredConsentRecords } from './record-writes';

/** A loader whose write code lands on `land()`; `fail()` fails the next load. */
const heldBackLoader = function heldBackLoader(): {
	loader: WriterLoader;
	land: () => Promise<void>;
	fail: () => void;
	loads: () => number;
} {
	let loads = 0;
	let failNext = false;
	let open: () => void = () => undefined;
	const gate = new Promise<void>((resolve) => {
		open = resolve;
	});
	const loader = createWriterLoader(async () => {
		loads += 1;
		if (failNext) {
			failNext = false;
			throw new Error('chunk failed to load');
		}
		await gate;
		return import('../writer/writer');
	});
	return {
		fail: () => {
			failNext = true;
		},
		land: async () => {
			open();
			await loader.load();
			await vi.advanceTimersByTimeAsync(0);
		},
		loader,
		loads: () => loads,
	};
};

const storedChoice = () =>
	readStoredConsentRecord(undefined, Date.now()).selected;

/** Run timers until `pending` settles. */
const settle = async function settle<ResultType>(
	pending: Promise<ResultType>
): Promise<ResultType> {
	let done = false;
	const watched = pending.finally(() => {
		done = true;
	});
	await vi.waitFor(
		() => {
			expect(done).toBe(true);
		},
		{ interval: 1 }
	);
	return watched;
};

/** Store a choice through a handle whose write code is already loaded. */
const seedChoice = async function seedChoice(
	input: Parameters<InternalKernel['commands']['save']>[0]
): Promise<void> {
	const seed = createConsentKernel({ now: Date.now() });
	const handle = createPersistence({ kernel: seed });
	await settle(seed.commands.save(input));
	handle.dispose();
};

/** A kernel whose transport records what storage held when each save left. */
const kernelWithTransport = function kernelWithTransport(
	result: () => Promise<SaveResult> = () => Promise.resolve({ ok: true })
): { kernel: InternalKernel; storedAtSend: (string | null)[] } {
	const storedAtSend: (string | null)[] = [];
	const kernel = createConsentKernel({
		now: Date.now(),
		transport: {
			save: () => {
				storedAtSend.push(localStorage.getItem(STORAGE_KEY_V2));
				return result();
			},
		},
	});
	return { kernel, storedAtSend };
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	vi.setSystemTime(NOW);
	localStorage.clear();
	clearStoredConsentRecords();
	document.cookie = `${STORAGE_KEY_V2}-epoch=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});

afterEach(() => {
	clearStoredConsentRecords();
	vi.useRealTimers();
});

describe('before the write code lands', () => {
	test('a stored choice hydrates synchronously, without the write code', async () => {
		await seedChoice({ marketing: true });
		const { loader } = heldBackLoader();

		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, loader);

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
	});

	test('the first save is stored before its request leaves', async () => {
		const { land, loader } = heldBackLoader();
		const { kernel, storedAtSend } = kernelWithTransport();
		createPersistence({ kernel }, loader);

		const saving = kernel.commands.save({ marketing: true });
		// The request would normally leave after one macrotask.
		await vi.advanceTimersByTimeAsync(50);
		expect(storedAtSend).toEqual([]);
		expect(storedChoice()).toBeNull();

		await land();
		await settle(saving);

		expect(storedAtSend).toHaveLength(1);
		expect(storedAtSend[0]).toContain('"version":3');
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
	});

	test('a revocation reload waits for the write, even without a transport save', async () => {
		await seedChoice({ marketing: true });
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, loader);
		const storedAtReload: (boolean | undefined)[] = [];
		watchRevocationReload({
			kernel,
			reload: () => {
				storedAtReload.push(storedChoice()?.choice.categories.marketing?.value);
			},
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);

		const revoking = kernel.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(50);
		expect(storedAtReload).toEqual([]);

		await land();
		await settle(revoking);
		await vi.advanceTimersByTimeAsync(0);
		expect(storedAtReload).toEqual([false]);
	});

	test('a revocation whose write code fails to load does not reload while storage holds the grant', async () => {
		await seedChoice({ marketing: true });
		const { fail, land, loader, loads } = heldBackLoader();
		fail();
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, loader);
		const storedAtReload: (boolean | undefined)[] = [];
		watchRevocationReload({
			kernel,
			reload: () => {
				storedAtReload.push(storedChoice()?.choice.categories.marketing?.value);
			},
		});

		const revoking = kernel.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(loads()).toBe(1);
		// The load failed: nothing reloads, and the save stays open.
		await vi.advanceTimersByTimeAsync(500);
		expect(storedAtReload).toEqual([]);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);

		// The retry lands the write; only then does the save settle and reload.
		await vi.advanceTimersByTimeAsync(500);
		expect(loads()).toBe(2);
		await land();
		await settle(revoking);
		await vi.advanceTimersByTimeAsync(0);
		expect(storedAtReload).toEqual([false]);
	});

	test('a save whose write code fails to load is sent only once a retry stored it', async () => {
		const { fail, land, loader, loads } = heldBackLoader();
		fail();
		const { kernel, storedAtSend } = kernelWithTransport();
		createPersistence({ kernel }, loader);

		const saving = kernel.commands.save({ marketing: true });
		await vi.advanceTimersByTimeAsync(500);
		expect(loads()).toBe(1);
		expect(storedAtSend).toEqual([]);

		await vi.advanceTimersByTimeAsync(500);
		expect(loads()).toBe(2);
		await land();
		await settle(saving);

		expect(storedAtSend).toHaveLength(1);
		expect(storedAtSend[0]).toContain('"version":3');
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
	});

	test('a clear empties memory, storage and the save outbox at once', async () => {
		// A failed save is queued in the outbox.
		const { kernel } = kernelWithTransport(() =>
			Promise.reject(new Error('offline'))
		);
		const seeded = createPersistence({ kernel });
		await settle(kernel.commands.save({ marketing: true }));
		seeded.dispose();
		expect(localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toContain(
			'marketing'
		);
		expect(storedChoice()).not.toBeNull();

		const { land, loader } = heldBackLoader();
		const cleared = vi.fn();
		kernel.events.on('records:cleared', cleared);
		const handle = createPersistence({ kernel }, loader);
		const clearedAt = Date.now();
		handle.clear();

		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(cleared).toHaveBeenCalledOnce();
		expect(storedChoice()).toBeNull();
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-epoch`)).toBe(
			String(clearedAt)
		);
		await vi.advanceTimersByTimeAsync(0);
		expect(localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '').not.toContain(
			'marketing'
		);

		await land();
		expect(storedChoice()).toBeNull();
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-epoch`)).toBe(
			String(clearedAt)
		);
	});

	test('a clear removes the stored grant before it returns, so a reload cannot restore it', async () => {
		await seedChoice({ marketing: true });
		// The write code never lands on this page.
		const { loader, loads } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);

		handle.clear();

		expect(storedChoice()).toBeNull();
		expect(document.cookie).not.toMatch(
			new RegExp(`(^|; )${STORAGE_KEY_V2}=`, 'u')
		);
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-epoch`)).toBe(
			String(Date.now())
		);
		expect(loads()).toBe(0);

		// The next page reads no grant.
		const next = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel: next }, heldBackLoader().loader);
		expect(next.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(next.getSnapshot().explicitChoice).toBeNull();
	});

	test('the write code landing after a clear keeps what another tab stored since', async () => {
		await seedChoice({ marketing: true });
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		handle.clear();

		vi.setSystemTime(NOW + 1000);
		await seedChoice({ measurement: true });
		await land();

		expect(storedChoice()?.choice.categories.measurement?.value).toBe(true);
	});

	test('a choice made after a clear is stored after the clear when both land', async () => {
		await seedChoice({ marketing: true, measurement: true });
		vi.setSystemTime(NOW + 1000);
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);

		handle.clear();
		vi.setSystemTime(NOW + 1001);
		const saving = kernel.commands.save({ marketing: false });
		await land();
		await settle(saving);

		const categories = storedChoice()?.choice.categories;
		expect(categories?.marketing?.value).toBe(false);
		expect(categories?.measurement).toBeUndefined();
	});

	test('writes requested before dispose land with the write code', async () => {
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		const saving = kernel.commands.save({ marketing: true });
		handle.dispose();
		expect(storedChoice()).toBeNull();

		await land();
		await settle(saving);

		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
	});

	test('a page hidden into the back/forward cache stores the choice once the write code lands', async () => {
		const { land, loader } = heldBackLoader();
		const { kernel, storedAtSend } = kernelWithTransport();
		createPersistence({ kernel }, loader);
		const saving = kernel.commands.save({ marketing: true });

		window.dispatchEvent(
			new PageTransitionEvent('pagehide', { persisted: true })
		);
		// No write code yet, so nothing can be written while the page hides.
		expect(storedChoice()).toBeNull();
		window.dispatchEvent(
			new PageTransitionEvent('pageshow', { persisted: true })
		);

		await land();
		await settle(saving);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
		expect(storedAtSend[0]).toContain('"version":3');
	});

	test('another tab’s change seen before the write code lands is reconciled when it lands', async () => {
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, loader);

		await seedChoice({ marketing: true });
		window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_V2 }));
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);

		await land();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
	});

	test('reconcile() runs once the write code lands', async () => {
		const { land, loader, loads } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		await seedChoice({ marketing: true });

		expect(handle.reconcile()).toBe(false);
		await vi.waitFor(() => {
			expect(loads()).toBe(1);
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);

		await land();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		// Landed: reconciliation is synchronous again.
		expect(handle.reconcile()).toBe(false);
	});

	test('hydrate() with a write pending waits for the write', async () => {
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		const saving = kernel.commands.save({ marketing: true });

		expect(handle.hydrate()).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);

		await land();
		await settle(saving);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
	});

	test('a handle mounted while an earlier revocation waits for the write code starts from the revocation', async () => {
		// An earlier page stored a grant.
		await seedChoice({ marketing: true });
		const { land, loader } = heldBackLoader();
		const first = createConsentKernel({ now: Date.now() });
		const firstHandle = createPersistence({ kernel: first }, loader);
		vi.setSystemTime(NOW + 1000);
		const accepting = first.commands.save({ marketing: true });
		vi.setSystemTime(NOW + 2000);
		const rejecting = first.commands.save({ marketing: false });
		// The provider remounts before the write code has loaded.
		firstHandle.dispose();
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);

		const kernel = createConsentKernel({ now: Date.now() });
		const onBeforeLoad = vi.fn();
		const scripts = createScriptLoader({
			kernel,
			scripts: [
				{
					callbackOnly: true,
					category: 'marketing',
					id: 'gated-on-remount',
					onBeforeLoad,
				},
			],
		});
		const handle = createPersistence({ kernel }, loader);

		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing
		).toMatchObject({
			confirmedAt: NOW + 2000,
			value: false,
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);

		await land();
		await settle(Promise.all([accepting, rejecting]));
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(onBeforeLoad).not.toHaveBeenCalled();
		scripts.dispose();
		handle.dispose();
	});

	test('a seeded handle mounted while a revocation waits for the write code applies the revocation', async () => {
		await seedChoice({ marketing: true });
		const { land, loader } = heldBackLoader();
		const first = createConsentKernel({ now: Date.now() });
		const firstHandle = createPersistence({ kernel: first }, loader);
		vi.setSystemTime(NOW + 1000);
		const rejecting = first.commands.save({ marketing: false });
		firstHandle.dispose();

		// A server render seeded the grant from the cookie.
		const kernel = createConsentKernel({ now: Date.now() });
		kernel.hydrate({
			choice: readStoredConsentRecord(undefined, Date.now()).selected?.choice,
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		const handle = createPersistence({ kernel, skipHydration: true }, loader);

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		await land();
		await settle(rejecting);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(false);
		handle.dispose();
	});

	test('a choice made after remounting is not overwritten by the earlier handle’s queued write', async () => {
		const { land, loader } = heldBackLoader();
		const first = createConsentKernel({ now: Date.now() });
		const firstHandle = createPersistence({ kernel: first }, loader);
		const rejecting = first.commands.save({ marketing: false });
		firstHandle.dispose();

		const { kernel, storedAtSend } = kernelWithTransport();
		const handle = createPersistence({ kernel }, loader);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		vi.setSystemTime(NOW + 1000);
		const accepting = kernel.commands.save({ marketing: true });

		await land();
		await settle(rejecting);
		const result = await settle(accepting);

		expect(result.ok).toBe(true);
		expect(storedAtSend).toHaveLength(1);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);

		// A third mount reads the newer choice, not the first handle's.
		const third = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel: third }, loader).dispose();
		expect(third.getSnapshot().effectivePermissions.marketing).toBe(true);
		handle.dispose();
	});

	test('a clear drops a queued choice that a later mount would start from', async () => {
		const { land, loader } = heldBackLoader();
		const first = createConsentKernel({ now: Date.now() });
		const firstHandle = createPersistence({ kernel: first }, loader);
		const accepting = first.commands.save({ marketing: true });
		firstHandle.clear();
		firstHandle.dispose();

		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		await land();
		await settle(accepting);
		expect(storedChoice()).toBeNull();
		handle.dispose();
	});

	test('once a banner is shown, the write code loads in idle time three seconds after the load event', async () => {
		const { land, loader, loads } = heldBackLoader();
		const kernel = createConsentKernel({
			consentCategories: ['marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			now: Date.now(),
		});
		createPersistence({ kernel }, loader);
		// Nothing loads before a prompt is shown.
		await vi.advanceTimersByTimeAsync(1000);
		expect(loads()).toBe(0);

		kernel.markLive();
		// jsdom has no requestIdleCallback, so it loads right after the delay.
		await vi.advanceTimersByTimeAsync(2999);
		expect(loads()).toBe(0);
		await vi.advanceTimersByTimeAsync(2);
		expect(loads()).toBe(1);

		await land();
		// Landed: the next save writes in the macrotask after its commit, so
		// it is stored before its request would leave.
		const saving = kernel.commands.save({ marketing: true });
		expect(storedChoice()).toBeNull();
		await vi.advanceTimersByTimeAsync(0);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
		await settle(saving);
	});

	test('a press inside the banner loads the write code at once, and only once', async () => {
		const { loader, loads } = heldBackLoader();
		const kernel = createConsentKernel({
			consentCategories: ['marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			now: Date.now(),
		});
		createPersistence({ kernel }, loader);
		const banner = document.createElement('div');
		banner.dataset.testid = 'consent-banner-root';
		const button = document.createElement('button');
		banner.append(button);
		const outside = document.createElement('button');
		document.body.append(banner, outside);
		try {
			// Before a banner is shown, a press does nothing.
			button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
			kernel.markLive();
			// Outside the banner, neither.
			outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
			outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
			await vi.advanceTimersByTimeAsync(0);
			expect(loads()).toBe(0);

			button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
			await vi.advanceTimersByTimeAsync(0);
			expect(loads()).toBe(1);

			// The delayed idle preload and later presses do not load it again.
			button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
			await vi.advanceTimersByTimeAsync(5000);
			expect(loads()).toBe(1);
		} finally {
			banner.remove();
			outside.remove();
		}
	});

	test('focus inside the dialog loads the write code at once', async () => {
		const { loader, loads } = heldBackLoader();
		const kernel = createConsentKernel({
			consentCategories: ['marketing'],
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			now: Date.now(),
		});
		createPersistence({ kernel }, loader);
		kernel.markLive();
		const dialog = document.createElement('div');
		dialog.dataset.testid = 'iab-consent-dialog-root';
		const toggle = document.createElement('input');
		dialog.append(toggle);
		document.body.append(dialog);
		try {
			toggle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
			await vi.advanceTimersByTimeAsync(0);
			expect(loads()).toBe(1);
		} finally {
			dialog.remove();
		}
	});

	test('a returning visitor who is not prompted does not load the write code', async () => {
		const promptingKernel = () =>
			createConsentKernel({
				consentCategories: ['marketing'],
				initialPolicyResolution: matchedResolution(
					optInRule({ categories: ['marketing'] })
				),
				now: Date.now(),
			});
		const seed = promptingKernel();
		const seeded = createPersistence({ kernel: seed });
		await settle(seed.commands.save({ marketing: true }));
		seeded.dispose();

		const { loader, loads } = heldBackLoader();
		const kernel = promptingKernel();
		createPersistence({ kernel }, loader);
		kernel.markLive();
		expect(kernel.getSnapshot().activeUI).toBe('none');

		await vi.advanceTimersByTimeAsync(1000);
		expect(loads()).toBe(0);
	});
});

describe('once the write code has landed', () => {
	test('a page hide stores a write still waiting for its macrotask', () => {
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel });

		void kernel.commands.save({ marketing: true });
		expect(storedChoice()).toBeNull();
		window.dispatchEvent(new PageTransitionEvent('pagehide'));

		expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
	});
});
