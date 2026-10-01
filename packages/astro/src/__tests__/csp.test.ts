/**
 * Content Security Policy support for the inline code c15t renders.
 *
 * `Astro.locals.c15t.nonce` reaches every inline element, and the hashes
 * the integration hands to Astro's own CSP cover every one of them.
 *
 * The boot payload changes per visitor, so a hash-based policy cannot
 * allow it; a nonce-based one can, as long as every inline `<script>` and
 * `<style>` carries the request's nonce. Each component is rendered with a
 * theme, a system colour scheme and a prerendered (hidden) banner, so the
 * theme `<style>`, the colour-scheme script and the reveal script are all
 * present alongside the config script.
 */

import { createHash } from 'node:crypto';

import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import ConsentScript from '../components/consent-script.astro';
import IABConsentBanner from '../components/iab-prompt.astro';
import ConsentBanner from '../components/prompt.astro';
import { buildAstroCsp, buildInlineCodeHashes } from '../csp';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule } from './policy-fixture';

const NONCE = 'r4nd0m-n0nce';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const IAB_POLICY = {
	categories: ['marketing'],
	id: 'astro_iab_test',
	match: { fallback: true },
	model: 'iab',
	prompt: 'choice',
	scopeMode: 'permissive',
} as const;

const shared: C15tAstroOptions = {
	colorScheme: 'system',
	theme: { colors: { primary: 'oklch(0.6 0.2 250)' } },
};

const buildLocals = async function buildLocals(
	options: C15tAstroOptions,
	nonce: string | undefined
): Promise<C15tLocals> {
	const locals = await resolveConsentContext({
		headers: new Headers(),
		options: resolveOptions({ ...shared, ...options }),
	});
	// A prerendered render ships the banner hidden, with its reveal script.
	return { ...locals, nonce, prerendered: true };
};

/** The opening tag of every inline `<script>` and `<style>` in `html`. */
const inlineTags = function inlineTags(html: string): string[] {
	return (html.match(/<(?:script|style)\b[^>]*>/gu) ?? []).filter(
		(tag) => !/\bsrc=/u.test(tag)
	);
};

const surfaces = [
	[
		'<ConsentScript />',
		ConsentScript,
		{ mode: offlineMode({ policyRules: [testRule] }) },
	],
	[
		'<ConsentBanner />',
		ConsentBanner,
		{ mode: offlineMode({ policyRules: [testRule] }) },
	],
	[
		'<IABConsentBanner />',
		IABConsentBanner,
		{
			consentCategories: ['necessary', 'marketing'],
			iab: { cmpId: 160, gvl: MINIMAL_GVL as never },
			mode: offlineMode({ policyRules: [IAB_POLICY as never] }),
		},
	],
] as const;

