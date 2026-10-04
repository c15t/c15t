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
import { createConsentKernel } from '../../../kernel';
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../../../libs/storage-keys';
import type { ConsentKernel, SaveResult } from '../../../types';
import { watchRevocationReload } from '../../revocation-reload';
import { createPersistence } from '../index';
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
	input: Parameters<ConsentKernel['commands']['save']>[0]
): Promise<void> {
	const seed = createConsentKernel({ now: Date.now() });
	const handle = createPersistence({ kernel: seed });
	await settle(seed.commands.save(input));
	handle.dispose();
};

/** A kernel whose transport records what storage held when each save left. */
const kernelWithTransport = function kernelWithTransport(
	result: () => Promise<SaveResult> = () => Promise.resolve({ ok: true })
): { kernel: ConsentKernel; storedAtSend: (string | null)[] } {
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

	test('a save whose write code cannot load is still sent, and the next one retries', async () => {
		const { fail, land, loader, loads } = heldBackLoader();
		fail();
		const { kernel, storedAtSend } = kernelWithTransport();
		createPersistence({ kernel }, loader);

		await settle(kernel.commands.save({ marketing: true }));
		expect(storedAtSend).toEqual([null]);

		const saving = kernel.commands.save({ marketing: false });
		await land();
		await settle(saving);

		expect(loads()).toBe(2);
		expect(storedChoice()?.choice.categories.marketing?.value).toBe(false);
	});

	test('a clear empties memory and the save outbox at once, and storage when it lands', async () => {
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
		await vi.advanceTimersByTimeAsync(0);
		expect(localStorage.getItem(PENDING_SAVES_STORAGE_KEY) ?? '').not.toContain(
			'marketing'
		);
		// Storage waits for the write code.
		expect(storedChoice()).not.toBeNull();

		await land();
		expect(storedChoice()).toBeNull();
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-epoch`)).toBe(
			String(clearedAt)
		);
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

	test('once a banner is shown, the write code loads in idle time after the load event', async () => {
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
		// jsdom has no requestIdleCallback; the fallback delay stands in.
		await vi.advanceTimersByTimeAsync(199);
		expect(loads()).toBe(0);
		await vi.advanceTimersByTimeAsync(1);
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
