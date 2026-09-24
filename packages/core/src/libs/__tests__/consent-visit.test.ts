/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import {
	createConsentVisitId,
	createConsentVisitTracker,
} from '../consent-visit';
import { createMockConsentBannerResponse } from '../init-consent-manager/__tests__/test-setup';

const visitId = 'ac2025bb-d674-4f94-b528-4f4b48bf7806';
const enabled = () => ({
	...createMockConsentBannerResponse(),
	visitTracking: { enabled: true as const, visitId },
});

describe('init consent correlation', () => {
	it('requires both backend opt-in and the exact expected init ID', () => {
		const current = createConsentVisitTracker();
		current.initialise(enabled());
		expect(current.getVisitId()).toBeUndefined();
		current.initialise(enabled(), crypto.randomUUID());
		expect(current.getVisitId()).toBeUndefined();
		current.initialise(enabled(), visitId);
		expect(current.getVisitId()).toBe(visitId);
		current.initialise(createMockConsentBannerResponse(), visitId);
		expect(current.getVisitId()).toBeUndefined();
	});
	it('rejects malformed identifiers and clears links on failure or disposal', () => {
		const current = createConsentVisitTracker();
		current.initialise(
			{ ...enabled(), visitTracking: { enabled: true, visitId: 'bad' } },
			'bad'
		);
		expect(current.getVisitId()).toBeUndefined();
		current.initialise(enabled(), visitId);
		current.initialise(undefined);
		expect(current.getVisitId()).toBeUndefined();
		current.dispose();
		current.initialise(enabled(), visitId);
		expect(current.getVisitId()).toBeUndefined();
	});
	it('creates a fresh in-memory ID without using browser storage', () => {
		const first = createConsentVisitId();
		expect(first).toMatch(/^[0-9a-f-]{36}$/);
		expect(createConsentVisitId()).not.toBe(first);
	});
	it('fails open for consent when crypto is unavailable', () => {
		vi.stubGlobal('crypto', undefined);
		expect(createConsentVisitId()).toBeUndefined();
		vi.unstubAllGlobals();
	});
});
