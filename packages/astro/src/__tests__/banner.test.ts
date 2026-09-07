import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import ConsentBanner from '../components/consent-banner.astro';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule } from './policy-fixture';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const buildLocals = async function buildLocals(
	options: C15tAstroOptions = { mode: offlineMode() },
	headers: Record<string, string> = {}
): Promise<C15tLocals> {
	return await resolveConsentContext({
		headers: new Headers(headers),
		options: resolveOptions(options),
	});
};

const render = async function render(
	locals: C15tLocals,
	props: Record<string, unknown> = {}
): Promise<string> {
	return await container.renderToString(ConsentBanner, {
		locals: { c15t: locals },
		props,
	});
};

describe('<ConsentBanner />', () => {
	it('renders the shared DOM contract', async () => {
		const html = await render(await buildLocals());

		for (const testId of [
			'consent-banner-root',
			'consent-banner-card',
			'consent-banner-header',
			'consent-banner-title',
			'consent-banner-description',
			'consent-banner-footer',
			'consent-banner-accept-button',
			'consent-banner-reject-button',
		]) {
			expect(html).toContain(`data-testid="${testId}"`);
		}
	});

	it('wires the buttons to runtime actions with data attributes only', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('data-c15t-action="accept"');
		expect(html).toContain('data-c15t-action="reject"');
		expect(html).toContain('data-c15t-action="customize"');
		// The shell itself carries no inline handlers.
		expect(html).not.toContain('onclick=');
	});

	it('inlines the resolved config so the browser skips /init', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('window.__c15tAstroConfig=');
	});

	it('escapes `<` in the inlined config', async () => {
		const locals = await buildLocals();
		locals.config = {
			...locals.config,
			initialTranslations: {
				language: 'en',
				translations: {
					cookieBanner: { title: '</script><img src=x>' },
				} as never,
			},
		};
		const html = await render(locals);
		expect(html).not.toContain('</script><img src=x>');
		expect(html).toContain('\\u003c/script');
	});

	it('renders nothing when the server says the banner should stay hidden', async () => {
		const locals = await buildLocals();
		locals.shouldShowBanner = false;
		const html = await render(locals);
		expect(html).not.toContain('data-testid="consent-banner-root"');
	});

	it('renders anyway with `force`', async () => {
		const locals = await buildLocals();
		locals.shouldShowBanner = false;
		const html = await render(locals, { force: true });
		expect(html).toContain('data-testid="consent-banner-root"');
	});

	it('honours copy overrides', async () => {
		const html = await render(await buildLocals(), {
			acceptButtonText: 'Yes please',
			title: 'Our cookies',
		});
		expect(html).toContain('Our cookies');
		expect(html).toContain('Yes please');
	});

	it('renders localized copy from the negotiated language', async () => {
		const english = await render(await buildLocals());
		const german = await render(
			await buildLocals({ mode: offlineMode() }, { 'accept-language': 'de' })
		);
		expect(german).toContain('lang="de"');
		expect(german).not.toBe(english);
	});

	it('drops the styling class names with `noStyle`', async () => {
		const html = await render(await buildLocals(), { noStyle: true });
		expect(html).not.toContain('c15t-ui-root');
		expect(html).toContain('data-testid="consent-banner-root"');
	});

	it('renders the branding tag with the shared markup', async () => {
		const html = await render(await buildLocals());
		// Matched as one element: separate `toContain` checks would pass
		// with the testid, the variant and the branding on three different
		// nodes.
		const branding = /<[^>]*data-testid="consent-banner-branding"[^>]*>/u.exec(
			html
		)?.[0];
		expect(branding).toBeDefined();
		expect(branding).toContain('data-variant="banner-tag"');
		expect(branding).toContain('data-branding="c15t"');
		expect(html).toContain('Secured by');
		// It sits beside the card, not inside it, so the tag can overlap the
		// card's top edge the way the Svelte and React banners do.
		expect(html.indexOf('consent-banner-branding')).toBeLessThan(
			html.indexOf('consent-banner-card')
		);
	});

	it('drops the branding tag with `hideBranding`', async () => {
		const html = await render(await buildLocals(), { hideBranding: true });
		expect(html).not.toContain('data-testid="consent-banner-branding"');
	});

	it('fails loudly when the middleware did not run', async () => {
		await expect(
			container.renderToString(ConsentBanner, { locals: {}, props: {} })
		).rejects.toThrowError(/Astro\.locals\.c15t/u);
	});
});

