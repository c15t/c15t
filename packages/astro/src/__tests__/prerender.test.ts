import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { promptClassNames } from '../banner/class-names';
import { PROMPT_SLOT_ATTRIBUTE } from '../banner/slot';
import { buildPrompt } from '../browser/render-prompt';
import ConsentBanner from '../components/prompt.astro';
import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { hostedMode, offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { describeTree } from './dom-tree';
import { testRule } from './policy-fixture';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const OFFLINE: C15tAstroOptions = {
	mode: offlineMode({ policyRules: [testRule] }),
};

/**
 * Run the middleware the way `astro build` does for a prerendered page.
 * The request's headers throw when read: Astro warns on any access to them
 * during a prerender, and they describe the build machine, not a visitor.
 */
const runPrerendered = async function runPrerendered(
	options: C15tAstroOptions,
	fetchImpl?: typeof globalThis.fetch
): Promise<C15tLocals> {
	const middleware = createConsentMiddleware(resolveOptions(options), {
		fetch: fetchImpl,
	});
	const locals = {} as { c15t: C15tLocals };
	const request = {
		get headers(): Headers {
			throw new Error('read a prerendered request’s headers');
		},
		url: 'https://example.com/',
	};
	await middleware(
		{ isPrerendered: true, locals, request } as never,
		vi.fn(() => new Response('ok')) as never
	);
	return locals.c15t;
};

describe('prerendered routes', () => {
	it('never reads the request headers', async () => {
		const c15t = await runPrerendered(OFFLINE);
		expect(c15t.prerendered).toBe(true);
	});

	it('leaves visitor state out of the inlined config', async () => {
		// A consent cookie on the build request must not become everyone's.
		const c15t = await resolveConsentContext({
			headers: new Headers({
				cookie: 'c15t=v=3&sid=sub_build',
				'sec-gpc': '1',
			}),
			options: resolveOptions(OFFLINE),
			prerendered: true,
		});
		// Any `initialRecords` at all stop the browser reading its own cookie.
		expect(c15t.config).not.toHaveProperty('initialRecords');
		expect(c15t.config).not.toHaveProperty('now');
		expect(c15t.config).not.toHaveProperty('initialPrivacySignals');
	});

	it('resolves an offline policy at build time', async () => {
		const c15t = await runPrerendered(OFFLINE);
		expect(c15t.hasConsentUi).toBe(true);
		expect(c15t.shouldShowBanner).toBe(true);
		expect(c15t.config.initialPolicyResolution).toBeDefined();
	});

	it('leaves a hosted policy for the browser to resolve', async () => {
		const fetchImpl = vi.fn();
		const c15t = await runPrerendered(
			{ mode: hostedMode({ url: 'https://consent.example.com' }) },
			fetchImpl as never
		);
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(c15t.hasPolicy).toBe(false);
	});
});

describe('<ConsentBanner /> on a prerendered page', () => {
	it('renders hidden for the browser to reveal', async () => {
		const html = await container.renderToString(ConsentBanner, {
			locals: { c15t: await runPrerendered(OFFLINE) },
		});
		expect(html).toMatch(/data-testid="consent-banner-root"[^>]*\shidden/u);
		expect(html).toContain('data-c15t-visible="false"');
	});

	it('leaves a spot with its props when the policy is unknown', async () => {
		const html = await container.renderToString(ConsentBanner, {
			locals: {
				c15t: await runPrerendered({
					mode: hostedMode({ url: 'https://consent.example.com' }),
				}),
			},
			props: { title: 'Cookies?' },
		});
		expect(html).not.toContain('data-testid="consent-banner-root"');
		const spot = new JSDOM(html).window.document.querySelector(
			`[${PROMPT_SLOT_ATTRIBUTE}]`
		);
		const data = JSON.parse(spot?.getAttribute(PROMPT_SLOT_ATTRIBUTE) ?? '');
		expect(data.props).toEqual({ title: 'Cookies?' });
		expect(data.classNames.banner.root).toBe(promptClassNames.banner.root);
	});
});

interface ParityCase {
	rule?: Record<string, unknown>;
	options?: Partial<C15tAstroOptions>;
	props?: Record<string, unknown>;
	branding?: 'inth';
}

describe('browser-rendered banner', () => {
	it.each<[string, ParityCase]>([
		['an opt-in choice', {}],
		[
			'an opt-out notice',
			{ rule: { model: 'opt-out', prompt: 'notice', rights: ['opt-out'] } },
		],
		[
			'a blocking wall',
			{ options: { presentation: { prompt: { variant: 'wall' } } } },
		],
		['a bar', { options: { presentation: { prompt: { variant: 'bar' } } } }],
		// A default corner follows the text direction in both renderings.
		[
			'a right-to-left widget',
			{
				options: {
					i18n: { locale: 'he' },
					presentation: { prompt: { variant: 'widget' } },
				},
			},
		],
		['no stylesheet', { props: { noStyle: true } }],
		['no branding tag', { props: { hideBranding: true } }],
		['INTH branding', { branding: 'inth' }],
	])('matches the server markup for %s', async (_name, parityCase) => {
		const options: C15tAstroOptions = {
			legalLinks: {
				privacyPolicy: { href: '/privacy', label: 'Privacy' },
			},
			mode: offlineMode({
				policyRules: [{ ...testRule, ...parityCase.rule } as typeof testRule],
			}),
			...parityCase.options,
		};
		const props = {
			legalLinks: ['privacyPolicy'],
			title: 'Hi',
			...parityCase.props,
		};
		const resolved = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions(options),
		});
		const c15t = parityCase.branding
			? {
					...resolved,
					snapshot: { ...resolved.snapshot, branding: parityCase.branding },
				}
			: resolved;
		const server = new JSDOM(
			await container.renderToString(ConsentBanner, {
				locals: { c15t },
				props,
				request: new Request('https://example.com/'),
			}),
			{ url: 'https://example.com/' }
		).window.document;

		const dom = new JSDOM('', { url: 'https://example.com/' });
		vi.stubGlobal('document', dom.window.document);
		vi.stubGlobal('window', dom.window);
		try {
			const built = buildPrompt(
				c15t.snapshot,
				{ classNames: promptClassNames, props },
				c15t.options
			);
			const expected = [
				server.querySelector('[data-testid="consent-banner-overlay"]'),
				server.querySelector('[data-testid="consent-banner-root"]'),
			].filter((node): node is Element => node !== null);
			expect(expected.length).toBeGreaterThan(0);
			expect(built.map(describeTree)).toEqual(expected.map(describeTree));
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
