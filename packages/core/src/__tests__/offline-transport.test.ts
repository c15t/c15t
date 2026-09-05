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
	test('no rules report unconfigured', async () => {
		const transport = createOfflineTransport();
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
		expect(response?.policyResolution).toEqual({
			policy: null,
			status: 'unconfigured',
			version: 1,
		});
		expect(response?.branding).toBe('c15t');
		expect(response?.translations?.language).toBe('en');
	});

	test('empty rules report no-match', async () => {
		const transport = createOfflineTransport({ policyRules: [] });
		const response = await transport.init?.({
			overrides: {},
			user: null,
		});
		expect(response?.policyResolution).toEqual({
			policy: null,
			status: 'no-match',
			version: 1,
		});
	});

	test('custom defaultLanguage + branding honored', async () => {
		const transport = createOfflineTransport({
			branding: 'consent',
			defaultLanguage: 'de',
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
	test('matching rule drives model and prompt', async () => {
		const transport = createOfflineTransport({
			policyRules: [
				{
					id: 'gdpr',
					match: { countries: ['DE'] },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		});
		const response = await transport.init?.({
			overrides: { country: 'DE' },
			user: null,
		});
		expect(response?.policyResolution).toMatchObject({
			policy: { id: 'gdpr', model: 'opt-in', prompt: 'choice' },
			status: 'matched',
		});
	});

	test('non-matching location reports no-match', async () => {
		const transport = createOfflineTransport({
			policyRules: [
				{
					id: 'gdpr',
					match: { countries: ['DE'] },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		});
		const response = await transport.init?.({
			overrides: { country: 'US' },
			user: null,
		});
		expect(response?.policyResolution).toEqual({
			policy: null,
			status: 'no-match',
			version: 1,
		});
	});
});

describe('createOfflineTransport: kernel integration', () => {
	test('kernel.commands.init with offline transport populates snapshot', async () => {
		const kernel = createConsentKernel({
			initialOverrides: { country: 'DE' },
			transport: createOfflineTransport({
				policyRules: [
					{
						id: 'gdpr',
						match: { countries: ['DE'] },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		});
		await kernel.commands.init();
		const snap = kernel.getSnapshot();
		expect(snap.activeUI).toBe('banner');
		expect(snap.model).toBe('opt-in');
		expect(snap.location).toEqual({ countryCode: 'DE', regionCode: null });
		expect(snap.policyRule.id).toBe('gdpr');
		expect(snap.translations).toBeDefined();
	});

	test('save() succeeds without a backend', async () => {
		const kernel = createConsentKernel({
			transport: createOfflineTransport(),
		});
		const result = await kernel.commands.save('all');
		expect(result.ok).toBe(true);
		expect(result.subjectId).toBe(
			kernel.getSnapshot().subject?.subjectId ?? null
		);
		expect(kernel.getSnapshot().hasConsented).toBe(true);
	});
});
