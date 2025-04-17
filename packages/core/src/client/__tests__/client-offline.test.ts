import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { configureConsentManager } from '../client-factory';
import { OfflineClient } from '../client-offline';

describe('Offline Client Tests', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockLocalStorage.clear();
	});

	it('should check localStorage for consent banner visibility', async () => {
		// Mock localStorage to return null (no stored consent)
		mockLocalStorage.getItem.mockReturnValueOnce(null);

		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(mockLocalStorage.getItem).toHaveBeenCalledWith('c15t-consent');
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.ok).toBe(true);
		expect(response.data?.showConsentBanner).toBe(true);
	});

	it('should not show banner when consent is stored in localStorage', async () => {
		// Mock localStorage to return stored consent
		mockLocalStorage.getItem.mockReturnValueOnce(
			JSON.stringify({
				timestamp: new Date().toISOString(),
				preferences: { analytics: true },
			})
		);

		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call the API
		const response = await client.showConsentBanner();

		// Assertions
		expect(mockLocalStorage.getItem).toHaveBeenCalledWith('c15t-consent');
		expect(response.data?.showConsentBanner).toBe(false);
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

		// With the storage test, we now expect 2 localStorage calls (test + actual storage)
		expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
		// The second call should be with our data
		expect(mockLocalStorage.setItem).toHaveBeenNthCalledWith(
			2,
			'c15t-consent',
			expect.stringContaining(JSON.stringify(consentData.preferences))
		);
	});

	it('should handle localStorage errors gracefully', async () => {
		// Mock localStorage to throw an error
		mockLocalStorage.getItem.mockImplementationOnce(() => {
			throw new Error('localStorage is not available');
		});

		// Configure the client
		const client = configureConsentManager({
			mode: 'offline',
		});

		// Call the API - should not throw
		const response = await client.showConsentBanner();

		// Assertions - now we expect NOT to show the banner when localStorage is unavailable
		expect(response.ok).toBe(true);
		expect(response.data?.showConsentBanner).toBe(false);
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
