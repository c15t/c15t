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
import { readStoredRecordsForReconcile } from '../hydrate';
import { mountPersistence as createPersistence, queuedWrites } from '../mount';
import { readStoredConsentRecord } from '../record-storage';
import { createWriterLoader } from '../writer-loader';
import type { WriterLoader } from '../writer-loader';
import {
	clearStoredConsentRecords,
	writeStoredConsentEnvelope,
} from './record-writes';

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
	queuedWrites.clear();
	localStorage.clear();
	clearStoredConsentRecords();
	document.cookie = `${STORAGE_KEY_V2}-epoch=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});

afterEach(() => {
	clearStoredConsentRecords();
	vi.useRealTimers();
});

// First in the file: several tests below leave a handle mounted, and the
// focus events here would reach them.
describe('<key>-sid follows the records that carry the subject', () => {
	const sidKey = `${STORAGE_KEY_V2}-sid`;
	const expireSid = () => {
		document.cookie = `${sidKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	};

	test('a rekey another tab’s newer record skipped does not publish the new ID ahead of it', async () => {
		expireSid();
		await seedChoice({ marketing: true });
		const saved = localStorage.getItem(sidKey);
		const { land, loader } = heldBackLoader();
		const sent: (string | undefined)[] = [];
		const kernel = createConsentKernel({
			now: Date.now(),
			transport: {
				save: (payload) => {
					sent.push(payload.subjectId);
					return Promise.resolve({ ok: true });
				},
			},
		});
		const handle = createPersistence({ kernel, sync: false }, loader);
		kernel.set.subjectId('sub_next');
		// Another tab, still on the saved ID, records a newer denial. It
		// shares storage, not this page's queued writes.
		vi.setSystemTime(NOW + 1000);
		const before = storedChoice();
		const granted = before?.choice.categories.marketing;
		if (!(before?.subject && granted)) {
			throw new Error('Expected a stored grant with a subject');
		}
		writeStoredConsentEnvelope(
			{
				categories: {
					...before.choice.categories,
					marketing: { ...granted, confirmedAt: NOW + 1000, value: false },
				},
				subject: before.subject,
				version: 3,
			},
			{ now: NOW + 1000 }
		);

		await land();
		// The subject-only rewrite yields to the newer record, which still
		// carries the saved ID, so <key>-sid keeps that ID too.
		expect(storedChoice()?.subject?.subjectId).toBe(saved);
		expect(localStorage.getItem(sidKey)).toBe(saved);
		expect(storedChoice()?.choice.categories.marketing).toMatchObject({
			confirmedAt: NOW + 1000,
			value: false,
		});

		// This runtime's next save stores its ID with the merged records.
		vi.setSystemTime(NOW + 2000);
		await settle(kernel.commands.save({ measurement: true }));
		expect(sent).toEqual(['sub_next']);
		expect(storedChoice()?.subject?.subjectId).toBe('sub_next');
		expect(localStorage.getItem(sidKey)).toBe('sub_next');
		expect(storedChoice()?.choice.categories.marketing).toMatchObject({
			confirmedAt: NOW + 1000,
			value: false,
		});
		handle.dispose();

		const reloaded = createConsentKernel({ now: Date.now() });
		const reader = createPersistence({ kernel: reloaded });
		expect(reloaded.getSnapshot().subject?.subjectId).toBe('sub_next');
		reader.clear();
		expect(localStorage.getItem(sidKey)).toBe('sub_next');
		reader.dispose();
		expireSid();
	});

	test.each([
		['kept', 'present'],
		['dropped', 'present'],
		['dropped', 'absent'],
	] as const)(
		'focus before a remount’s queued records land does not publish their ID ahead of them, record cookie %s, <key>-sid %s',
		async (recordCookie, sid) => {
			expireSid();
			await seedChoice({ marketing: true });
			const saved = localStorage.getItem(sidKey);
			const { land, loader } = heldBackLoader();
			const leaving = createConsentKernel({ now: Date.now() });
			const left = createPersistence({ kernel: leaving }, loader);
			leaving.set.subjectId('sub_next');
			left.dispose();

			const kernel = createConsentKernel({ now: Date.now() });
			const handle = createPersistence({ kernel }, loader);
			expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_next');
			// The browser lost the record cookie (localStorage still holds the
			// record), or <key>-sid altogether.
			if (recordCookie === 'dropped') {
				document.cookie = `${STORAGE_KEY_V2}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
			}
			if (sid === 'absent') {
				expireSid();
				localStorage.removeItem(sidKey);
			}
			window.dispatchEvent(new Event('focus'));
			// The records still carry the saved ID until the queued writes land.
			expect(
				readStoredRecordsForReconcile(undefined, Date.now()).recordedSubjectId
			).toBe(saved);
			expect(localStorage.getItem(sidKey)).toBe(
				sid === 'absent' ? null : saved
			);

			await land();
			expect(storedChoice()?.subject?.subjectId).toBe('sub_next');
			expect(localStorage.getItem(sidKey)).toBe('sub_next');
			window.dispatchEvent(new Event('focus'));
			expect(localStorage.getItem(sidKey)).toBe('sub_next');
			handle.dispose();

			const reloaded = createConsentKernel({ now: Date.now() });
			createPersistence({ kernel: reloaded }).dispose();
			expect(reloaded.getSnapshot().subject?.subjectId).toBe('sub_next');
			expireSid();
		}
	);

	test.each([
		['a decision then a new ID', 'an ID the app names', 'sub_third'],
		['a decision then a new ID', 'a reset', null],
		['a new ID then a decision', 'an ID the app names', 'sub_third'],
		['a new ID then a decision', 'a reset', null],
	] as const)(
		'a remount that queued %s, then %s before they land, stores that decision under the newer ID',
		async (order, _, next) => {
			expireSid();
			await seedChoice({ marketing: true });
			const saved = localStorage.getItem(sidKey);
			const { land, loader } = heldBackLoader();
			const leaving = createConsentKernel({ now: Date.now() });
			const left = createPersistence({ kernel: leaving }, loader);
			vi.setSystemTime(NOW + 1000);
			let saving: Promise<unknown>;
			if (order === 'a decision then a new ID') {
				saving = leaving.commands.save({ marketing: false });
				leaving.set.subjectId('sub_next');
			} else {
				leaving.set.subjectId('sub_next');
				saving = leaving.commands.save({ marketing: false });
			}
			left.dispose();

			const kernel = createConsentKernel({ now: Date.now() });
			const handle = createPersistence({ kernel }, loader);
			expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_next');
			kernel.set.subjectId(next);
			const replaced = kernel.getSnapshot().subject?.subjectId;
			expect([saved, 'sub_next', undefined]).not.toContain(replaced);

			await land();
			await settle(saving);
			// The queued decision lands with its time, under the newer ID, and
			// <key>-sid follows it. No save was made after the replacement.
			expect(storedChoice()?.subject?.subjectId).toBe(replaced);
			expect(storedChoice()?.choice.categories.marketing).toMatchObject({
				confirmedAt: NOW + 1000,
				value: false,
			});
			expect(localStorage.getItem(sidKey)).toBe(replaced);
			expect(kernel.getSnapshot().subject?.subjectId).toBe(replaced);
			handle.dispose();

			const reloaded = createConsentKernel({ now: Date.now() });
			const reader = createPersistence({ kernel: reloaded });
			expect(reloaded.getSnapshot().subject?.subjectId).toBe(replaced);
			expect(
				reloaded.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(false);
			reader.clear();
			expect(localStorage.getItem(sidKey)).toBe(replaced);
			reader.dispose();
			expireSid();
		}
	);

	test.each([
		['an ID the app names', 'sub_third'],
		['a reset', null],
	] as const)(
		'%s after a remount, before the queued records land, is what a reload restores',
		async (_, next) => {
			expireSid();
			await seedChoice({ marketing: true });
			const saved = localStorage.getItem(sidKey);
			const { land, loader } = heldBackLoader();
			const leaving = createConsentKernel({ now: Date.now() });
			const left = createPersistence({ kernel: leaving }, loader);
			leaving.set.subjectId('sub_next');
			left.dispose();

			const kernel = createConsentKernel({ now: Date.now() });
			const handle = createPersistence({ kernel }, loader);
			expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_next');
			kernel.set.subjectId(next);
			const replaced = kernel.getSnapshot().subject?.subjectId;
			expect(replaced).toBeTruthy();
			expect([saved, 'sub_next']).not.toContain(replaced);

			await land();
			// No save: the records carry the newer ID, and <key>-sid with them.
			expect(storedChoice()?.subject?.subjectId).toBe(replaced);
			expect(localStorage.getItem(sidKey)).toBe(replaced);
			expect(storedChoice()?.choice.categories.marketing?.value).toBe(true);
			expect(kernel.getSnapshot().subject?.subjectId).toBe(replaced);
			handle.dispose();

			const reloaded = createConsentKernel({ now: Date.now() });
			const reader = createPersistence({ kernel: reloaded });
			expect(reloaded.getSnapshot().subject?.subjectId).toBe(replaced);
			reader.clear();
			expect(localStorage.getItem(sidKey)).toBe(replaced);
			reader.dispose();
			expireSid();
		}
	);
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

	test('a new subject ID is stored with the records that carry it', async () => {
		const sidKey = `${STORAGE_KEY_V2}-sid`;
		const storedSid = () => localStorage.getItem(sidKey);
		document.cookie = `${sidKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		await seedChoice({ marketing: true });
		const saved = storedSid();

		const leaving = createConsentKernel({ now: Date.now() });
		const left = createPersistence(
			{ kernel: leaving },
			heldBackLoader().loader
		);
		leaving.set.subjectId('sub_left');
		// The page unloads before the write code lands: the records still
		// carry the saved ID, so <key>-sid keeps it too. Its queued writes go
		// with the page.
		left.dispose();
		queuedWrites.clear();
		expect(storedSid()).toBe(saved);

		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, loader);
		expect(kernel.getSnapshot().subject?.subjectId).toBe(saved);
		kernel.set.subjectId('sub_next');
		expect(storedSid()).toBe(saved);

		await land();
		expect(storedSid()).toBe('sub_next');
		expect(
			readStoredRecordsForReconcile(undefined, Date.now()).recordedSubjectId
		).toBe('sub_next');
		document.cookie = `${sidKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	});
});

describe('a remount while a new subject ID waits for the write code', () => {
	test.each([false, true])(
		'keeps the new ID through landing, the next save and a reload with skipHydration=%s',
		async (skipHydration) => {
			const sidKey = `${STORAGE_KEY_V2}-sid`;
			document.cookie = `${sidKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
			await seedChoice({ marketing: true });
			const saved = localStorage.getItem(sidKey);

			// One page, one loader: the leaving handle's writes land with it.
			const { land, loader } = heldBackLoader();
			const leaving = createConsentKernel({ now: Date.now() });
			const left = createPersistence({ kernel: leaving }, loader);
			expect(leaving.getSnapshot().subject?.subjectId).toBe(saved);
			leaving.set.subjectId('sub_next');
			left.dispose();

			const sent: (string | undefined)[] = [];
			const kernel = createConsentKernel({
				now: Date.now(),
				transport: {
					save: (payload) => {
						sent.push(payload.subjectId);
						return Promise.resolve({ ok: true });
					},
				},
			});
			if (skipHydration) {
				// A server render seeded the stored records, old ID included.
				const stored = readStoredRecordsForReconcile(undefined, Date.now());
				kernel.hydrate({
					choice: stored.records.choice,
					subject: stored.records.subject,
				});
			}
			expect(kernel.getSnapshot().subject?.subjectId).toBe(
				skipHydration ? saved : undefined
			);
			const handle = createPersistence({ kernel, skipHydration }, loader);
			// It starts from the queued records, and from the subject they carry.
			expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_next');

			await land();
			expect(localStorage.getItem(sidKey)).toBe('sub_next');
			expect(
				readStoredRecordsForReconcile(undefined, Date.now()).recordedSubjectId
			).toBe('sub_next');

			vi.setSystemTime(NOW + 1000);
			await settle(kernel.commands.save({ marketing: false }));
			expect(sent).toEqual(['sub_next']);
			expect(storedChoice()?.subject?.subjectId).toBe('sub_next');
			expect(storedChoice()?.choice.categories.marketing?.value).toBe(false);
			handle.dispose();

			const reloaded = createConsentKernel({ now: Date.now() });
			createPersistence({ kernel: reloaded }).dispose();
			expect(reloaded.getSnapshot().subject?.subjectId).toBe('sub_next');
			document.cookie = `${sidKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	);
});

describe('the queued writes another mount starts from', () => {
	test('end when the write code lands', async () => {
		const { land, loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		const saving = kernel.commands.save({ marketing: true });
		handle.dispose();
		expect(queuedWrites.get(STORAGE_KEY_V2)).toBe(kernel);

		await land();
		await settle(saving);
		expect(queuedWrites.has(STORAGE_KEY_V2)).toBe(false);
	});

	test('of a newer mount outlast an earlier mount’s writes landing', async () => {
		const earlier = heldBackLoader();
		const first = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel: first }, earlier.loader);
		const accepting = first.commands.save({ marketing: true });

		const later = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel }, later.loader);
		vi.setSystemTime(NOW + 1000);
		const rejecting = kernel.commands.save({ marketing: false });

		await earlier.land();
		await settle(accepting);
		expect(queuedWrites.get(STORAGE_KEY_V2)).toBe(kernel);

		await later.land();
		await settle(rejecting);
		expect(queuedWrites.has(STORAGE_KEY_V2)).toBe(false);
	});

	test('are not kept for writes made once the write code has landed', async () => {
		const kernel = createConsentKernel({ now: Date.now() });
		createPersistence({ kernel });
		await settle(kernel.commands.save({ marketing: true }));
		expect(queuedWrites.has(STORAGE_KEY_V2)).toBe(false);
	});

	test('end on clear()', () => {
		const { loader } = heldBackLoader();
		const kernel = createConsentKernel({ now: Date.now() });
		const handle = createPersistence({ kernel }, loader);
		void kernel.commands.save({ marketing: true });
		expect(queuedWrites.has(STORAGE_KEY_V2)).toBe(true);

		handle.clear();
		expect(queuedWrites.has(STORAGE_KEY_V2)).toBe(false);
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
