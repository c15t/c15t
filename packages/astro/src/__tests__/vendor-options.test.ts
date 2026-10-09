import {
	buildConsentManifestFromConfig,
	policyRulePresets,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveOptions } from '../integration';
import { manifest as manifestMode, offline as offlineMode } from '../mode';
import { clearManifestCache, resolveConsentContext } from '../server';
import { testRule } from './policy-fixture';

afterEach(() => {
	clearManifestCache();
});

describe('the vendors option on the server', () => {
	it('asks about the categories code-declared vendors sit in, as the browser does', async () => {
		const c15t = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions({
				mode: offlineMode({ policyRules: [testRule] }),
				vendors: [
					{
						category: 'measurement',
						id: 'posthog',
						name: 'PostHog',
						privacyPolicyUrl: 'https://posthog.com/privacy',
					},
				],
			}),
		});
		expect(c15t.snapshot.evaluationPolicy.choiceScope).toEqual(['measurement']);
		expect(c15t.shouldShowBanner).toBe(true);
	});
});

describe('vendors from the backend manifest', () => {
	it('reach the page config beside the code-declared ones', async () => {
		const manifest = await buildConsentManifestFromConfig({
			policyRules: [policyRulePresets.europeOptIn()],
			vendors: [
				{
					category: 'marketing',
					id: 'x-pixel',
					name: 'X Pixel',
					privacyPolicyUrl: 'https://x.com/en/privacy',
				},
			],
		});
		const c15t = await resolveConsentContext({
			headers: new Headers({ 'x-vercel-ip-country': 'DE' }),
			options: resolveOptions({
				mode: manifestMode({ snapshot: manifest }),
				vendors: [
					{
						category: 'measurement',
						id: 'posthog',
						name: 'PostHog',
						privacyPolicyUrl: 'https://posthog.com/privacy',
					},
				],
			}),
		});
		expect(
			c15t.config.initialVendors?.declared.map((vendor) => vendor.id)
		).toEqual(['x-pixel']);
		expect(c15t.snapshot.evaluationPolicy.choiceScope).toEqual(
			expect.arrayContaining(['marketing', 'measurement'])
		);
	});
});
