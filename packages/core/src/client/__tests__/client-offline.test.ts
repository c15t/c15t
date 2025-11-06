import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../store.initial-state';
import { configureConsentManager } from '../client-factory';
import { OfflineClient } from '../offline';

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
		expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY_V2);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(response.ok).toBe(true);
		expect(response.data?.showConsentBanner).toBe(true);
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
