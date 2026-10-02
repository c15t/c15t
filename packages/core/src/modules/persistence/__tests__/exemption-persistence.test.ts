/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../index';
import { createPersistence, readStoredRecordsFromCookieHeader } from '../index';
import {
	readStoredExemptionPreferences,
	resolveStorageKeys,
	writeStoredExemptionPreferences,
} from '../record-storage';

const resolution = matchedResolution(
	optInRule({
		exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
		match: { countries: ['GB'] },
	})
);
const clearAll = () => {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};
const createKernel = () =>
	createConsentKernel({
		consentCategories: ['measurement', 'marketing'],
		initialPolicyResolution: resolution,
		now: NOW,
	});
beforeEach(() => {
	clearAll();
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
	clearAll();
});

describe('exemption persistence', () => {
	it('writes objections without consent receipts and hydrates them on reload and SSR', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);
		await kernel.commands.save({ measurement: false });
		await vi.runAllTimersAsync();
		const stored = readStoredExemptionPreferences(undefined, NOW);
		expect(stored).toMatchObject({
			ok: true,
			record: {
				categories: { measurement: { confirmedAt: NOW, value: false } },
			},
		});
		const { subject } = kernel.getSnapshot();
		expect(
			readStoredRecordsFromCookieHeader(document.cookie, undefined, NOW)
				.exemptionPreferences
		).toEqual(kernel.getSnapshot().exemptionPreferences);
		persistence.dispose();
		kernel.dispose();
		const fresh = createKernel();
		const rehydrated = createPersistence({ kernel: fresh, now: () => NOW });
		expect(fresh.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(
			fresh.getSnapshot().explicitChoice?.categories.measurement
		).toBeUndefined();
		expect(fresh.getSnapshot().subject).toEqual(subject);
		rehydrated.clear();
		expect(readStoredExemptionPreferences(undefined, NOW)).toBeNull();
		rehydrated.dispose();
		fresh.dispose();
	});
	it('adopts the stored subject when a concurrent preference-only save joins it', async () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		writeStoredExemptionPreferences(
			{
				categories: { measurement: { confirmedAt: NOW - 1, value: false } },
				subject: { subjectId: 'sub_existing' },
				version: 1,
			},
			undefined,
			NOW
		);
		await kernel.commands.save({ measurement: false });
		await vi.runAllTimersAsync();
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(readStoredExemptionPreferences(undefined, NOW)).toMatchObject({
			ok: true,
			record: { subject: { subjectId: 'sub_existing' } },
		});
		persistence.reconcile();
		expect(kernel.getSnapshot().subject?.subjectId).toBe('sub_existing');
		persistence.dispose();
		kernel.dispose();
	});

	it('merges independently confirmed categories and keeps objections on equal timestamps', () => {
		writeStoredExemptionPreferences(
			{
				categories: { measurement: { confirmedAt: NOW, value: true } },
				version: 1,
			},
			undefined,
			NOW
		);
		window.localStorage.setItem(
			resolveStorageKeys().exemptions,
			JSON.stringify({
				categories: {
					functionality: { confirmedAt: NOW - 1, value: false },
					measurement: { confirmedAt: NOW, value: false },
				},
				version: 1,
			})
		);
		expect(readStoredExemptionPreferences(undefined, NOW)).toMatchObject({
			ok: true,
			record: {
				categories: {
					functionality: { confirmedAt: NOW - 1, value: false },
					measurement: { confirmedAt: NOW, value: false },
				},
			},
		});
	});
	it('reconciles a newer objection and ignores malformed storage', () => {
		const kernel = createKernel();
		const persistence = createPersistence({ kernel, now: () => NOW });
		writeStoredExemptionPreferences(
			{
				categories: { measurement: { confirmedAt: NOW, value: false } },
				version: 1,
			},
			undefined,
			NOW
		);
		expect(persistence.reconcile()).toBe(true);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		const key = resolveStorageKeys().exemptions;
		document.cookie = `${key}=broken; path=/`;
		window.localStorage.setItem(key, 'broken');
		expect(persistence.reconcile()).toBe(false);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		persistence.dispose();
		kernel.dispose();
	});
});
