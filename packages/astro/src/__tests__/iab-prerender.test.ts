/**
 * The IAB banner on prerendered pages, and the browser rendering of it.
 */

import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { iabPromptClassNames } from '../banner/class-names';
import { IAB_PROMPT_SLOT_ATTRIBUTE } from '../banner/slot';
import { buildIABPrompt } from '../browser/render-iab-prompt';
import IABConsentBanner from '../components/iab-prompt.astro';
import { resolveOptions } from '../integration';
import { hostedMode, offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions } from '../types';
import { describeTree } from './dom-tree';

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

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'marketing'],
	iab: { cmpId: 160, gvl: MINIMAL_GVL as never },
	mode: offlineMode({ policyRules: [IAB_POLICY as never] }),
};

describe('<IABConsentBanner /> on a prerendered page', () => {
	it('renders hidden for the browser to reveal', async () => {
		const c15t = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions(OPTIONS),
			prerendered: true,
		});
		const html = await container.renderToString(IABConsentBanner, {
			locals: { c15t },
		});
		expect(html).toMatch(/data-testid="iab-consent-banner-root"[^>]*\shidden/u);
		expect(html).toContain('data-c15t-visible="false"');
		expect(html).not.toContain(IAB_PROMPT_SLOT_ATTRIBUTE);
	});

	it('leaves a spot with its props when the policy is unknown', async () => {
		const c15t = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions({
				...OPTIONS,
				mode: hostedMode({ url: 'https://consent.example.com' }),
			}),
			prerendered: true,
		});
		const html = await container.renderToString(IABConsentBanner, {
			locals: { c15t },
			props: { primaryButton: 'accept' },
		});
		expect(html).not.toContain('data-testid="iab-consent-banner-root"');
		const spot = new JSDOM(html).window.document.querySelector(
			`[${IAB_PROMPT_SLOT_ATTRIBUTE}]`
		);
		const data = JSON.parse(
			spot?.getAttribute(IAB_PROMPT_SLOT_ATTRIBUTE) ?? ''
		);
		expect(data.props).toEqual({ primaryButton: 'accept' });
		expect(data.classNames.iabBanner.root).toBe(
			iabPromptClassNames.iabBanner.root
		);
	});
});

describe('browser-rendered IAB banner', () => {
	it.each([
		['the defaults', {}],
		['a filled accept button', { primaryButton: 'accept' }],
		['a blocking banner', { scrollLock: true }],
		['no stylesheet', { noStyle: true }],
	] as const)('matches the server markup with %s', async (_name, props) => {
		const c15t = await resolveConsentContext({
			headers: new Headers(),
			options: resolveOptions(OPTIONS),
		});
		const server = new JSDOM(
			await container.renderToString(IABConsentBanner, {
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
			const built = buildIABPrompt(
				c15t.snapshot,
				{ classNames: iabPromptClassNames, props: { ...props } },
				c15t.options
			);
			const expected = [
				server.querySelector('[data-testid="iab-consent-banner-overlay"]'),
				server.querySelector('[data-testid="iab-consent-banner-root"]'),
			].filter((node): node is Element => node !== null);
			expect(built.length).toBeGreaterThan(0);
			expect(built.map(describeTree)).toEqual(expected.map(describeTree));
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
