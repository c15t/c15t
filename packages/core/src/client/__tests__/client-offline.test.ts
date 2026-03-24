import { resolvePolicyDecision as resolveSharedPolicyDecision } from '@c15t/schema/types';
import type { Translations } from '@c15t/translations';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMock, mockLocalStorage } from '../../../vitest.setup';
import { STORAGE_KEY_V2 } from '../../store/initial-state';
import { configureConsentManager } from '../client-factory';
import { OfflineClient } from '../offline';

function profile(translations: Record<string, Partial<Translations>>) {
	return { translations };
}

function profileWithFallback(
	fallbackLanguage: string,
	translations: Record<string, Partial<Translations>>
) {
	return { fallbackLanguage, translations };
}

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
		expect(response.data?.policy?.id).toBe('offline_opt_in_banner');
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

	it('should keep offline language selection within configured translations', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				initialTranslationConfig: {
					defaultLanguage: 'fr',
					translations: {
						fr: {
							cookieBanner: {
								title: 'Titre FR',
							},
						},
					},
				},
			},
		});

		const response = await client.init({
			headers: {
				'accept-language': 'zh-CN,zh;q=0.9',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.translations.language).toBe('fr');
		expect(response.data?.translations.translations.cookieBanner.title).toBe(
			'Titre FR'
		);
	});

	it('should resolve offline policy profile languages with hosted parity', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: profile({
								en: { cookieBanner: { title: 'Default EN Title' } },
								es: { cookieBanner: { title: 'Default ES Title' } },
								pt: { cookieBanner: { title: 'Default PT Title' } },
							}),
							eu: profile({
								en: { cookieBanner: { title: 'EU EN Title' } },
								fr: { cookieBanner: { title: 'EU FR Title' } },
								de: { cookieBanner: { title: 'EU DE Title' } },
							}),
						},
					},
					policyPacks: [
						{
							id: 'eu',
							match: { countries: ['DE', 'FR', 'GB'] },
							i18n: { messageProfile: 'eu' },
							consent: { model: 'opt-in' },
							ui: { mode: 'banner' },
						},
						{
							id: 'default_world',
							match: { isDefault: true },
							consent: { model: 'none' },
							ui: { mode: 'none' },
						},
					],
				},
			},
		});

		const zhResponse = await client.init({
			headers: {
				'x-c15t-country': 'DE',
				'accept-language': 'zh-CN,zh;q=0.9',
			},
		});

		expect(zhResponse.ok).toBe(true);
		expect(zhResponse.data?.translations.language).toBe('en');
		expect(zhResponse.data?.translations.translations.cookieBanner.title).toBe(
			'EU EN Title'
		);

		const esResponse = await client.init({
			headers: {
				'x-c15t-country': 'DE',
				'accept-language': 'es-ES,es;q=0.9',
			},
		});

		expect(esResponse.ok).toBe(true);
		expect(esResponse.data?.translations.language).toBe('en');
		expect(esResponse.data?.translations.translations.cookieBanner.title).toBe(
			'EU EN Title'
		);
	});

	it('should honor offline policy fallbackLanguage inside the active profile', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: profile({
								en: { cookieBanner: { title: 'Default EN Title' } },
							}),
							eu: profileWithFallback('fr', {
								en: { cookieBanner: { title: 'EU EN Title' } },
								fr: { cookieBanner: { title: 'EU FR Title' } },
							}),
						},
					},
					policyPacks: [
						{
							id: 'eu',
							match: { countries: ['DE'] },
							i18n: { messageProfile: 'eu' },
							consent: { model: 'opt-in' },
							ui: { mode: 'banner' },
						},
					],
				},
			},
		});

		const response = await client.init({
			headers: {
				'x-c15t-country': 'DE',
				'accept-language': 'zh-CN,zh;q=0.9',
			},
		});

		expect(response.ok).toBe(true);
		expect(response.data?.translations.language).toBe('fr');
		expect(response.data?.translations.translations.cookieBanner.title).toBe(
			'EU FR Title'
		);
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
								layout: [['accept', 'reject']],
								direction: 'row',
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
		const policies = [
			{
				id: 'policy_default_none',
				match: { isDefault: true },
				consent: { model: 'none' as const },
				ui: { mode: 'none' as const },
			},
			{
				id: 'policy_country_us',
				match: { countries: ['US'] },
				consent: { model: 'opt-out' as const },
				ui: { mode: 'banner' as const },
			},
			{
				id: 'policy_region_us_ca',
				match: { regions: [{ country: 'US', region: 'CA' }] },
				consent: { model: 'opt-in' as const },
				ui: { mode: 'dialog' as const },
			},
		];
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: policies,
				},
			},
		});
		const expectedDecision = await resolveSharedPolicyDecision({
			policies,
			countryCode: 'US',
			regionCode: 'CA',
			jurisdiction: 'NONE',
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
		expect(response.data?.policyDecision?.fingerprint).toBe(
			expectedDecision?.fingerprint
		);
	});

	it('should reject offline policy packs that use IAB without offline IAB config', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: [
						{
							id: 'policy_gdpr_iab',
							match: { countries: ['DE'] },
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

	it('should treat unmatched offline policy packs as no-banner mode', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: [
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
		expect(response.data?.policy?.id).toBe('offline_no_banner');
		expect(response.data?.policy?.model).toBe('none');
		expect(response.data?.policy?.ui?.mode).toBe('none');
		expect(response.data?.policyDecision).toBeUndefined();
	});

	it('should treat an explicit empty offline policy pack as no-banner mode', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					policyPacks: [],
				},
			},
		});

		const response = await client.init({
			headers: { 'x-c15t-country': 'DE' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.id).toBe('offline_no_banner');
		expect(response.data?.policy?.model).toBe('none');
		expect(response.data?.policy?.ui?.mode).toBe('none');
		expect(response.data?.policyDecision).toBeUndefined();
	});

	it('should default to an opt-in banner when no offline pack is provided', async () => {
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
		expect(response.data?.policy?.id).toBe('offline_opt_in_banner');
		expect(response.data?.policy?.model).toBe('opt-in');
		expect(response.data?.policy?.ui?.mode).toBe('banner');
	});

	it('should not include preloaded GVL when the resolved offline policy is not iab', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				iab: {
					enabled: true,
					gvl: {
						vendors: {},
					} as never,
				},
				offlinePolicy: {
					policyPacks: [
						{
							id: 'us_opt_in',
							match: { countries: ['US'] },
							consent: { model: 'opt-in' },
							ui: { mode: 'banner' },
						},
					],
				},
			},
		});

		const response = await client.init({
			headers: { 'x-c15t-country': 'US' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.model).toBe('opt-in');
		expect(response.data?.gvl).toBeNull();
	});

	it('should preserve preloaded GVL when the resolved offline policy is iab', async () => {
		const preloadedGVL = {
			vendors: {},
		} as never;
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				iab: {
					enabled: true,
					gvl: preloadedGVL,
				},
				offlinePolicy: {
					policyPacks: [
						{
							id: 'de_iab',
							match: { countries: ['DE'] },
							consent: { model: 'iab', categories: ['*'] },
						},
					],
				},
			},
		});

		const response = await client.init({
			headers: { 'x-c15t-country': 'DE' },
		});

		expect(response.ok).toBe(true);
		expect(response.data?.policy?.model).toBe('iab');
		expect(response.data?.gvl).toBe(preloadedGVL);
	});

	it('should reject offline policy i18n profiles that do not exist', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: profile({
								en: { cookieBanner: { title: 'Default EN Title' } },
							}),
						},
					},
					policyPacks: [
						{
							id: 'eu',
							match: { countries: ['DE'] },
							i18n: { messageProfile: 'missing' },
							consent: { model: 'opt-in' },
							ui: { mode: 'banner' },
						},
					],
				},
			},
		});

		await expect(
			client.init({
				headers: { 'x-c15t-country': 'DE' },
			})
		).rejects.toThrow("Policy 'eu' references missing i18n profile 'missing'.");
	});

	it('should reject offline policy i18n languages without configured translations', async () => {
		const client = configureConsentManager({
			mode: 'offline',
			store: {
				offlinePolicy: {
					i18n: {
						defaultProfile: 'default',
						messages: {
							default: profile({
								en: { cookieBanner: { title: 'Default EN Title' } },
							}),
							empty: profile({}),
						},
					},
					policyPacks: [
						{
							id: 'de',
							match: { countries: ['DE'] },
							i18n: { language: 'fr', messageProfile: 'empty' },
							consent: { model: 'opt-in' },
							ui: { mode: 'banner' },
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
			"Policy 'de' i18n language 'fr' has no configured translation"
		);
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
