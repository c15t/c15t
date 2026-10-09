import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import iabBannerClasses from '@c15t/ui/styles/components/iab-consent-banner';
import iabDialogClasses from '@c15t/ui/styles/components/iab-consent-dialog';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import ConsentScript from '../components/consent-script.astro';
import IABConsentDialog from '../components/iab-panel.astro';
import IABConsentBanner from '../components/iab-prompt.astro';
import ConsentDialogTrigger from '../components/panel-trigger.astro';
import ConsentBanner from '../components/prompt.astro';
import { INLINE_IAB_STYLES_CSS, INLINE_STYLES_CSS } from '../inline-styles';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule } from './policy-fixture';

/**
 * The page carries the first-paint rules in its HTML, where it carries the
 * config, so no stylesheet link holds back the first paint.
 */

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const buildLocals = async function buildLocals(
	options: Partial<C15tAstroOptions> = {}
): Promise<C15tLocals> {
	return await resolveConsentContext({
		headers: new Headers(),
		options: resolveOptions({
			mode: offlineMode({ policyRules: [testRule] }),
			...options,
		}),
	});
};

const INLINED = /<style[^>]*data-c15t-styles="c15t-first-paint"[^>]*>/gu;
const INLINED_IAB =
	/<style[^>]*data-c15t-styles="c15t-iab-first-paint"[^>]*>/gu;

const IAB_OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'marketing'],
	iab: { cmpId: 160, gvl: MINIMAL_GVL as never },
	mode: offlineMode({
		policyRules: [
			{
				categories: ['marketing'],
				id: 'iab',
				match: { fallback: true },
				model: 'iab',
				prompt: 'choice',
				scopeMode: 'permissive',
			},
		],
	}),
};

describe('inlined first-paint styles', () => {
	it('<ConsentScript /> inlines them once per request, with the nonce', async () => {
		const locals = { c15t: { ...(await buildLocals()), nonce: 'page-nonce' } };
		const head = await container.renderToString(ConsentScript, { locals });
		const banner = await container.renderToString(ConsentBanner, {
			locals,
			props: {},
		});

		expect(head.match(INLINED)).toHaveLength(1);
		expect(head).toContain(INLINE_STYLES_CSS);
		// The browser hides the banner with `hidden`; the rule lets it win
		// over the banner's own `display`.
		expect(head).toMatch(/\[hidden\][^{]*\{display:none!important\}/u);
		expect(head).toMatch(
			/<style[^>]*data-c15t-styles="c15t-first-paint"[^>]*nonce="page-nonce"/u
		);
		expect(banner.match(INLINED)).toBeNull();
	});

	it('a banner without <ConsentScript /> inlines them before its markup', async () => {
		const html = await container.renderToString(ConsentBanner, {
			locals: { c15t: await buildLocals() },
			props: {},
		});
		const styles = html.search(INLINED);

		expect(styles).toBeGreaterThan(-1);
		expect(html.indexOf('data-testid="consent-banner-root"')).toBeGreaterThan(
			styles
		);
	});

	it('are left to the site with `styles: false`', async () => {
		const locals = { c15t: await buildLocals({ styles: false }) };
		const head = await container.renderToString(ConsentScript, { locals });

		expect(head).toContain('data-c15t-config');
		expect(head.match(INLINED)).toBeNull();
	});

	it('renders IAB variables and banner rules in the server head once, without panel rules', async () => {
		const locals = {
			c15t: { ...(await buildLocals(IAB_OPTIONS)), nonce: 'page-nonce' },
		};
		const head = await container.renderToString(ConsentScript, { locals });
		const body = await container.renderToString(IABConsentBanner, { locals });
		const dialog = await container.renderToString(IABConsentDialog, { locals });

		expect(head.match(INLINED_IAB)).toHaveLength(1);
		expect(head).toContain(INLINE_IAB_STYLES_CSS);
		expect(head).toContain(`.${iabBannerClasses.card}`);
		expect(head).not.toContain(`.${iabDialogClasses.card}`);
		expect(head).toMatch(
			/<style[^>]*data-c15t-styles="c15t-iab-first-paint"[^>]*nonce="page-nonce"/u
		);
		expect(head).not.toContain('<link');
		expect(body).toContain('data-testid="iab-consent-banner-root"');
		expect(body.match(INLINED_IAB)).toBeNull();
		expect(dialog.match(INLINED_IAB)).toBeNull();
	});

	it('styles a standalone IAB banner before its server-rendered markup', async () => {
		const html = await container.renderToString(IABConsentBanner, {
			locals: { c15t: await buildLocals(IAB_OPTIONS) },
		});
		expect(html.search(INLINED_IAB)).toBeGreaterThan(-1);
		expect(html.search(INLINED_IAB)).toBeLessThan(
			html.indexOf('data-testid="iab-consent-banner-root"')
		);
	});

	it('a dialog trigger can supply the shared rules before the deferred surface', async () => {
		const html = await container.renderToString(ConsentDialogTrigger, {
			locals: { c15t: await buildLocals(IAB_OPTIONS) },
			props: { kind: 'iab' },
		});
		expect(html.match(INLINED)).toHaveLength(1);
		expect(html.match(INLINED_IAB)).toHaveLength(1);
	});

	it.each([undefined, false, { enabled: false }] as const)(
		'inlines no IAB rules when IAB is disabled with %j',
		async (iab) => {
			const html = await container.renderToString(ConsentScript, {
				locals: { c15t: await buildLocals({ iab }) },
			});
			expect(html.match(INLINED_IAB)).toBeNull();
			expect(html).not.toContain(INLINE_IAB_STYLES_CSS);
		}
	);

	it.each(['styles:false', 'Tailwind 3'] as const)(
		'does not inline base or IAB rules with %s external delivery',
		async (delivery) => {
			const c15t = await buildLocals({
				...IAB_OPTIONS,
				styles: delivery !== 'styles:false',
			});
			if (delivery === 'Tailwind 3') {
				c15t.options.inlineStyles = false;
			}
			const html = await container.renderToString(IABConsentBanner, {
				locals: { c15t },
			});
			expect(html.match(INLINED)).toBeNull();
			expect(html.match(INLINED_IAB)).toBeNull();
			expect(html).toContain('data-testid="iab-consent-banner-root"');
		}
	);
});
