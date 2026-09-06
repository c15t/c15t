import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import ConsentBanner from '../components/consent-banner.astro';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';

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

	it('fails loudly when the middleware did not run', async () => {
		await expect(
			container.renderToString(ConsentBanner, { locals: {}, props: {} })
		).rejects.toThrowError(/Astro\.locals\.c15t/u);
	});
});