describe('<ConsentBanner /> under a notice prompt', () => {
	const noticeLocals = () =>
		buildLocals({
			mode: offlineMode({
				policyRules: [
					{
						...testRule,
						id: 'notice',
						model: 'opt-out',
						prompt: 'notice',
					},
				],
			}),
		});

	it('marks the root with the prompt kind and model', async () => {
		const html = await render(await noticeLocals());
		const root = /<[^>]*data-testid="consent-banner-root"[^>]*>/u.exec(
			html
		)?.[0];
		expect(root).toBeDefined();
		expect(root).toContain('data-prompt="notice"');
		expect(root).toContain('data-model="opt-out"');
	});

	it('renders the rights links before the dismiss action with notice copy', async () => {
		const html = await render(await noticeLocals());

		// The inlined config carries the whole bundle, so read the element.
		const heading =
			/<h2[^>]*data-testid="consent-banner-title"[^>]*>(?<text>[^<]*)<\/h2>/u.exec(
				html
			)?.groups?.text;
		expect(heading).toBe('Privacy notice');

		const optOut = html.indexOf(
			'data-testid="consent-banner-right-link-opt-out"'
		);
		const preferences = html.indexOf(
			'data-testid="consent-banner-right-link-preferences"'
		);
		const dismiss = html.indexOf('data-testid="consent-banner-dismiss-button"');
		expect(optOut).toBeGreaterThan(-1);
		expect(preferences).toBeGreaterThan(optOut);
		expect(dismiss).toBeGreaterThan(preferences);

		expect(html).toContain('data-testid="consent-banner-rights"');
		expect(html).toContain('data-right="opt-out"');
		expect(html).toContain('Do not sell or share my personal information');
		expect(html).toContain('Manage preferences');
		// Rights open the preference center through the same delegated handler.
		expect(html).toMatch(
			/data-c15t-action="customize"[^>]*data-right="opt-out"/u
		);
		expect(html).toContain('data-action="dismiss"');
		expect(html).toContain('data-c15t-action="dismiss"');
		expect(html).toContain('>Dismiss<');
		expect(html).not.toContain('consent-banner-accept-button');
	});

	it('localizes the notice copy and rights from the negotiated language', async () => {
		const html = await render(
			await buildLocals(
				{
					mode: offlineMode({
						policyRules: [
							{ ...testRule, id: 'notice', model: 'opt-out', prompt: 'notice' },
						],
					}),
				},
				{ 'accept-language': 'de' }
			)
		);
		expect(html).toContain('lang="de"');
		const heading =
			/<h2[^>]*data-testid="consent-banner-title"[^>]*>(?<text>[^<]*)<\/h2>/u.exec(
				html
			)?.groups?.text;
		expect(heading).toBeDefined();
		expect(heading).not.toBe('Privacy notice');
		const optOut =
			/<button[^>]*data-right="opt-out"[^>]*>(?<text>[^<]*)<\/button>/u.exec(
				html
			)?.groups?.text;
		expect(optOut).toBeDefined();
		expect(optOut).not.toBe('Do not sell or share my personal information');
	});

	it('renders no rights group when the prompt already covers them', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('data-prompt="choice"');
		expect(html).toContain('data-model="opt-in"');
		expect(html).not.toContain('data-testid="consent-banner-rights"');
		expect(html).toContain('data-testid="consent-banner-customize-button"');
	});
});

describe('<ConsentBanner /> surface shape', () => {
	const readRoot = (html: string) =>
		/<[^>]*data-testid="consent-banner-root"[^>]*>/u.exec(html)?.[0] ?? '';
	const readCard = (html: string) =>
		/<[^>]*data-testid="consent-banner-card"[^>]*>/u.exec(html)?.[0] ?? '';
	const noticeRule = {
		...testRule,
		id: 'notice',
		model: 'opt-out' as const,
		prompt: 'notice' as const,
	};

	it('renders a notice as a non-blocking bottom bar', async () => {
		const html = await render(
			await buildLocals({ mode: offlineMode({ policyRules: [noticeRule] }) })
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="bar"');
		expect(root).toContain('data-position="bottom"');
		expect(root).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
		expect(readCard(html)).not.toContain('aria-modal');
	});

	it('renders a choice as a floating card at the leading bottom corner', async () => {
		const html = await render(await buildLocals());
		const root = readRoot(html);
		expect(root).toContain('data-variant="floating"');
		expect(root).toContain('data-position="bottom-left"');
		expect(root).not.toContain('data-blocking');
		expect(readCard(html)).not.toContain('aria-modal');
	});

	it('mirrors a defaulted corner for right-to-left text but keeps a host corner', async () => {
		const mirrored = await render(
			await buildLocals({ mode: offlineMode() }, { 'accept-language': 'he' })
		);
		expect(readRoot(mirrored)).toContain('data-position="bottom-right"');

		const kept = await render(
			await buildLocals(
				{
					mode: offlineMode(),
					presentation: { prompt: { position: 'top-left' } },
				},
				{ 'accept-language': 'he' }
			)
		);
		expect(readRoot(kept)).toContain('data-position="top-left"');
	});

	it('renders a wall as a blocking modal with an overlay', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode(),
				presentation: { prompt: { variant: 'wall' } },
			})
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="wall"');
		expect(root).toContain('data-position="center"');
		expect(root).toContain('data-blocking="true"');
		expect(html).toContain('data-testid="consent-banner-overlay"');
		expect(html.indexOf('consent-banner-overlay')).toBeLessThan(
			html.indexOf('consent-banner-root')
		);
		expect(readCard(html)).toContain('aria-modal="true"');
	});

	it('never blocks a notice, even when the host asks', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode({ policyRules: [noticeRule] }),
				presentation: { prompt: { blocking: true } },
			})
		);
		expect(readRoot(html)).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
	});
});
