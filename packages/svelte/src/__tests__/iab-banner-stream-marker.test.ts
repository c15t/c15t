/**
 * The server-rendered IAB banner ends its root with the hidden stream marker
 * the shared stylesheet waits for, so a partially parsed card stays hidden.
 */
import { resolvePolicyRules } from '@c15t/schema/types';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { closeSsrWorker, renderSsr, warmSsrWorker } from './server-render';

beforeAll(() => warmSsrWorker(), 60_000);
afterAll(() => closeSsrWorker());

test('SSR ends the IAB banner root with its hidden stream marker', async () => {
	const rendered = await renderSsr(
		{
			component: 'iab-consent-banner' as const,
			options: {
				disableAnimation: true,
				iab: { cmpId: 28 },
				persistence: false,
				prefetch: {
					initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
					initialPolicyResolution: resolvePolicyRules({
						countryCode: 'DE',
						regionCode: null,
						rules: [
							{
								id: 'iab',
								match: { isDefault: true },
								model: 'iab',
								prompt: 'choice',
							},
						],
					}),
				},
			},
		},
		'conformance-fixture.svelte'
	);
	const target = document.createElement('div');
	target.innerHTML = rendered.html;
	const root = target.querySelector('[data-testid="iab-consent-banner-root"]');
	const marker = root?.lastElementChild;

	expect(root?.hasAttribute('data-c15t-streamed')).toBe(true);
	expect(root?.querySelectorAll('[data-c15t-stream-end]')).toHaveLength(1);
	expect(marker?.matches('span[data-c15t-stream-end]')).toBe(true);
	expect(marker?.hasAttribute('hidden')).toBe(true);
});
