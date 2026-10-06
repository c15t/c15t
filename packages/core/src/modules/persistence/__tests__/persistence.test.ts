/**
 * @vitest-environment jsdom
 *
 * Tests for @c15t/core/modules/persistence.
 *
 * Covers:
 * - Hydration from cookie / localStorage through the kernel boundary
 * - Writing only on explicit kernel events (choice, notice, vendors)
 * - skipHydration option
 * - clear() removes every record and resets the kernel
 * - dispose stops further writes
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	noticeRule,
	optOutRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import {
	PENDING_SAVES_STORAGE_KEY,
	STORAGE_KEY_V2,
	SUBJECT_REASSIGNMENTS_STORAGE_KEY,
} from '../../../libs/storage-keys';
import { createPersistence } from '../index';
import { clearStoredConsentRecords } from './record-writes';

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
	clearStoredConsentRecords();
	// A clear keeps its epoch; start every test without one.
	document.cookie = `${STORAGE_KEY_V2}-epoch=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});

afterEach(() => {
	clearStoredConsentRecords();
	vi.useRealTimers();
});

const cookieNames = function cookieNames(): string[] {
	return document.cookie
		.split(';')
		.map((part) => part.trim().split('=')[0] ?? '')
		.filter(Boolean)
		.sort();
};

describe('persistence: hydration', () => {
	test('does nothing when nothing is stored', () => {
		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		handle.dispose();
	});

	test('hydrates a stored choice into a fresh kernel', async () => {
		const pre = createConsentKernel({ now: NOW });
		const seed = createPersistence({ kernel: pre });
		await pre.commands.save({ marketing: true, measurement: true });
		flushWrites();
		seed.dispose();

		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		expect(
			Object.keys(kernel.getSnapshot().explicitChoice?.categories ?? {})
		).not.toHaveLength(0);
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe(
			pre.getSnapshot().subject?.subjectId ?? null
		);
		expect(kernel.getSnapshot().explicitChoice).toEqual(
			pre.getSnapshot().explicitChoice
		);
	});

	test('hydration never calls transport.save or records a choice', async () => {
		const pre = createConsentKernel({ now: NOW });
		const seed = createPersistence({ kernel: pre });
		await pre.commands.save({ marketing: true });
		flushWrites();
		seed.dispose();

		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({ now: NOW, transport: { save } });
		const choiceRecorded = vi.fn();
		kernel.events.on('choice:recorded', choiceRecorded);
		createPersistence({ kernel });

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(save).not.toHaveBeenCalled();
		expect(choiceRecorded).not.toHaveBeenCalled();
	});

	test('skipHydration skips the read', async () => {
		const pre = createConsentKernel({ now: NOW });
		const seed = createPersistence({ kernel: pre });
		await pre.commands.save('all');
		flushWrites();
		seed.dispose();

		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel, skipHydration: true });
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});
});

describe('persistence: write path', () => {
	test('a staged draft never writes', () => {
		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel });
		kernel.set.draft({ marketing: true });
		flushWrites();
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(document.cookie).toBe('');
	});

	test('writes the v3 envelope after save()', async () => {
		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel });
		await kernel.commands.save({ marketing: true, measurement: true });
		flushWrites();

		expect(localStorage.getItem(STORAGE_KEY_V2)).toContain('"version":3');
		expect(document.cookie).toContain(`${STORAGE_KEY_V2}=v=3&`);
		const read = createConsentKernel({ now: NOW });
		createPersistence({ kernel: read });
		expect(read.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(read.getSnapshot().effectivePermissions.measurement).toBe(true);
	});

	test('stores the recorded choice before its save request leaves', async () => {
		// The save outbox sends no earlier than the macrotask after the
		// commit; the write scheduled from the commit runs first.
		let storedAtSend: string | null = null;
		const save = vi.fn(() => {
			storedAtSend = localStorage.getItem(STORAGE_KEY_V2);
			return Promise.resolve({ ok: true });
		});
		const kernel = createConsentKernel({ now: NOW, transport: { save } });
		createPersistence({ kernel });

		const pending = kernel.commands.save({ marketing: true });
		await vi.advanceTimersByTimeAsync(0);
		await pending;

		expect(save).toHaveBeenCalledTimes(1);
		expect(storedAtSend).toContain('"version":3');
	});

	test('an unchanged repeat save still refreshes the confirmed receipts', async () => {
		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel });
		await kernel.commands.save('all');
		flushWrites();

		vi.setSystemTime(NOW + 1000);
		await kernel.commands.save({ marketing: true });
		flushWrites();

		const read = createConsentKernel({ now: NOW + 1000 });
		createPersistence({ kernel: read });
		const categories = read.getSnapshot().explicitChoice?.categories ?? {};
		expect(categories.marketing?.confirmedAt).toBe(NOW + 1000);
		expect(categories.measurement?.confirmedAt).toBe(NOW);
	});

	test('rapid saves are written once, after the interaction, with the final receipts', () => {
		const kernel = createConsentKernel({ now: NOW });
		createPersistence({ kernel });

		void kernel.commands.save({ marketing: true });
		vi.setSystemTime(NOW + 1);
		void kernel.commands.save({ marketing: false });
		vi.setSystemTime(NOW + 2);
		void kernel.commands.save({ marketing: true });
		// Nothing is written on the interaction path.
		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		flushWrites();

		const read = createConsentKernel({ now: NOW + 2 });
		createPersistence({ kernel: read });
		expect(read.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(
			read.getSnapshot().explicitChoice?.categories.marketing?.confirmedAt
		).toBe(NOW + 2);
	});

	test('a notice dismissal writes only the notice record and its projection', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			now: NOW,
		});
		createPersistence({ kernel });
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');

		await kernel.commands.dismissNotice();
		flushWrites();

		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-notice`)).toContain(
			'"version":1'
		);
		expect(cookieNames()).toEqual([`${STORAGE_KEY_V2}-notice`]);

		const read = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			now: NOW + 1000,
		});
		createPersistence({ kernel: read });
		expect(read.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
		expect(read.getSnapshot().explicitChoice).toBeNull();
	});

	test('GPC restricts only while the signal is live and is never stored', () => {
		const rule = optOutRule({
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'none',
		});
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(rule),
			now: NOW,
		});
		const handle = createPersistence({ kernel });
		kernel.set.privacySignals({ gpc: true });
		flushWrites();

		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
		expect(kernel.getSnapshot().restrictions.marketing).toEqual(['gpc']);
		expect(Object.keys(localStorage)).toEqual([]);
		expect(cookieNames()).toEqual([]);

		// The browser stops sending the signal: the restriction goes with it.
		kernel.set.privacySignals({ gpc: false });
		flushWrites();
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(kernel.getSnapshot().restrictions.marketing).toBeUndefined();
		handle.dispose();

		// A fresh runtime over the same storage has nothing to restore.
		const read = createConsentKernel({
			initialPolicyResolution: matchedResolution(rule),
			now: NOW + 1000,
		});
		createPersistence({ kernel: read });
		expect(read.getSnapshot().effectivePermissions.marketing).toBe(true);
		expect(read.getSnapshot().restrictions).toEqual({});
	});
});

describe('persistence: clear', () => {
	test('removes every record, cancels queued writes and resets the kernel', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				noticeRule({
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
				})
			),
			now: NOW,
		});
		const handle = createPersistence({ kernel });
		await kernel.commands.save({ marketing: false });
		await kernel.commands.dismissNotice();
		kernel.set.privacySignals({ gpc: true });
		localStorage.setItem(PENDING_SAVES_STORAGE_KEY, '[]');
		// A subject reassignment would otherwise tie the next subject to the
		// cleared one.
		localStorage.setItem(SUBJECT_REASSIGNMENTS_STORAGE_KEY, '[]');
		// A standing directive an earlier v3 alpha stored. Clearing still
		// removes it so the old value does not linger.
		localStorage.setItem(
			`${STORAGE_KEY_V2}-privacy`,
			JSON.stringify({
				directives: [
					{ categories: ['marketing'], recordedAt: NOW - 1, source: 'gpc' },
				],
				version: 1,
			})
		);
		document.cookie = `${STORAGE_KEY_V2}-privacy=v=1&d=gpc.${NOW - 1}.mk; path=/`;
		// Writes are still queued: clear must cancel them, not flush them.
		handle.clear();
		flushWrites();

		expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
		expect(localStorage.getItem(`${STORAGE_KEY_V2}-notice`)).toBeNull();
		expect(localStorage.getItem(PENDING_SAVES_STORAGE_KEY)).toBeNull();
		expect(localStorage.getItem(SUBJECT_REASSIGNMENTS_STORAGE_KEY)).toBeNull();
		const snap = kernel.getSnapshot();
		expect(snap.explicitChoice).toBeNull();
		expect(snap.noticeDismissal).toBeNull();
		expect(snap.subject).toBeNull();
		expect(snap.explicitChoice).toBeNull();
		expect(snap.promptRequirement).toEqual({
			kind: 'notice',
			reason: 'missing',
		});
		// Only the clear epoch stays behind, so no record comes back. The live
		// signal alone keeps masking the permission.
		expect(Object.keys(localStorage)).toEqual([`${STORAGE_KEY_V2}-epoch`]);
		expect(document.cookie).toBe(`${STORAGE_KEY_V2}-epoch=${NOW}`);
		expect(snap.effectivePermissions.marketing).toBe(false);
		expect(snap.restrictions.marketing).toEqual(['gpc']);
	});

	test('clear without a live signal leaves nothing behind', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(noticeRule()),
			now: NOW,
		});
		const handle = createPersistence({ kernel });
		await kernel.commands.save({ marketing: false });
		await kernel.commands.dismissNotice();
		flushWrites();
		expect(cookieNames()).toEqual([STORAGE_KEY_V2, `${STORAGE_KEY_V2}-notice`]);

		handle.clear();
		flushWrites();
		expect(Object.keys(localStorage)).toEqual([`${STORAGE_KEY_V2}-epoch`]);
		expect(document.cookie).toBe(`${STORAGE_KEY_V2}-epoch=${NOW}`);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	});
});

describe('persistence: dispose', () => {
	test('stops writing after dispose', async () => {
		const kernel = createConsentKernel({ now: NOW });
		const handle = createPersistence({ kernel });
		await kernel.commands.save('all');
		flushWrites();

		handle.dispose();

		await kernel.commands.save({ marketing: false });
		flushWrites();

		const read = createConsentKernel({ now: NOW });
		createPersistence({ kernel: read });
		expect(read.getSnapshot().effectivePermissions.marketing).toBe(true);
	});
});

test.each([false, true])(
	'save acknowledgement persists canonical subject only on success = %s',
	async (ok) => {
		const response = Promise.withResolvers<{
			ok: boolean;
			subjectId: string;
		}>();
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(optOutRule()),
			transport: { save: () => response.promise },
		});
		const persistence = createPersistence({ kernel, skipHydration: true });
		const choices = vi.fn();
		kernel.events.on('choice:recorded', choices);
		const pending = kernel.commands.save({ marketing: false });
		const original = kernel.getSnapshot().explicitChoice;
		const provisionalSubject = kernel.getSnapshot().subject?.subjectId;
		await vi.advanceTimersByTimeAsync(0);
		vi.setSystemTime(NOW + 1000);
		response.resolve({ ok, subjectId: 'canonical' });
		await pending;
		flushWrites();
		const restored = createConsentKernel({
			initialPolicyResolution: matchedResolution(optOutRule()),
		});
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().explicitChoice).toEqual(original);
		expect(restored.getSnapshot().subject?.subjectId).toBe(
			ok ? 'canonical' : provisionalSubject
		);
		expect(choices).toHaveBeenCalledTimes(1);
		reader.dispose();
		restored.dispose();
		persistence.dispose();
		kernel.dispose();
	}
);

test('clear cancels a queued canonical subject write', async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(optOutRule()),
		transport: {
			save: () => Promise.resolve({ ok: true, subjectId: 'canonical' }),
		},
	});
	const persistence = createPersistence({ kernel, skipHydration: true });
	kernel.events.on('subject:resolved', () => persistence.clear());
	const pending = kernel.commands.save({ marketing: false });
	await vi.advanceTimersByTimeAsync(0);
	await pending;
	flushWrites();
	const restored = createConsentKernel();
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().explicitChoice).toBeNull();
	expect(restored.getSnapshot().subject).toBeNull();
	reader.dispose();
	restored.dispose();
	persistence.dispose();
	kernel.dispose();
});
