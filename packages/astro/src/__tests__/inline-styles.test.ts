import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import ConsentScript from '../components/consent-script.astro';
import ConsentBanner from '../components/prompt.astro';
import { INLINE_STYLES_CSS } from '../inline-styles';
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
});
