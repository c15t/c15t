import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { configureConsentManager } from '../client-factory';
import type { ConsentManagerCallbacks } from '../client-interface';

describe('Client Callbacks Tests', () => {
	// Common callback mocks
	const callbacks: ConsentManagerCallbacks = {
		onConsentBannerFetched: vi.fn(),
		onConsentSet: vi.fn(),
		onConsentVerified: vi.fn(),
		onError: vi.fn(),
	};

	beforeEach(() => {
		vi.resetAllMocks();
		fetchMock.mockReset();
		mockLocalStorage.clear();
	});

	describe('c15t Client Callbacks', () => {
		it('should call onConsentBannerFetched with correct payload', async () => {
			// Mock successful response
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						showConsentBanner: true,
						jurisdiction: { code: 'EU', message: 'European Union' },
						location: { countryCode: 'GB', regionCode: null },
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

			const client = configureConsentManager({
				mode: 'c15t',
				backendURL: '/api/c15t',
				callbacks,
			});

			await client.showConsentBanner();

			expect(callbacks.onConsentBannerFetched).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					showConsentBanner: true,
					jurisdiction: { code: 'EU', message: 'European Union' },
					location: { countryCode: 'GB', regionCode: null },
				},
			});
		});

		it('should call onConsentSet with correct payload', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						type: 'cookie_banner',
						preferences: { analytics: true },
						domain: 'example.com',
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

			const client = configureConsentManager({
				mode: 'c15t',
				backendURL: '/api/c15t',
				callbacks,
			});

			const consentData = {
				type: 'cookie_banner' as const,
				domain: 'example.com',
				preferences: { analytics: true },
			};

			await client.setConsent({ body: consentData });

			expect(callbacks.onConsentSet).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					type: 'cookie_banner',
					preferences: { analytics: true },
					domain: 'example.com',
				},
			});
		});

		it('should call onConsentVerified with correct payload', async () => {
			fetchMock.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						type: 'cookie_banner',
						preferences: ['analytics'],
						isValid: true,
						domain: 'example.com',
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

			const client = configureConsentManager({
				mode: 'c15t',
				backendURL: '/api/c15t',
				callbacks,
			});

			await client.verifyConsent({
				body: {
					type: 'cookie_banner',
					preferences: ['analytics'],
					domain: 'example.com',
				},
			});

			expect(callbacks.onConsentVerified).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					type: 'cookie_banner',
					preferences: ['analytics'],
					valid: true,
					domain: 'example.com',
				},
			});
		});
	});

	describe('Offline Client Callbacks', () => {
		it('should call onConsentBannerFetched with correct payload', async () => {
			const client = configureConsentManager({
				mode: 'offline',
				callbacks,
			});

			await client.showConsentBanner();

			expect(callbacks.onConsentBannerFetched).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					showConsentBanner: true,
					jurisdiction: { code: 'EU', message: 'EU' },
					location: { countryCode: 'GB', regionCode: null },
				},
			});
		});

		it('should call onConsentSet with correct payload', async () => {
			const client = configureConsentManager({
				mode: 'offline',
				callbacks,
			});

			const consentData = {
				type: 'cookie_banner' as const,
				domain: 'example.com',
				preferences: { analytics: true },
			};

			await client.setConsent({ body: consentData });

			expect(callbacks.onConsentSet).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					type: 'cookie_banner',
					preferences: { analytics: true },
					domain: 'example.com',
				},
			});
		});

		it('should call onConsentVerified with correct payload', async () => {
			const client = configureConsentManager({
				mode: 'offline',
				callbacks,
			});

			await client.verifyConsent({
				body: {
					type: 'cookie_banner',
					preferences: ['analytics'],
					domain: 'example.com',
				},
			});

			expect(callbacks.onConsentVerified).toHaveBeenCalledWith({
				ok: true,
				error: null,
				response: null,
				data: {
					type: 'cookie_banner',
					preferences: ['analytics'],
					valid: true,
					domain: 'example.com',
				},
			});
		});
	});
});
