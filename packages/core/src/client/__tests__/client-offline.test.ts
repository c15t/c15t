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
		expect(response.data?.policy?.id).toBe(
			'policy_default_offline_opt_in_banner'
		);
		expect(response.data?.policy?.model).toBe('opt-in');
		expect(response.data?.policy?.ui?.mode).toBe('banner');
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
		expect(response.data?.policy?.model).toBe('opt-in');
		expect(response.data?.policy?.ui?.mode).toBe('banner');
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

	it('should include configured offline policy payload in init response', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policy: {
						id: 'offline_preview_us_ca',
						model: 'opt-in',
						consent: {
							expiryDays: 120,
							scopeMode: 'strict',
							categories: ['necessary', 'measurement'],
							preselectedCategories: ['measurement'],
						},
						ui: {
							mode: 'banner',
							banner: {
								allowedActions: ['accept', 'reject'],
								primaryAction: 'accept',
								actionOrder: ['accept', 'reject'],
								actionLayout: 'inline',
								uiProfile: 'balanced',
								scrollLock: true,
							},
						},
					},
					policyDecision: {
						policyId: 'offline_preview_us_ca',
						fingerprint: 'offline-preview',
						matchedBy: 'region',
						country: 'US',
						region: 'CA',
						jurisdiction: 'NONE',
					},
					policySnapshotToken: 'offline-preview-token',
				},
			},
		});

		const response = await client.init({
			headers: {
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.id).toBe('offline_preview_us_ca');
		expect(response.data?.policy?.model).toBe('opt-in');
		expect(response.data?.policy?.consent?.categories).toEqual([
			'necessary',
			'measurement',
		]);
		expect(response.data?.policy?.consent?.preselectedCategories).toEqual([
			'measurement',
		]);
		expect(response.data?.policy?.ui?.mode).toBe('banner');
		expect(response.data?.policy?.ui?.banner?.scrollLock).toBe(true);
		expect(response.data?.policyDecision?.matchedBy).toBe('region');
		expect(response.data?.policySnapshotToken).toBe('offline-preview-token');
	});

	it('should resolve configured offline policy pack using backend matcher precedence', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policies: [
						{
							id: 'policy_default_none',
							match: { isDefault: true },
							consent: { model: 'none' },
							ui: { mode: 'none' },
						},
						{
							id: 'policy_country_us',
							match: { countries: ['US'] },
							consent: { model: 'opt-out' },
							ui: { mode: 'banner' },
						},
						{
							id: 'policy_region_us_ca',
							match: { regions: [{ country: 'US', region: 'CA' }] },
							consent: { model: 'opt-in' },
							ui: { mode: 'dialog' },
						},
					],
				},
			},
		});

		const response = await client.init({
			headers: {
				'x-c15t-country': 'US',
				'x-c15t-region': 'CA',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.id).toBe('policy_region_us_ca');
		expect(response.data?.policyDecision?.matchedBy).toBe('region');
		expect(response.data?.policyDecision?.jurisdiction).toBe('NONE');
	});

	it('should reject offline policy packs that use IAB without offline IAB config', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policies: [
						{
							id: 'policy_gdpr_iab',
							match: { jurisdictions: ['GDPR'] },
							consent: { model: 'iab' },
						},
					],
				},
			},
		});

		await expect(
			client.init({
				headers: { 'x-c15t-country': 'DE' },
			})
		).rejects.toThrow(
			'Policies using consent.model="iab" require top-level iab.enabled=true'
		);
	});

	it('should omit policy when offline policy pack has no match and no default', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policies: [
						{
							id: 'policy_country_us',
							match: { countries: ['US'] },
							consent: { model: 'opt-out' },
							ui: { mode: 'banner' },
						},
					],
				},
			},
		});

		const response = await client.init({
			headers: { 'x-c15t-country': 'FR' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy).toBeUndefined();
		expect(response.data?.policyDecision).toBeUndefined();
	});

	it('should treat an explicit empty offline policy pack as no-banner mode', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policies: [],
				},
			},
		});

		const response = await client.init({
			headers: { 'x-c15t-country': 'DE' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.id).toBe('policy_default_no_banner');
		expect(response.data?.policy?.model).toBe('none');
		expect(response.data?.policy?.ui?.mode).toBe('none');
		expect(response.data?.policyDecision).toBeUndefined();
	});

	it('should default to an iab policy when offline iab is enabled', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				iab: {
					enabled: true,
					gvl: {} as never,
				},
			},
		});

		const response = await client.init();

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.id).toBe('policy_default_offline_iab');
		expect(response.data?.policy?.model).toBe('iab');
		expect(response.data?.policy?.ui).toBeUndefined();
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
});
