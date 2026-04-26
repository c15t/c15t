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
	test('no policy packs → returns no-banner policy', async () => {
		const transport = createOfflineTransport();
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
		expect(response?.policy?.id).toBe('no_banner');
		expect(response?.policy?.model).toBe('none');
		expect(response?.policy?.ui?.mode).toBe('none');
		expect(response?.branding).toBe('c15t');
		expect(response?.translations?.language).toBe('en');
	});

	test('custom defaultLanguage + branding honored', async () => {
		const transport = createOfflineTransport({
			defaultLanguage: 'de',
			branding: 'consent',
		});
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
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
	test('matching policy pack drives policy UI mode', async () => {
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
		expect(response?.policy?.ui?.mode).toBe('banner');
		expect(response?.policy).toBeDefined();
		expect(response?.policyDecision).toBeDefined();
	});

	test('non-matching override returns no-banner fallback policy', async () => {
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
		expect(response?.policy?.id).toBe('no_banner');
		expect(response?.policy?.ui?.mode).toBe('none');
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
			}),
		});
		await kernel.commands.init();
		const snap = kernel.getSnapshot();
		expect(snap.activeUI).toBe('banner');
		expect(snap.model).toBe('opt-in');
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
		expect(result.subjectId).toBe(kernel.getSnapshot().subjectId);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});
});
