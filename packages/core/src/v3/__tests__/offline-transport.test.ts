/**
 * Tests for createOfflineTransport.
 *
 * Verifies that offline mode synthesizes the same InitResponse shape as
 * hosted mode, using local policy-pack resolution. Consumers can swap
 * transports without changes to the kernel or adapter.
 */
import { describe, expect, test } from 'vitest';
import { createConsentKernel, createOfflineTransport } from '../index';

describe('createOfflineTransport: basic behavior', () => {
	test('no policy packs → returns default jurisdiction + no-banner', async () => {
		const transport = createOfflineTransport();
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
		expect(response?.jurisdiction).toBe('NONE');
		expect(response?.showConsentBanner).toBe(false);
		expect(response?.branding).toBe('c15t');
		expect(response?.translations?.language).toBe('en');
	});

	test('custom defaultJurisdiction + defaultLanguage + branding honored', async () => {
		const transport = createOfflineTransport({
			defaultJurisdiction: 'GDPR',
			defaultLanguage: 'de',
			branding: 'consent',
		});
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
		expect(response?.jurisdiction).toBe('GDPR');
		expect(response?.translations?.language).toBe('de');
		expect(response?.branding).toBe('consent');
	});

	test('location reflects the overrides', async () => {
		const transport = createOfflineTransport();
		const response = await transport.init?.({
			overrides: { country: 'DE', region: 'BE' },
			user: null,
		});
		expect(response?.location).toEqual({
			countryCode: 'DE',
			regionCode: 'BE',
		});
	});

	test('ctx.overrides.language overrides default language', async () => {
		const transport = createOfflineTransport({ defaultLanguage: 'en' });
		const response = await transport.init?.({
			overrides: { language: 'fr' },
			user: null,
		});
		expect(response?.translations?.language).toBe('fr');
	});
});

describe('createOfflineTransport: policy-pack resolution', () => {
	test('matching policy pack drives showConsentBanner', async () => {
		const transport = createOfflineTransport({
			policyPacks: [
				{
					id: 'gdpr',
					match: { countries: ['DE'] },
					consent: { model: 'opt-in' },
					ui: { mode: 'banner' },
				},
			],
		});
		const response = await transport.init?.({
			overrides: { country: 'DE' },
			user: null,
		});
		expect(response?.showConsentBanner).toBe(true);
		expect(response?.policy).toBeDefined();
		expect(response?.policyDecision).toBeDefined();
	});

	test('non-matching override returns no policy', async () => {
		const transport = createOfflineTransport({
			policyPacks: [
				{
					id: 'gdpr',
					match: { countries: ['DE'] },
					consent: { model: 'opt-in' },
					ui: { mode: 'banner' },
				},
			],
		});
		const response = await transport.init?.({
			overrides: { country: 'US' },
			user: null,
		});
		expect(response?.policy).toBeUndefined();
		expect(response?.showConsentBanner).toBe(false);
	});
});

describe('createOfflineTransport: kernel integration', () => {
	test('kernel.commands.init with offline transport populates snapshot', async () => {
		const kernel = createConsentKernel({
			initialOverrides: { country: 'DE' },
			transport: createOfflineTransport({
				policyPacks: [
					{
						id: 'gdpr',
						match: { countries: ['DE'] },
						consent: { model: 'opt-in' },
						ui: { mode: 'banner' },
					},
				],
				defaultJurisdiction: 'GDPR',
			}),
		});
		await kernel.commands.init();
		const snap = kernel.getSnapshot();
		expect(snap.showConsentBanner).toBe(true);
		expect(snap.location).toEqual({ countryCode: 'DE', regionCode: null });
		expect(snap.policy).toBeDefined();
		expect(snap.translations).toBeDefined();
	});

	test('save() succeeds without a backend', async () => {
		const kernel = createConsentKernel({
			transport: createOfflineTransport(),
		});
		const result = await kernel.commands.save('all');
		expect(result.ok).toBe(true);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});
});
