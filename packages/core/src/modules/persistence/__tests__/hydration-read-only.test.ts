/**
 * @vitest-environment jsdom
 *
 * Regression coverage for c15t/c15t#1025: startup hydration must be a
 * read-only pass. It folds stored records into the kernel, but it must
 * not renew a receipt, recreate a missing cookie or localStorage mirror,
 * migrate a legacy key or call the backend. Only an explicit accept,
 * reject or save writes to storage, and it writes the v3 envelope.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { NOW } from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { deleteConsentFromStorage, setCookie } from '../../../libs/cookie';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../../libs/storage-keys';
import { createPersistence } from '../index';
import { readStoredConsentRecord } from '../record-storage';

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

const readStored = function readStored(config?: { storageKey: string }) {
	return readStoredConsentRecord(config, Date.now()).selected;
};

/**
 * Run the macrotask write scheduler without firing the kernel's expiry
 * deadline timer, which would move the fake clock past the grant lifetime.
 */
const flushWrites = function flushWrites(): void {
	vi.advanceTimersByTime(0);
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
	deleteConsentFromStorage();
	document.cookie = '';
});

afterEach(() => {
	deleteConsentFromStorage(undefined, { storageKey: 'custom-key' });
	vi.useRealTimers();
});

describe('persistence: hydration is read-only', () => {
	test('startup hydration keeps the original receipt and writes nothing', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();

		const snap = kernel.getSnapshot();
		expect(snap.hasConsented).toBe(true);
		expect(snap.effectivePermissions.marketing).toBe(true);
		expect(snap.subject?.subjectId ?? null).toBe(SUBJECT_ID);
		expect(snap.explicitChoice?.categories.marketing).toEqual({
			basis: { kind: 'legacy-v2', materialFingerprint: 'fp-old' },
			confirmedAt: ORIGINAL_TIME,
			value: true,
		});

		expect(readLocalStorage()).toEqual(storedPayload());
		expect(document.cookie).toBe('');

		handle.dispose();
		expect(readLocalStorage()).toEqual(storedPayload());
		expect(document.cookie).toBe('');
	});

	test('hydrating from a cookie does not mirror it into localStorage', () => {
		setCookie(STORAGE_KEY_V2, storedPayload());
		const cookieBefore = document.cookie;

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();
		handle.dispose();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe(cookieBefore);
	});

	test('handle.hydrate() after subscribing writes nothing', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel, skipHydration: true });
		expect(handle.hydrate()).toBe(true);
		flushWrites();
		handle.dispose();

		expect(kernel.getSnapshot().hasConsented).toBe(true);
		expect(readLocalStorage()?.consentInfo.time).toBe(ORIGINAL_TIME);
		expect(document.cookie).toBe('');
	});

	test('hydration reads a legacy-key record without migrating it', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();
		handle.dispose();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(readLocalStorage(STORAGE_KEY)).toEqual(storedPayload());
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	test('hydration does not emit a save command or a choice event', () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const saveStarted = vi.fn();
		const choiceRecorded = vi.fn();
		kernel.events.on('command:save:started', saveStarted);
		kernel.events.on('choice:recorded', choiceRecorded);
		const handle = createPersistence({ kernel });
		flushWrites();
		handle.dispose();

		expect(saveStarted).not.toHaveBeenCalled();
		expect(choiceRecorded).not.toHaveBeenCalled();
	});
});

