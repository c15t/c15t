/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../../index';
import { createPersistence, readStoredRecordsFromCookieHeader } from '../index';
import { clearStoredConsentRecords } from './record-writes';

beforeEach(() => {
	vi.useFakeTimers();
	localStorage.clear();
	clearStoredConsentRecords();
	document.cookie =
		'c15t-epoch=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});
afterEach(() => {
	clearStoredConsentRecords();
	vi.useRealTimers();
});

test.each(['all', 'none'] as const)(
	'necessary-only %s retains its canonical subject after reload without optional grants',
	async (action) => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'canonical' }),
			},
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save(action);
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const notice = kernel.getSnapshot().noticeDismissal;
		handle.dispose();
		kernel.dispose();
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe('canonical');
		expect(restored.getSnapshot().explicitChoice).toBeNull();
		expect(restored.getSnapshot().noticeDismissal).toEqual(notice);
		expect(restored.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, undefined, Date.now())
				.subject?.subjectId
		).toBe('canonical');
		reader.clear();
		reader.dispose();
		restored.dispose();
		const cleared = createConsentKernel({ consentCategories: ['necessary'] });
		const clearedHandle = createPersistence({ kernel: cleared });
		expect(cleared.getSnapshot().subject).toBeNull();
		clearedHandle.dispose();
		cleared.dispose();
	}
);

test.each([false, true])(
	'a delayed response after a necessary-only acknowledgement has success=%s',
	async (ok) => {
		const response = Promise.withResolvers<{
			ok: boolean;
			subjectId: string;
		}>();
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport: { save: () => response.promise },
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save('none');
		await vi.advanceTimersByTimeAsync(0);
		const generated = kernel.getSnapshot().subject?.subjectId;
		expect(generated).toBeTruthy();
		const beforeResponse = createConsentKernel({
			consentCategories: ['necessary'],
		});
		const beforeHandle = createPersistence({ kernel: beforeResponse });
		expect(beforeResponse.getSnapshot().subject?.subjectId).toBe(generated);
		beforeHandle.dispose();
		beforeResponse.dispose();
		response.resolve({ ok, subjectId: 'canonical' });
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		const restored = createConsentKernel({ consentCategories: ['necessary'] });
		const reader = createPersistence({ kernel: restored });
		expect(restored.getSnapshot().subject?.subjectId).toBe(
			ok ? 'canonical' : generated
		);
		reader.dispose();
		restored.dispose();
		handle.dispose();
		kernel.dispose();
	}
);

test('a response arriving after another handle clears does not restore the visitor', async () => {
	const response = Promise.withResolvers<{ ok: boolean; subjectId: string }>();
	const kernel = createConsentKernel({
		consentCategories: ['necessary'],
		transport: { save: () => response.promise },
	});
	const handle = createPersistence({ kernel, sync: false });
	const saving = kernel.commands.save('all');
	await vi.advanceTimersByTimeAsync(0);
	const other = createConsentKernel({ consentCategories: ['necessary'] });
	const otherHandle = createPersistence({ kernel: other });
	await vi.advanceTimersByTimeAsync(1);
	otherHandle.clear();
	response.resolve({ ok: true, subjectId: 'canonical' });
	await saving;
	await vi.advanceTimersByTimeAsync(0);
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject).toBeNull();
	expect(restored.getSnapshot().noticeDismissal).toBeNull();
	reader.dispose();
	restored.dispose();
	otherHandle.dispose();
	other.dispose();
	handle.dispose();
	kernel.dispose();
});

test('a fresh necessary-only acknowledgement after clear persists and another handle reconciles it', async () => {
	const first = createConsentKernel({ consentCategories: ['necessary'] });
	const firstHandle = createPersistence({ kernel: first });
	firstHandle.clear();
	await vi.advanceTimersByTimeAsync(1);
	const second = createConsentKernel({
		consentCategories: ['necessary'],
		transport: {
			save: () => Promise.resolve({ ok: true, subjectId: 'new-subject' }),
		},
	});
	const secondHandle = createPersistence({ kernel: second });
	const saving = second.commands.save('none');
	await vi.advanceTimersByTimeAsync(0);
	await saving;
	await vi.advanceTimersByTimeAsync(0);
	secondHandle.reconcile();
	firstHandle.reconcile();
	expect(first.getSnapshot().subject?.subjectId).toBe('new-subject');
	expect(first.getSnapshot().explicitChoice).toBeNull();
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe('new-subject');
	secondHandle.clear();
	firstHandle.reconcile();
	expect(first.getSnapshot().subject).toBeNull();
	reader.dispose();
	restored.dispose();
	secondHandle.dispose();
	second.dispose();
	firstHandle.dispose();
	first.dispose();
});

test('a canonical subject in localStorage survives a dropped cookie rewrite', async () => {
	const response = Promise.withResolvers<{ ok: boolean; subjectId: string }>();
	const kernel = createConsentKernel({
		consentCategories: ['necessary'],
		transport: { save: () => response.promise },
	});
	const handle = createPersistence({ kernel });
	const saving = kernel.commands.save('none');
	await vi.advanceTimersByTimeAsync(0);
	const staleCookie = document.cookie;
	response.resolve({ ok: true, subjectId: 'canonical' });
	await saving;
	handle.dispose();
	kernel.dispose();
	// Simulate a cookie write the browser dropped, while localStorage succeeded.
	document.cookie = staleCookie;
	const restored = createConsentKernel({ consentCategories: ['necessary'] });
	const reader = createPersistence({ kernel: restored });
	expect(restored.getSnapshot().subject?.subjectId).toBe('canonical');
	expect(restored.getSnapshot().explicitChoice).toBeNull();
	reader.dispose();
	restored.dispose();
});

test('a necessary-only visitor can make a second choice after reload with the same subject', async () => {
	const sent: string[] = [];
	const transport = {
		save: (payload: { subjectId?: string }) => {
			sent.push(payload.subjectId ?? 'missing');
			return Promise.resolve({ ok: true });
		},
	};
	const visit = async (action: 'all' | 'none') => {
		const kernel = createConsentKernel({
			consentCategories: ['necessary'],
			transport,
		});
		const handle = createPersistence({ kernel });
		const saving = kernel.commands.save(action);
		await vi.advanceTimersByTimeAsync(0);
		await saving;
		handle.dispose();
		kernel.dispose();
	};
	await visit('all');
	await visit('none');
	expect(sent).toHaveLength(2);
	expect(sent[0]).toBeTruthy();
	expect(sent[1]).toBe(sent[0]);
});
