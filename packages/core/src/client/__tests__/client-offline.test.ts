import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../store/initial-state';
import { configureConsentManager } from '../client-factory';
import { OfflineClient } from '../offline';

describe('Offline Client Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockLocalStorage.clear();
	});

	it('should use jurisdiction checking for consent eligibility', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call the API without headers (defaults to GB)
		const response = await client.init();

		// Assertions - GB is a GDPR jurisdiction
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.ok).toBe(true);
		expect(response.data?.jurisdiction).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('GB');
	});

	it('should respect country header for jurisdiction determination', async () => {
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Test with GDPR country (DE)
		let response = await client.init({
			headers: { 'x-c15t-country': 'DE' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.jurisdiction).toBe('GDPR');
		expect(response.data?.location?.countryCode).toBe('DE');

		// Test with non-regulated country (US)
		response = await client.init({
			headers: { 'x-c15t-country': 'US' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.jurisdiction).toBe('NONE');
		expect(response.data?.location?.countryCode).toBe('US');
	});

	it('should handle region header', async () => {
		const client = configureConsentManager({
			mode: 'offline',
		});

		const response = await client.init({
			headers: {
				'x-c15t-country': 'DE',
				'x-c15t-region': 'BE',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.location?.countryCode).toBe('DE');
		expect(response.data?.location?.regionCode).toBe('BE');
	});

	it('should handle language header', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				initialTranslationConfig: {
					translations: {
						de: {},
					},
				},
			},
		});

		const response = await client.init({
			headers: {
				'x-c15t-country': 'DE',
				'accept-language': 'de',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.translations?.language).toBe('de');
	});

	it('should default to GB when no country header is provided', async () => {
		const client = configureConsentManager({
			mode: 'offline',
		});

		const response = await client.init();

		expect(response.ok).toBe(true);
		expect(response.data?.location?.countryCode).toBe('GB');
		expect(response.data?.jurisdiction).toBe('GDPR');
	});

	it('should store consent preferences in localStorage', async () => {
		// Reset the mock
		mockLocalStorage.setItem.mockClear();

		// Create an instance of OfflineClient
		const client = new OfflineClient();

		// Call setConsent with properly typed data
		const consentData = {
			type: 'cookie_banner' as const,
			domain: 'example.com',
			preferences: {
				analytics: true,
				marketing: false,
			},
		};

		await client.setConsent({ body: consentData });

		// Verify localStorage was called to store consent
		expect(mockLocalStorage.setItem).toHaveBeenCalled();
		// Verify it was called with our storage key and data
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
			STORAGE_KEY_V2,
			expect.stringContaining(JSON.stringify(consentData.preferences))
		);
	});

	it('should handle jurisdiction checking without localStorage dependency', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call the API - should work regardless of localStorage
		// Defaults to GB which is GDPR jurisdiction
		const response = await client.init();

		// Assertions - jurisdiction checking doesn't depend on localStorage
		expect(response.ok).toBe(true);
		expect(response.data?.jurisdiction).toBe('GDPR');
	});

	it('should always verify consent as valid in offline mode', async () => {
		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call verify consent
		const response = await client.verifyConsent();

		// In offline mode, consent is always considered valid
		expect(response.ok).toBe(true);
	});
});
