/**
 * The server-rendered IAB banner.
 *
 * Renders it through Astro's container with the conformance GVL fixture,
 * the same list the cross-framework drivers mount, and asserts the DOM
 * contract the parity gate compares against React's.
 */

import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import IABConsentBanner from '../components/iab-consent-banner.astro';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';

let container: AstroContainer;

beforeAll(async () => {
	container = await AstroContainer.create();
});

const IAB_POLICY = {
	consent: {
		categories: ['necessary', 'marketing'],
		model: 'iab',
		scopeMode: 'permissive',
	},
	id: 'astro_iab_test',
	match: { isDefault: true },
} as const;

const iabOptions: C15tAstroOptions = {
	consentCategories: ['necessary', 'marketing'],
	iab: { cmpId: 160, gvl: MINIMAL_GVL as never },
	mode: offlineMode({ policyPacks: [IAB_POLICY as never] }),
};

const buildLocals = async function buildLocals(
	options: C15tAstroOptions = iabOptions
): Promise<C15tLocals> {
	return await resolveConsentContext({
		headers: new Headers(),
		options: resolveOptions(options),
	});
};

const render = async function render(
	locals: C15tLocals,
	props: Record<string, unknown> = { force: true }
): Promise<string> {
	return await container.renderToString(IABConsentBanner, {
		locals: { c15t: locals },
		props,
	});
};

describe('<IABConsentBanner />', () => {
	it('puts the configured vendor list on the server snapshot', async () => {
		const locals = await buildLocals();
		expect(locals.snapshot.iab?.gvl).not.toBeNull();
		expect(locals.snapshot.iab?.enabled).toBe(true);
	});

	it('renders the shared DOM contract', async () => {
		const html = await render(await buildLocals());

		for (const testId of [
			'iab-consent-banner-overlay',
			'iab-consent-banner-root',
			'iab-consent-banner-branding',
			'iab-consent-banner-card',
			'iab-consent-banner-header',
			'iab-consent-banner-partners-link',
			'iab-consent-banner-footer',
			'iab-consent-banner-reject-button',
			'iab-consent-banner-accept-button',
			'iab-consent-banner-customize-button',
		]) {
			expect(html).toContain(`data-testid="${testId}"`);
		}
	});

	it('names the purposes the shared summary picked', async () => {
		const html = await render(await buildLocals());
		// Purpose 1 is standalone; purpose 2 is the only one the fixture's
		// stack covers, so the stack does not qualify and it stays on its own.
		expect(html).toContain('Store and/or access information on a device');
		expect(html).toContain('Use limited data to select advertising');
		expect(html).toContain('Use precise geolocation data');
	});

	it('counts the vendors in the copy', async () => {
		const html = await render(await buildLocals());
		// One vendor in the fixture, interpolated into both strings.
		expect(html).toContain('1 partners');
	});

	it('ships no framework JavaScript, only action attributes', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('data-c15t-action="accept"');
		expect(html).toContain('data-c15t-action="reject"');
		expect(html).toContain('data-c15t-action="customize"');
		expect(html).not.toContain('onclick=');
	});

	it('sends the partners link to the vendors tab', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('data-c15t-tab="vendors"');
		expect(html).toContain('data-c15t-dialog="iab"');
	});

	it('renders a modal card with a backdrop', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain('role="dialog"');
	});

	it('drops the backdrop when the host opts out of the scroll lock', async () => {
		const html = await render(await buildLocals(), {
			force: true,
			scrollLock: false,
		});
		expect(html).not.toContain('data-testid="iab-consent-banner-overlay"');
		expect(html).toContain('data-testid="iab-consent-banner-root"');
	});

	it('renders nothing without a vendor list', async () => {
		const locals = await buildLocals({
			consentCategories: ['necessary', 'marketing'],
			iab: { cmpId: 160 },
			mode: offlineMode({ policyPacks: [IAB_POLICY as never] }),
		});
		const html = await render(locals);
		expect(html).not.toContain('data-testid="iab-consent-banner-root"');
	});

	it('renders nothing for a policy that is not IAB', async () => {
		const locals = await buildLocals({
			iab: { cmpId: 160, gvl: MINIMAL_GVL as never },
			mode: offlineMode(),
		});
		const html = await render(locals);
		expect(html).not.toContain('data-testid="iab-consent-banner-root"');
	});

	it('inlines the resolved config so the browser skips /init', async () => {
		const html = await render(await buildLocals());
		expect(html).toContain('window.__c15tAstroConfig=');
	});
});