describe.each(surfaces)('%s', (_name, component, options) => {
	it('puts the request nonce on every inline script and style', async () => {
		const html = await container.renderToString(component, {
			locals: { c15t: await buildLocals(options, NONCE) },
		});
		const tags = inlineTags(html);

		// Config, colour scheme and theme at the least; the banners add the
		// reveal script.
		expect(tags.length).toBeGreaterThanOrEqual(3);
		expect(html).toContain('<style');
		for (const tag of tags) {
			expect(tag).toContain(`nonce="${NONCE}"`);
		}
		expect(html).toMatch(/<script[^>]*data-c15t-config[^>]*>\{/u);
		// The browser only moves marked elements onto a ClientRouter page's
		// live nonce, so every inline script carries a c15t marker.
		for (const tag of tags.filter((value) => value.startsWith('<script'))) {
			expect(tag).toMatch(/data-c15t-(?:config|inline)/u);
		}
	});

	it('renders no nonce attribute without one', async () => {
		const html = await container.renderToString(component, {
			locals: { c15t: await buildLocals(options, undefined) },
		});
		expect(html).not.toContain('nonce=');
	});
});

describe('<ConsentBanner /> rendered as a server island', () => {
	it("carries the page's nonce, not the island request's", async () => {
		// `<ConsentBannerDeferred />` renders the banner in a request of its
		// own, with its own nonce, and passes the page's nonce as a prop.
		const html = await container.renderToString(ConsentBanner, {
			locals: {
				c15t: await buildLocals(
					{ mode: offlineMode({ policyRules: [testRule] }) },
					'island-request-nonce'
				),
			},
			props: { nonce: NONCE },
		});
		const tags = inlineTags(html);

		expect(tags.length).toBeGreaterThanOrEqual(3);
		for (const tag of tags) {
			expect(tag).toContain(`nonce="${NONCE}"`);
		}
		expect(html).not.toContain('island-request-nonce');
	});
});

describe("Astro's own CSP", () => {
	/** The hash a browser computes for an inline element's text. */
	const sha256 = (content: string): string =>
		`sha256-${createHash('sha256').update(content).digest('base64')}`;

	/** Text of every inline `<script>` and `<style>` a policy must allow. */
	const governedInlineCode = function governedInlineCode(html: string): {
		scripts: string[];
		styles: string[];
	} {
		const scripts: string[] = [];
		const styles: string[] = [];
		for (const match of html.matchAll(
			/<(?<tag>script|style)\b(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/\k<tag>>/gu
		)) {
			const { attrs = '', body = '', tag } = match.groups ?? {};
			// External files and data blocks are not inline code.
			if (/\bsrc=|type="application\/json"/u.test(attrs)) {
				continue;
			}
			(tag === 'style' ? styles : scripts).push(body);
		}
		return { scripts, styles };
	};

	it.each(surfaces)(
		'allows every inline element %s renders',
		async (_name, component, options) => {
			const locals = await buildLocals(options, undefined);
			const html = await container.renderToString(component, {
				locals: { c15t: locals },
			});
			const rendered = governedInlineCode(html);
			const hashes = await buildInlineCodeHashes(locals.options);

			expect(rendered.scripts.length).toBeGreaterThan(0);
			for (const script of rendered.scripts) {
				expect(hashes.scripts).toContain(sha256(script));
			}
			for (const style of rendered.styles) {
				expect(hashes.styles).toContain(sha256(style));
			}
		}
	);

	it('allows the theme stylesheet of every experiment arm', async () => {
		const experiment = {
			arms: {
				bold: { theme: { colors: { primary: 'oklch(0.5 0.25 30)' } } },
				plain: { prompt: { variant: 'bar' as const } },
			},
			id: 'banner-theme',
		};
		// Per-request arms (`consentMiddleware({ experimentArm })`) render any
		// arm, so the hashes cover all of them whatever `arm` the config has.
		const hashes = await buildInlineCodeHashes(
			resolveOptions({
				...shared,
				experiment: { ...experiment, arm: 'control' },
				mode: offlineMode({ policyRules: [testRule] }),
			})
		);

		const pages = await Promise.all(
			['control', 'bold', 'plain'].map(async (arm) => {
				const locals = await buildLocals(
					{
						experiment: { ...experiment, arm },
						mode: offlineMode({ policyRules: [testRule] }),
					},
					undefined
				);
				return container.renderToString(ConsentBanner, {
					locals: { c15t: locals },
				});
			})
		);
		for (const html of pages) {
			const { styles } = governedInlineCode(html);
			expect(styles.length).toBeGreaterThan(0);
			for (const style of styles) {
				expect(hashes.styles).toContain(sha256(style));
			}
		}
		// The bold arm adds one stylesheet; the plain arm keeps the host theme.
		expect(hashes.styles).toHaveLength(2);
	});

	it('adds the hashes where the site turned CSP on', async () => {
		const options = resolveOptions({
			...shared,
			mode: offlineMode({ policyRules: [testRule] }),
		});
		const hashes = await buildInlineCodeHashes(options);

		// `csp: true` reaches integrations with no algorithm filled in.
		expect(
			(await buildAstroCsp({ security: { csp: true } }, options))?.update
		).toEqual({
			security: {
				csp: {
					algorithm: 'SHA-256',
					scriptDirective: { hashes: hashes.scripts },
					styleDirective: { hashes: hashes.styles },
				},
			},
		});
		// Astro 5 keeps it under `experimental`.
		expect(
			(
				await buildAstroCsp(
					{ experimental: { csp: { algorithm: 'SHA-384' } } },
					options
				)
			)?.update
		).toMatchObject({
			experimental: {
				csp: {
					algorithm: 'SHA-384',
					scriptDirective: {
						hashes: expect.arrayContaining([
							expect.stringMatching(/^sha384-/u),
						]),
					},
				},
			},
		});
		expect(await buildAstroCsp({ security: {} }, options)).toBe(undefined);
	});

	it('allows the inline scripts the loader injects', async () => {
		const textContent = 'window.__analytics = true;';
		const hashes = await buildInlineCodeHashes(
			resolveOptions({
				mode: offlineMode({ policyRules: [testRule] }),
				scripts: [{ category: 'measurement', id: 'analytics', textContent }],
			})
		);
		expect(hashes.scripts).toContain(sha256(textContent));
	});

	it('hands the browser every script hash the policy allows, for clientEntrypoint scripts', async () => {
		// The site's own entry for an inline script its clientEntrypoint adds.
		const siteHash = sha256('window.__fromEntrypoint = true;');
		const options = resolveOptions({
			...shared,
			clientEntrypoint: './src/c15t.client.ts',
			mode: offlineMode({ policyRules: [testRule] }),
		});
		const csp = await buildAstroCsp(
			{ security: { csp: { scriptDirective: { hashes: [siteHash] } } } },
			options
		);
		const { scripts } = await buildInlineCodeHashes(options);

		expect(csp?.browser).toEqual({
			algorithm: 'SHA-256',
			scriptHashes: [...scripts, siteHash],
		});
		// Without a clientEntrypoint there is nothing for the browser to check.
		expect(
			(
				await buildAstroCsp(
					{ security: { csp: true } },
					resolveOptions({ mode: offlineMode({ policyRules: [testRule] }) })
				)
			)?.browser
		).toBeUndefined();
	});
});
