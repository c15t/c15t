import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import {
	clearClientRegistry,
	configureConsentManager,
} from '../client-factory';
import { CustomClient } from '../custom';
import { C15tClient } from '../hosted';
import { OfflineClient } from '../offline';

describe('Client Factory Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
		clearClientRegistry();
	});

	it('should create C15tClient when mode is hosted', () => {
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'hosted',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});

	it('should create C15tClient when mode is legacy c15t', () => {
		const client = configureConsentManager({
			backendURL: '/api/c15t',
			mode: 'c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});

	it('should create OfflineClient when mode is offline', () => {
		const client = configureConsentManager({
			mode: 'offline',
		});

		expect(client).toBeInstanceOf(OfflineClient);
	});

	it('should create CustomClient when mode is custom', () => {
		const mockHandlers = {
			setConsent: vi.fn(),
			showConsentBanner: vi.fn(),
			verifyConsent: vi.fn(),
		};

		const client = configureConsentManager({
			endpointHandlers: mockHandlers,
			mode: 'custom',
		});

		expect(client).toBeInstanceOf(CustomClient);
	});

	it('should default to C15tClient (hosted) when no mode is specified', () => {
		const client = configureConsentManager({
			backendURL: '/api/c15t',
		});

		expect(client).toBeInstanceOf(C15tClient);
	});

	it('reuses the offline client for semantically equivalent policy packs', () => {
		const first = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: [
						{
							consent: { categories: ['necessary'], model: 'opt-in' },
							id: 'policy_us',
							match: { countries: ['US'] },
						},
					],
				},
			},
		});
		(first as OfflineClient & { __cacheProbe?: string }).__cacheProbe = 'hit';

		const second = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: [
						{
							consent: { categories: ['necessary'], model: 'opt-in' },
							id: 'policy_us',
							match: { countries: ['US'] },
						},
					],
				},
			},
		});

		expect(
			(second as OfflineClient & { __cacheProbe?: string }).__cacheProbe
		).toBe('hit');
	});
});
