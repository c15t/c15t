/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { configureConsentManager } from '../client';
import {
	deleteConsentFromStorage,
	getConsentFromStorage,
	saveConsentToStorage,
} from '../libs/cookie';
import { createConsentManagerStore } from '../store';

const gate = vi.hoisted(() => ({
	entered: Promise.withResolvers<void>(),
	release: Promise.withResolvers<void>(),
}));

// Hold the real fingerprint computation at its asynchronous boundary.
vi.mock('@c15t/schema/types', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@c15t/schema/types')>();
	return {
		...actual,
		async createMaterialPolicyFingerprint(
			...args: Parameters<typeof actual.createMaterialPolicyFingerprint>
		) {
			gate.entered.resolve();
			await gate.release.promise;
			return actual.createMaterialPolicyFingerprint(...args);
		},
	};
});

beforeEach(() => {
	gate.entered = Promise.withResolvers<void>();
	gate.release = Promise.withResolvers<void>();
	localStorage.clear();
	deleteConsentFromStorage();
});

afterEach(() => {
	gate.release.resolve();
	deleteConsentFromStorage();
});

test.each([
	false,
	true,
])('startup save survives reload, was %s', async (previousMarketing) => {
	const oldTime = Date.now() - 60_000;
	saveConsentToStorage({
		consents: {
			necessary: true,
			marketing: previousMarketing,
			measurement: false,
			experience: false,
			functionality: false,
		},
		consentInfo: { subjectId: 'sub_2VZxR7YmNpKq3WfLs8TgHd', time: oldTime },
	});
	const manager = configureConsentManager({ mode: 'offline' });
	const options = { reloadOnConsentRevoked: false };
	const store = createConsentManagerStore(manager, options);
	await gate.entered.promise;
	expect(store.getState().hasFetchedBanner).toBe(false);
	store.getState().setSelectedConsent('marketing', !previousMarketing);
	await store.getState().saveConsents('custom');
	const savedTime = store.getState().consentInfo?.time;
	expect(savedTime).toBeGreaterThan(oldTime);
	expect(store.getState().hasFetchedBanner).toBe(false);
	type Stored = {
		consents: { marketing: boolean };
		consentInfo: { time: number };
	};
	expect(getConsentFromStorage<Stored>()?.consents.marketing).toBe(
		!previousMarketing
	);
	gate.release.resolve();
	await vi.waitFor(() => expect(store.getState().hasFetchedBanner).toBe(true));
	const stored = getConsentFromStorage<Stored>();
	const reloaded = createConsentManagerStore(manager, options);
	await vi.waitFor(() =>
		expect(reloaded.getState().hasFetchedBanner).toBe(true)
	);
	const result = {
		inMemory: store.getState().consents.marketing,
		stored: stored?.consents.marketing,
		reloaded: reloaded.getState().consents.marketing,
		metadataPreserved: store.getState().consentInfo?.time === savedTime,
	};
	expect(result).toEqual({
		inMemory: !previousMarketing,
		stored: !previousMarketing,
		reloaded: !previousMarketing,
		metadataPreserved: true,
	});
});
