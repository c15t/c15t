import { describe, expect, it } from 'vitest';

import { promptClassNames } from '../banner/class-names';
import { buildPrompt } from '../browser/render-prompt';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import { testRule } from './policy-fixture';

/**
 * A prerendered page in hosted or manifest mode gets its banner from the
 * browser renderer, which must apply `theme.slots` the way the server
 * render does.
 */
describe('browser-rendered banner and theme.slots', () => {
	it('adds slot classes and styles to the parts they name', async () => {
		const locals = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions({
				mode: offlineMode({ policyRules: [testRule] }),
			}),
		});
		const host = document.createElement('div');
		host.append(
			...buildPrompt(
				locals.snapshot,
				{ classNames: promptClassNames, props: {} },
				{
					presentation: { prompt: { primaryActions: ['accept'] } },
					theme: {
						slots: {
							buttonPrimary: 'brand-primary',
							consentBanner: 'brand-banner',
							consentBannerCard: {
								className: 'brand-card',
								style: { borderTopWidth: '4px' },
							},
							consentBannerFooter: 'brand-footer',
							consentBannerTag: 'brand-tag',
						},
					},
				}
			)
		);
		const part = (testId: string): HTMLElement => {
			const found = host.querySelector<HTMLElement>(
				`[data-testid="${testId}"]`
			);
			if (!found) {
				throw new Error(`Missing ${testId}`);
			}
			return found;
		};

		expect(part('consent-banner-card').classList).toContain('brand-card');
		expect(part('consent-banner-card').style.borderTopWidth).toBe('4px');
		expect(part('consent-banner-root').classList).toContain('brand-banner');
		expect(part('consent-banner-footer').classList).toContain('brand-footer');
		expect(part('consent-banner-branding').classList).toContain('brand-tag');
		expect(part('consent-banner-accept-button').classList).toContain(
			'brand-primary'
		);
	});
});
