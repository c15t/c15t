/**
 * Server-render contract for the consent banner.
 *
 * Runs in the `ssr` vitest project (node environment, `svelte`/`node`
 * resolve conditions) so `render()` from `svelte/server` receives
 * server-compiled components. The client project resolves `browser` and
 * would hand it client-compiled output, which throws `effect_orphan`.
 */
import type { KernelConfig, ResolvedPolicy } from '@c15t/core';
import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';

import ConsentBanner from '../lib/components/consent-banner.svelte';
import ConsentManagerProvider from '../lib/components/consent-manager-provider.svelte';
import { offline } from '../lib/transports/offline';
import type { ConsentManagerOptions } from '../lib/types';
import BannerFixture from './fixtures/banner-fixture.svelte';

const BANNER_POLICY: ResolvedPolicy = {
	consent: {
		categories: ['necessary', 'marketing', 'measurement'],
		scopeMode: 'strict',
	},
	id: 'ssr_policy',
	model: 'opt-in',
	ui: {
		banner: { allowedActions: ['reject', 'accept', 'customize'] },
		mode: 'banner',
	},
};

const buildOptions = function buildOptions(
	prefetch: KernelConfig
): ConsentManagerOptions {
	return {
		mode: offline(),
		persistence: false,
		prefetch,
	} as ConsentManagerOptions;
};

const renderBanner = function renderBanner(prefetch: KernelConfig): string {
	return render(BannerFixture, { props: { options: buildOptions(prefetch) } })
		.body;
};

describe('consent banner SSR', () => {
	test('renders the banner shell when the prefetched policy says to show it', () => {
		const html = renderBanner({ initialPolicy: BANNER_POLICY });

		expect(html).toContain('data-testid="consent-banner-root"');
		expect(html).toContain('data-testid="consent-banner-accept-button"');
	});

	test('renders in its final visible state, not the pre-animation one', () => {
		const html = renderBanner({ initialPolicy: BANNER_POLICY });
		// Assert against the whole opening tag rather than a bare substring, so
		// a class landing on some other element cannot pass this by accident.
		const tag = /<div[^>]*data-testid="consent-banner-root"[^>]*>/u.exec(html);

		expect(tag?.[0]).toBeDefined();
		expect(tag?.[0]).toMatch(/bannerVisible/u);
		expect(tag?.[0]).not.toMatch(/bannerHidden/u);
	});

	test('renders nothing for a returning visitor', () => {
		const html = renderBanner({
			initialHasConsented: true,
			initialPolicy: BANNER_POLICY,
		});

		expect(html).not.toContain('data-testid="consent-banner-root"');
	});

	test('renders nothing without a prefetch — the policy is still unresolved', () => {
		const html = renderBanner({});

		expect(html).not.toContain('data-testid="consent-banner-root"');
	});

	test('renders nothing when the policy asks for no surface', () => {
		const html = renderBanner({
			initialPolicy: { ...BANNER_POLICY, ui: { mode: 'none' } },
		});

		expect(html).not.toContain('data-testid="consent-banner-root"');
	});

	test('puts real copy and real actions in the first HTML', () => {
		const html = renderBanner({ initialPolicy: BANNER_POLICY });

		// Not a placeholder shell: the resolved title and the policy's own
		// allowed actions are already painted before any JS runs.
		expect(html).toContain('We value your privacy');
		expect(html).toContain('data-action="reject"');
		expect(html).toContain('data-action="accept"');
		expect(html).toContain('data-action="customize"');
	});

	test('the provider alone renders no banner', () => {
		const html = render(ConsentManagerProvider, {
			props: { options: buildOptions({ initialPolicy: BANNER_POLICY }) },
		}).body;

		expect(html).not.toContain('consent-banner-root');
	});
});
