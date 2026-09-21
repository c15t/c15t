/**
 * @vitest-environment jsdom
 */
/**
 * Persistence module wiring for vendor denials: a recorded toggle writes
 * the sibling record, hydration reads it back, and `clear()` removes it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import type { KernelVendorsState } from '../../../types';
import { createPersistence } from '../index';
import {
	readStoredVendorChoice,
	writeStoredVendorChoice,
} from '../record-storage';

const vendors: KernelVendorsState = {
	declared: [
		{
			category: 'marketing',
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
			source: 'config',
		},
	],
	listVersion: null,
};

const clearAll = () => {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(() => {
	clearAll();
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
	clearAll();
});

const createKernel = () =>
	createConsentKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing'] })
		),
		initialRecords: choiceRecords({ marketing: true }),
		initialVendors: vendors,
		now: NOW,
	});

describe('vendor persistence', () => {
	it('writes the denial list after a vendor-only save and hydrates it back', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { confirmedAt: NOW, denied: ['meta-pixel'], version: 1 },
		});
		persistence.dispose();
		kernel.dispose();

		const fresh = createKernel();
		const rehydrated = createPersistence({ kernel: fresh, now: () => NOW });
		expect(fresh.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		rehydrated.dispose();
		fresh.dispose();
	});

	it('keeps a timestamped empty record when a bulk action clears every denial', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		await kernel.commands.save('all');
		await vi.runAllTimersAsync();
		// The time is what lets a later merge know this clear is newer than an
		// older server denial, so it is written rather than removed.
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { confirmedAt: NOW, denied: [], version: 1 },
		});
		expect(kernel.getSnapshot().vendorChoice?.denied).toEqual([]);
		persistence.dispose();
		kernel.dispose();
	});

	it('keeps the subject a vendor-only first act created across a reload', async () => {
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
		});
		const persistence = createPersistence({ kernel, now: () => NOW });
		// No category receipt exists yet, so the consent envelope is never
		// written; the subject has to travel with the vendor record instead.
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		const { subjectId } = kernel.getSnapshot().subject ?? {};
		expect(subjectId).toBeTruthy();
		persistence.dispose();
		kernel.dispose();

		const fresh = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
		});
		const rehydrated = createPersistence({ kernel: fresh, now: () => NOW });
		expect(fresh.getSnapshot().subject?.subjectId).toBe(subjectId);
		expect(fresh.getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		rehydrated.dispose();
		fresh.dispose();
	});

	it('a category save that resolves the subject leaves a stored denial alone', async () => {
		// A denial written by another tab or an earlier session that this kernel
		// never hydrated.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		const kernel = createConsentKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({ categories: ['marketing'] })
			),
			initialVendors: vendors,
			now: NOW,
			transport: {
				save: () => Promise.resolve({ ok: true, subjectId: 'sub_srv' }),
			},
		});
		const persistence = createPersistence({
			kernel,
			now: () => NOW,
			skipHydration: true,
		});
		// Fake timers are on: let the transport round trip and the write
		// schedulers run before awaiting the save.
		const saved = kernel.commands.save({ marketing: true });
		await vi.runAllTimersAsync();
		await saved;
		await vi.runAllTimersAsync();
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_srv');
		expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
			ok: true,
			record: { denied: ['meta-pixel'] },
		});
		persistence.dispose();
		kernel.dispose();
	});

	it('reads the newer of the two projections when the cookie write was dropped', () => {
		// First act: both projections agree.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1000, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		// Second act: the browser keeps the cookie assignment but stores
		// nothing, the way an over-limit cookie fails, so only localStorage
		// carries the newer list.
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		);
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			const written = writeStoredVendorChoice(
				{
					confirmedAt: NOW - 1,
					denied: ['google-ads', 'meta-pixel'],
					version: 1,
				},
				undefined,
				NOW
			);
			expect(written.ok && written.written?.cookie).toBe(false);
			expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
				ok: true,
				record: { confirmedAt: NOW - 1, denied: ['google-ads', 'meta-pixel'] },
			});
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			} else {
				delete (document as { cookie?: string }).cookie;
			}
		}
	});

	it('prefers the localStorage copy when both projections carry the same time', () => {
		// The subject rewrite after `subject:resolved` keeps the decision's
		// time. When the enlarged cookie is dropped and only localStorage took
		// the rewrite, the tie must go to the copy that saw it, or the next
		// load restores the provisional subject.
		writeStoredVendorChoice(
			{ confirmedAt: NOW - 1, denied: ['meta-pixel'], version: 1 },
			undefined,
			NOW
		);
		const descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'cookie'
		);
		const frozen = document.cookie;
		Object.defineProperty(document, 'cookie', {
			configurable: true,
			get: () => frozen,
			set: () => {
				// Accepted and dropped.
			},
		});
		try {
			writeStoredVendorChoice(
				{
					confirmedAt: NOW - 1,
					denied: ['meta-pixel'],
					subject: { subjectId: 'sub_canonical' },
					version: 1,
				},
				undefined,
				NOW
			);
			expect(readStoredVendorChoice(undefined, NOW)).toMatchObject({
				ok: true,
				record: { subject: { subjectId: 'sub_canonical' } },
			});
		} finally {
			if (descriptor) {
				Object.defineProperty(document, 'cookie', descriptor);
			} else {
				delete (document as { cookie?: string }).cookie;
			}
		}
	});

	it('clear() removes the stored record and the in-memory denials', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();
		persistence.clear();
		expect(readStoredVendorChoice(undefined, NOW)).toBeNull();
		expect(kernel.getSnapshot().vendorChoice).toBeNull();
		persistence.dispose();
		kernel.dispose();
	});
});
