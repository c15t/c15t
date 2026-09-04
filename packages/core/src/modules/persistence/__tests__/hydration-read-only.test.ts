/**
 * @vitest-environment jsdom
 *
 * Regression coverage for c15t/c15t#1025: startup hydration must be a
 * read-only pass. It may fold stored consent into the kernel, but it
 * must not renew the stored choice timestamp, recreate a missing
 * cookie or localStorage mirror, or migrate a legacy key. Only an
 * explicit accept / reject / save writes to storage.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage, setCookie } from '../../../libs/cookie';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { createPersistence } from '../index';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const ORIGINAL_TIME = NOW - 2 * DAY;
const SUBJECT_ID = 'sub_2VZxR7YmNpKq3WfLs8TgHd';

const storedPayload = function storedPayload() {
	return {
		consentInfo: {
			materialPolicyFingerprint: 'fp-old',
			subjectId: SUBJECT_ID,
			time: ORIGINAL_TIME,
		},
		consents: { marketing: true, necessary: true },
	};
};

const readLocalStorage = function readLocalStorage(key = STORAGE_KEY_V2) {
	const raw = localStorage.getItem(key);
	return raw ? (JSON.parse(raw) as ReturnType<typeof storedPayload>) : null;
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	deleteConsentFromStorage({ storageKey: 'custom-key' });
	vi.useRealTimers();
});

describe('persistence: hydration is read-only', () => {
	test('startup hydration keeps the original choice time and writes nothing', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(kernel.getSnapshot().subjectId).toBe(SUBJECT_ID);

		expect(readLocalStorage()).toEqual(storedPayload());
		expect(document.cookie).toBe('');

		// Dispose flushes pending writes; hydration must not have queued one.
		handle.dispose();
		expect(readLocalStorage()).toEqual(storedPayload());
		expect(document.cookie).toBe('');
	});

	test('hydrating from a cookie does not mirror it into localStorage', () => {
		setCookie(STORAGE_KEY_V2, storedPayload());
		const cookieBefore = document.cookie;

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();
		handle.dispose();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe(cookieBefore);
	});

	test('handle.hydrate() after subscribing writes nothing', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel, skipHydration: true });
		expect(handle.hydrate()).toBe(true);
		vi.runAllTimers();
		handle.dispose();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(readLocalStorage()?.consentInfo.time).toBe(ORIGINAL_TIME);
		expect(document.cookie).toBe('');
	});

	test('hydration reads a legacy-key record without migrating it', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();
		handle.dispose();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(kernel.getSnapshot().consents.marketing).toBe(true);
		expect(readLocalStorage(STORAGE_KEY)).toEqual(storedPayload());
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	test('hydration does not emit a save command', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const saveStarted = vi.fn();
		kernel.events.on('command:save:started', saveStarted);
		const handle = createPersistence({ kernel });
		vi.runAllTimers();
		handle.dispose();

		expect(saveStarted).not.toHaveBeenCalled();
	});
});

describe('persistence: explicit choices still write', () => {
	test('a repeat save refreshes the time and keeps stored metadata', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();

		vi.setSystemTime(NOW + DAY);
		// Same categories as the stored record: still an explicit act.
		await kernel.commands.save({ marketing: true });
		vi.runAllTimers();
		handle.dispose();

		const stored = readLocalStorage();
		expect(stored?.consentInfo.time).toBe(NOW + DAY);
		expect(stored?.consentInfo.subjectId).toBe(SUBJECT_ID);
		expect(stored?.consentInfo.materialPolicyFingerprint).toBe('fp-old');
		expect(stored?.consents.marketing).toBe(true);
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);
	});

	test('a no-input repeat save refreshes the time', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();

		vi.setSystemTime(NOW + DAY);
		// Finalizes the current consents in place: no category changes.
		await kernel.commands.save();
		vi.runAllTimers();
		handle.dispose();

		const stored = readLocalStorage();
		expect(stored?.consentInfo.time).toBe(NOW + DAY);
		expect(stored?.consents.marketing).toBe(true);
	});

	test('a change after hydration is persisted', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();

		await kernel.commands.save('none');
		vi.runAllTimers();
		handle.dispose();

		const stored = readLocalStorage();
		expect(stored?.consents.marketing).toBe(false);
		expect(stored?.consentInfo.time).toBe(NOW);
	});

	test('accept and reject each persist when nothing was stored', async () => {
		const accept = createConsentKernel();
		const acceptHandle = createPersistence({ kernel: accept });
		await accept.commands.save('all');
		vi.runAllTimers();
		acceptHandle.dispose();
		expect(readLocalStorage()?.consents.marketing).toBe(true);
		expect(readLocalStorage()?.consentInfo.time).toBe(NOW);

		const reject = createConsentKernel();
		const rejectHandle = createPersistence({ kernel: reject });
		await reject.commands.save('none');
		vi.runAllTimers();
		rejectHandle.dispose();
		expect(readLocalStorage()?.consents.marketing).toBe(false);
		expect(readLocalStorage()?.consents.necessary).toBe(true);
	});

	test('hydrate() lands a queued explicit choice instead of overwriting it', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel });
		vi.runAllTimers();

		// Reject everything, then rehydrate before the debounced write lands.
		await kernel.commands.save('none');
		expect(readLocalStorage()?.consents.marketing).toBe(true);
		handle.hydrate();
		vi.runAllTimers();
		handle.dispose();

		expect(kernel.getSnapshot().consents.marketing).toBe(false);
		const stored = readLocalStorage();
		expect(stored?.consents.marketing).toBe(false);
		expect(stored?.consentInfo.time).toBe(NOW);
	});

	test('a rejection under a custom key survives hydrate() and a reload', async () => {
		const storageConfig = { storageKey: 'custom-key' };
		localStorage.setItem('custom-key', JSON.stringify(storedPayload()));

		const kernel = createConsentKernel();
		const handle = createPersistence({ kernel, storageConfig });
		vi.runAllTimers();
		expect(kernel.getSnapshot().consents.marketing).toBe(true);

		// Reject, then rehydrate before the debounced write lands. The write
		// must target the custom key or hydration reads the old grant back.
		await kernel.commands.save('none');
		handle.hydrate();
		vi.runAllTimers();
		handle.dispose();

		expect(kernel.getSnapshot().consents.marketing).toBe(false);
		expect(readLocalStorage('custom-key')?.consents.marketing).toBe(false);
		expect(readLocalStorage('custom-key')?.consentInfo.time).toBe(NOW);
		expect(document.cookie).toContain('custom-key=');
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).not.toContain(`${STORAGE_KEY_V2}=`);

		// Next page load with the same configuration.
		const reloaded = createConsentKernel();
		const reloadedHandle = createPersistence({
			kernel: reloaded,
			storageConfig,
		});
		vi.runAllTimers();
		reloadedHandle.dispose();
		expect(reloaded.getSnapshot().hasConsented).toBe(true);
		expect(reloaded.getSnapshot().consents.marketing).toBe(false);
	});

	test('a failed remote save still persists the choice locally', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const save = vi.fn().mockRejectedValue(new Error('offline'));
		const kernel = createConsentKernel({ transport: { save } });
		const handle = createPersistence({ kernel });

		const pending = kernel.commands.save('all');
		await vi.runAllTimersAsync();
		const result = await pending;
		handle.dispose();

		expect(result.ok).toBe(false);
		expect(save).toHaveBeenCalledOnce();
		expect(readLocalStorage()?.consents.marketing).toBe(true);
		expect(readLocalStorage()?.consentInfo.time).toBe(NOW);
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=`);
		warn.mockRestore();
	});
});
