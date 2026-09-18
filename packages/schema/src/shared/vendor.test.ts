import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { vendorChoiceWireSchema } from '../api/subject/vendor-choice-wire';
import {
	buildConsentManifestFromConfig,
	resolveInitFromManifest,
} from './consent-manifest';
import { vendorCategoryConditionSchema, vendorSchema } from './vendor';

const NOW = 1_800_000_000_000;

describe('vendorSchema', () => {
	it('accepts a vendor with a nested category condition', () => {
		const result = v.safeParse(vendorSchema, {
			category: { or: ['marketing', { and: ['measurement', 'experience'] }] },
			id: 'meta-pixel',
			name: 'Meta Pixel',
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
		});
		expect(result.success).toBe(true);
	});

	it.each([
		['uppercase id', 'Meta-Pixel'],
		['spaces', 'meta pixel'],
		['leading dash', '-meta'],
		['too long', 'a'.repeat(65)],
	])('rejects an id with %s', (_label, id) => {
		const result = v.safeParse(vendorSchema, {
			category: 'marketing',
			id,
			name: 'Meta',
			privacyPolicyUrl: 'https://example.com/privacy',
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown categories and empty condition lists', () => {
		expect(
			v.safeParse(vendorCategoryConditionSchema, 'analytics').success
		).toBe(false);
		expect(
			v.safeParse(vendorCategoryConditionSchema, { and: [] }).success
		).toBe(false);
		expect(
			v.safeParse(vendorCategoryConditionSchema, { not: 'marketing' }).success
		).toBe(true);
	});
});

describe('vendorChoiceWireSchema', () => {
	it('accepts a versioned grant map', () => {
		const result = v.safeParse(vendorChoiceWireSchema, {
			confirmedAt: NOW,
			grants: { 'google-analytics': true, 'meta-pixel': false },
			version: 1,
		});
		expect(result.success).toBe(true);
	});

	it.each([
		['unknown version', { confirmedAt: NOW, grants: {}, version: 2 }],
		['extra key', { confirmedAt: NOW, extra: 1, grants: {}, version: 1 }],
		[
			'non-boolean grant',
			{ confirmedAt: NOW, grants: { a: 'yes' }, version: 1 },
		],
		['bad id', { confirmedAt: NOW, grants: { 'Bad Id': true }, version: 1 }],
		['negative time', { confirmedAt: -1, grants: {}, version: 1 }],
	])('rejects %s', (_label, input) => {
		expect(v.safeParse(vendorChoiceWireSchema, input).success).toBe(false);
	});
});

describe('consent manifest vendors', () => {
	it('carries declared vendors through the manifest into init output', async () => {
		const vendors = [
			{
				category: 'marketing' as const,
				id: 'meta-pixel',
				name: 'Meta Pixel',
				privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
			},
		];
		const manifest = await buildConsentManifestFromConfig({
			policyRules: [
				{
					id: 'default',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
			vendorListVersion: '2026-09',
			vendors,
		});
		expect(manifest.vendors).toEqual(vendors);
		expect(manifest.vendorListVersion).toBe('2026-09');

		const output = resolveInitFromManifest(manifest, {
			country: 'DE',
			language: 'en',
		});
		expect(output.vendors).toEqual(vendors);
		expect(output.vendorListVersion).toBe('2026-09');
	});

	it('emits an empty vendor list and no version when the manifest declares none', async () => {
		// The client keeps its current declarations when the list is omitted, so
		// a backend that removed its last vendor has to send an empty list.
		const manifest = await buildConsentManifestFromConfig({});
		const output = resolveInitFromManifest(manifest, { language: 'en' });
		expect(output.vendors).toEqual([]);
		expect(output).not.toHaveProperty('vendorListVersion');
	});
});
