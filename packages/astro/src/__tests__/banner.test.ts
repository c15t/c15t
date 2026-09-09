import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import ConsentBanner from '../components/consent-banner.astro';
import ConsentDialogTrigger from '../components/consent-dialog-trigger.astro';
import { resolveOptions } from '../integration';
import { hostedMode, offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule, testWire } from './policy-fixture';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

// Every c15t surface stays hidden without a matched rule, so the default
// fixture configures one the way a deployment would.
const buildLocals = async function buildLocals(
	options: C15tAstroOptions = {
		mode: offlineMode({ policyRules: [testRule] }),
	},
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
			await buildLocals(
				{ mode: offlineMode({ policyRules: [testRule] }) },
				{ 'accept-language': 'de' }
			)
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

describe('<ConsentBanner /> without a resolved policy', () => {
	// A hosted backend speaking an unsupported policy contract yields a failed
	// resolution, the same way the middleware tests produce one.
	const withoutPolicy = () =>
		resolveConsentContext({
			fetch: vi.fn(() =>
				Response.json(
					{
						location: { countryCode: null, regionCode: null },
						policyResolution: testWire(),
						translations: { language: 'en', translations: {} },
					},
					{ headers: { 'x-c15t-policy-contract': '999' } }
				)
			) as never,
			headers: new Headers(),
			options: resolveOptions({
				mode: hostedMode({ url: 'https://consent.example.com' }),
			}),
			url: 'https://example.com/',
		});

	it('reports that there is no policy to manage', async () => {
		const locals = await withoutPolicy();
		expect(locals.decision.status).toBe('failed');
		expect(locals.hasPolicy).toBe(false);
	});

	it('resolves the recommended pack when no rules are configured', async () => {
		// An unknown location is strict by default: an opt-in choice prompt.
		const locals = await buildLocals({ mode: offlineMode() });
		expect(locals.decision.status).toBe('matched');
		expect(locals.snapshot.policyRule.model).toBe('opt-in');
		expect(locals.snapshot.policyRule.prompt).toBe('choice');
		expect(locals.hasPolicy).toBe(true);
		expect(locals.hasConsentUi).toBe(true);
	});

	it('renders no banner, even when forced', async () => {
		const locals = await withoutPolicy();
		const html = await render(locals, { force: true });
		expect(html).not.toContain('data-testid="consent-banner-root"');
		expect(html).not.toContain('data-testid="consent-banner-card"');
	});

	it('hides the dialog trigger until a policy is resolved', async () => {
		const hidden = await container.renderToString(ConsentDialogTrigger, {
			locals: { c15t: await withoutPolicy() },
		});
		const trigger = /<[^>]*data-testid="consent-dialog-trigger"[^>]*>/u.exec(
			hidden
		)?.[0];
		expect(trigger).toBeDefined();
		expect(trigger).toContain('hidden');
		expect(trigger).toContain('data-c15t-surface="trigger"');

		const shown = await container.renderToString(ConsentDialogTrigger, {
			locals: { c15t: await buildLocals() },
		});
		const visible = /<[^>]*data-testid="consent-dialog-trigger"[^>]*>/u.exec(
			shown
		)?.[0];
		expect(visible).toBeDefined();
		expect(visible).not.toContain('hidden');
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

	it('renders the opt-out button before an acknowledgement with notice copy', async () => {
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
		const dismiss = html.indexOf('data-testid="consent-banner-dismiss-button"');
		expect(optOut).toBeGreaterThan(-1);
		expect(dismiss).toBeGreaterThan(optOut);
		// The opt-out control opens the preference center, so it also covers
		// the preferences right and no second button renders.
		expect(html).not.toContain('consent-banner-right-link-preferences');

		expect(html).toContain('data-testid="consent-banner-rights"');
		const optOutButton = /<button[^>]*data-right="opt-out"[^>]*>/u.exec(
			html
		)?.[0];
		expect(optOutButton).toBeDefined();
		// An underlined button keeps acknowledgement as the primary action in the
		// row. It opens the preference center through the same delegated
		// handler as customize.
		expect(optOutButton).toContain('data-action="right"');
		expect(optOutButton).toContain('data-c15t-action="customize"');
		expect(optOutButton).toContain(bannerStyles.rightLink);
		expect(optOutButton).not.toContain('data-variant=');
		expect(optOutButton).not.toContain('data-mode=');
		expect(html).toContain('Do not sell or share my data');
		expect(html).toContain('data-action="dismiss"');
		expect(html).toContain('data-c15t-action="dismiss"');
		// Acknowledgement dismisses the notice without recording consent.
		expect(html).toContain('>OK<');
		expect(html).not.toContain('>Dismiss<');
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
		expect(optOut).toBe('Meine Daten nicht verkaufen oder weitergeben');
		const dismiss =
			/<button[^>]*data-action="dismiss"[^>]*>(?<text>[^<]*)<\/button>/u.exec(
				html
			)?.groups?.text;
		expect(dismiss).toBe('OK');
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

	it('renders a notice as a non-blocking floating card', async () => {
		const html = await render(
			await buildLocals({ mode: offlineMode({ policyRules: [noticeRule] }) })
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="floating"');
		expect(root).toContain('data-position="bottom-left"');
		expect(root).not.toContain('data-blocking');
		expect(html).not.toContain('data-testid="consent-banner-overlay"');
		expect(readCard(html)).not.toContain('aria-modal');
		expect(readCard(html)).toContain('role="region"');
	});

	it('renders a choice as a floating card at the leading bottom corner', async () => {
		const html = await render(await buildLocals());
		const root = readRoot(html);
		expect(root).toContain('data-variant="floating"');
		expect(root).toContain('data-position="bottom-left"');
		expect(root).not.toContain('data-blocking');
		// A choice prompt is non-blocking by default, so the card is a labelled
		// region that never claims modal semantics.
		expect(readCard(html)).not.toContain('aria-modal');
		expect(readCard(html)).toContain('role="region"');
	});

	it('renders a choice as a region when the host turns the focus trap off', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode({ policyRules: [testRule] }),
				presentation: { prompt: { trapFocus: false } },
			})
		);
		expect(readCard(html)).not.toContain('aria-modal');
		expect(readCard(html)).toContain('role="region"');
	});

	it('renders a blocking choice as a modal dialog', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode({ policyRules: [testRule] }),
				presentation: { prompt: { blocking: true } },
			})
		);
		expect(readRoot(html)).toContain('data-blocking="true"');
		expect(readCard(html)).toContain('aria-modal="true"');
		expect(readCard(html)).toContain('role="dialog"');
	});

	it('mirrors a defaulted corner for right-to-left text but keeps a host corner', async () => {
		const mirrored = await render(
			await buildLocals(
				{ mode: offlineMode({ policyRules: [testRule] }) },
				{ 'accept-language': 'he' }
			)
		);
		expect(readRoot(mirrored)).toContain('data-position="bottom-right"');

		const kept = await render(
			await buildLocals(
				{
					mode: offlineMode({ policyRules: [testRule] }),
					presentation: { prompt: { position: 'top-left' } },
				},
				{ 'accept-language': 'he' }
			)
		);
		expect(readRoot(kept)).toContain('data-position="top-left"');
	});

	it('renders a notice as a bottom bar when the host asks for one', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode({ policyRules: [noticeRule] }),
				presentation: { prompt: { variant: 'bar' } },
			})
		);
		const root = readRoot(html);
		expect(root).toContain('data-variant="bar"');
		expect(root).toContain('data-position="bottom"');
		expect(root).not.toContain('data-blocking');
	});

	it('renders a wall as a blocking modal with an overlay', async () => {
		const html = await render(
			await buildLocals({
				mode: offlineMode({ policyRules: [testRule] }),
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
		expect(readCard(html)).toContain('role="dialog"');
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

describe('<ConsentBanner /> under a none rule', () => {
	/** A regime with no consent law: permitted by default, nothing owed. */
	const noneRule = {
		id: 'astro_world_none',
		match: { isDefault: true },
		model: 'none',
		prompt: 'none',
	} as const;
	const noneLocals = (rights?: ('preferences' | 'disclosure')[]) =>
		buildLocals(
			{
				mode: offlineMode({
					policyRules: [rights ? { ...noneRule, rights } : noneRule],
				}),
			},
			{ 'x-vercel-ip-country': 'US', 'x-vercel-ip-country-region': 'SD' }
		);

	it('grants every category and renders no surface when no rights are owed', async () => {
		const locals = await noneLocals();
		expect(locals.decision.status).toBe('matched');
		expect(locals.snapshot.policyRule.model).toBe('none');
		expect(locals.snapshot.effectivePermissions.marketing).toBe(true);
		expect(locals.snapshot.effectivePermissions.measurement).toBe(true);
		expect(locals.hasPolicy).toBe(true);
		expect(locals.hasConsentUi).toBe(false);

		const html = await render(locals, { force: true });
		expect(html).not.toContain('data-testid="consent-banner-root"');

		const trigger = await container.renderToString(ConsentDialogTrigger, {
			locals: { c15t: locals },
		});
		expect(
			/<[^>]*data-testid="consent-dialog-trigger"[^>]*>/u.exec(trigger)?.[0]
		).toContain('hidden');
	});

	it('keeps the trigger when the rule grants the preferences right', async () => {
		const locals = await noneLocals(['preferences']);
		expect(locals.hasConsentUi).toBe(true);
		// No prompt, so the server does not decide to show a banner.
		expect(locals.shouldShowBanner).toBe(false);
		const html = await render(locals);
		expect(html).not.toContain('data-testid="consent-banner-root"');

		const trigger = await container.renderToString(ConsentDialogTrigger, {
			locals: { c15t: locals },
		});
		expect(
			/<[^>]*data-testid="consent-dialog-trigger"[^>]*>/u.exec(trigger)?.[0]
		).not.toContain('hidden');
	});
});