describe('persistence: explicit choices still write', () => {
	test('a repeat save renews only the confirmed key and keeps legacy subject data', async () => {
		localStorage.setItem(
			STORAGE_KEY_V2,
			JSON.stringify({
				consentInfo: {
					externalId: '12345',
					identityProvider: '1',
					materialPolicyFingerprint: 'fp-old',
					subjectId: 'legacy/subject%2F1',
					time: ORIGINAL_TIME,
				},
				consents: { marketing: true, measurement: true, necessary: true },
			})
		);

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();

		vi.setSystemTime(NOW + DAY);
		await kernel.commands.save({ marketing: true });
		flushWrites();
		handle.dispose();

		const stored = readStored();
		expect(stored?.format).toBe('v3');
		expect(stored?.subject).toEqual({
			externalId: '12345',
			identityProvider: '1',
			subjectId: 'legacy/subject%2F1',
		});
		expect(stored?.choice.categories.marketing).toEqual({
			basis: {
				fingerprint: kernel.getSnapshot().evaluationPolicy.choice.fingerprint,
				kind: 'choice-v1',
			},
			confirmedAt: NOW + DAY,
			value: true,
		});
		// The omitted category keeps its legacy time and basis.
		expect(stored?.choice.categories.measurement).toEqual({
			basis: { kind: 'legacy-v2', materialFingerprint: 'fp-old' },
			confirmedAt: ORIGINAL_TIME,
			value: true,
		});
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=v=3&`);
	});

	test('a no-input repeat save confirms the presented selection', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();

		vi.setSystemTime(NOW + DAY);
		await kernel.commands.save();
		flushWrites();
		handle.dispose();

		const stored = readStored();
		expect(stored?.choice.categories.marketing?.confirmedAt).toBe(NOW + DAY);
		expect(stored?.choice.categories.marketing?.value).toBe(true);
		// Undecided categories were presented with the opt-in default: denied.
		expect(stored?.choice.categories.measurement?.value).toBe(false);
	});

	test('a change after hydration is persisted', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();

		await kernel.commands.save('none');
		flushWrites();
		handle.dispose();

		const stored = readStored();
		expect(stored?.choice.categories.marketing?.value).toBe(false);
		expect(stored?.choice.categories.marketing?.confirmedAt).toBe(NOW);
	});

	test('accept and reject each persist when nothing was stored', async () => {
		const accept = createConsentKernel({ now: NOW });
		const acceptHandle = createPersistence({ kernel: accept });
		await accept.commands.save('all');
		flushWrites();
		acceptHandle.dispose();
		expect(readStored()?.choice.categories.marketing?.value).toBe(true);
		expect(readStored()?.choice.categories.marketing?.confirmedAt).toBe(NOW);

		const reject = createConsentKernel({ now: NOW });
		const rejectHandle = createPersistence({ kernel: reject });
		await reject.commands.save('none');
		flushWrites();
		rejectHandle.dispose();
		expect(readStored()?.choice.categories.marketing?.value).toBe(false);
	});

	test('hydrate() lands a queued explicit choice instead of overwriting it', async () => {
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		flushWrites();

		await kernel.commands.save('none');
		expect(readLocalStorage()?.consents.marketing).toBe(true);
		handle.hydrate();
		flushWrites();
		handle.dispose();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(readStored()?.choice.categories.marketing?.value).toBe(false);
	});

	test('a rejection under a custom key survives hydrate() and a reload', async () => {
		const storageConfig = { storageKey: 'custom-key' };
		localStorage.setItem('custom-key', JSON.stringify(storedPayload()));

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel, storageConfig });
		flushWrites();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);

		await kernel.commands.save('none');
		handle.hydrate();
		flushWrites();
		handle.dispose();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(readStored(storageConfig)?.choice.categories.marketing?.value).toBe(
			false
		);
		expect(document.cookie).toContain('custom-key=v=3&');
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).not.toContain(`${STORAGE_KEY_V2}=`);

		const reloaded = createConsentKernel({ now: NOW });
		const reloadedHandle = createPersistence({
			kernel: reloaded,
			storageConfig,
		});
		flushWrites();
		reloadedHandle.dispose();
		expect(reloaded.getSnapshot().hasConsented).toBe(true);
		expect(reloaded.getSnapshot().effectivePermissions.marketing).toBe(false);
	});

	test('clear removes the custom receipt and preserves default-key data', async () => {
		const storageConfig = { storageKey: 'custom-key' };
		const defaultPayload = storedPayload();
		localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(defaultPayload));
		setCookie(STORAGE_KEY_V2, defaultPayload);
		const defaultCookie = document.cookie;

		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel, storageConfig });
		await kernel.commands.save('none');
		flushWrites();
		expect(document.cookie).toContain('custom-key=');

		handle.clear();
		expect(localStorage.getItem('custom-key')).toBeNull();
		expect(readLocalStorage()).toEqual(defaultPayload);
		expect(document.cookie).toBe(defaultCookie);
		expect(kernel.getSnapshot().hasConsented).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		handle.dispose();

		const reloaded = createConsentKernel({ now: NOW });
		const reloadedHandle = createPersistence({
			kernel: reloaded,
			storageConfig,
		});
		expect(reloadedHandle.hydrate()).toBe(false);
		expect(reloaded.getSnapshot().hasConsented).toBe(false);
		flushWrites();
		reloadedHandle.dispose();
		expect(readLocalStorage()).toEqual(defaultPayload);
		expect(document.cookie).toBe(defaultCookie);
	});

	test('a failed remote save still persists the choice locally with the same receipt', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const save = vi.fn().mockRejectedValue(new Error('offline'));
		const kernel = createConsentKernel({ now: NOW, transport: { save } });
		const handle = createPersistence({ kernel });

		const pending = kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(1);
		const result = await pending;
		handle.dispose();

		expect(result.ok).toBe(false);
		expect(save).toHaveBeenCalledOnce();
		expect(readStored()?.choice.categories.marketing?.confirmedAt).toBe(NOW);
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=v=3&`);
		warn.mockRestore();
	});
});
