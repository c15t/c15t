import { describe, expect, test } from 'vitest';
import { buildDefaultOptInPolicy } from './consent-manifest';

describe('buildDefaultOptInPolicy', () => {
	test('builds the shared bare-offline opt-in banner policy', () => {
		expect(buildDefaultOptInPolicy()).toEqual({
			id: 'default-opt-in',
			model: 'opt-in',
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
