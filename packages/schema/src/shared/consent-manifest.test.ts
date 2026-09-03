import { baseTranslations } from '@c15t/translations/all';
import { describe, expect, test } from 'vitest';

import {
	buildDefaultOptInPolicy,
	resolveInitFromManifest,
} from './consent-manifest';
import type { ConsentManifest } from './consent-manifest';

const manifest = {
	branding: 'c15t',
	revision: 'translations-test',
	schemaVersion: 1,
} satisfies ConsentManifest;

describe('buildDefaultOptInPolicy', () => {
	test('builds the shared bare-offline opt-in banner policy', () => {
		expect(buildDefaultOptInPolicy()).toEqual({
			consent: {
				categories: [
					'necessary',
					'functionality',
					'marketing',
					'measurement',
					'experience',
				],
				scopeMode: 'permissive',
			},
			id: 'default-opt-in',
			model: 'opt-in',
			ui: {
				mode: 'banner',
			},
		});
	});

	test('uses explicit inline categories when provided', () => {
		expect(buildDefaultOptInPolicy(['necessary', 'marketing']).consent).toEqual(
			{
				categories: ['necessary', 'marketing'],
				scopeMode: 'permissive',
			}
		);
	});
});

describe('resolveInitFromManifest translations', () => {
	test('resolves German when base translations are provided', () => {
		const result = resolveInitFromManifest(
			manifest,
			{ language: 'de-DE' },
			{ baseTranslations }
		);

		expect(result.translations.language).toBe('de');
		expect(result.translations.translations.common.acceptAll).toBe(
			'Alle akzeptieren'
		);
	});

	test('falls back to English and warns once without base translations', () => {
		const warnings: string[] = [];
		const logger = {
			warn(message: string) {
				warnings.push(message);
			},
		};

		const first = resolveInitFromManifest(
			manifest,
			{ language: 'de-DE' },
			{ logger }
		);
		resolveInitFromManifest(manifest, { language: 'de-DE' }, { logger });

		expect(first.translations.language).toBe('en');
		expect(first.translations.translations.common.acceptAll).toBe('Accept All');
		expect(warnings).toEqual([
			"Base translations were not provided for 'de'. Falling back to English translations.",
		]);
	});
});
