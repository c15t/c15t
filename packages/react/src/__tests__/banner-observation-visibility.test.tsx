import { observeBannerElement } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBanner, ConsentProvider, hosted } from '../index';
import { policyFixture } from './policy-fixture';

const cleanup: (() => void)[] = [];
afterEach(() => {
	for (const dispose of cleanup.splice(0)) {
		dispose();
	}
});

describe('rendered banner evidence', () => {
	test('the stock React banner reports display through its hosted transport after mounting', async () => {
		const fixture = policyFixture();
		const events: Record<string, unknown>[] = [];
		const fetch: typeof globalThis.fetch = (_input, init) => {
			if (init?.method === 'POST') {
				events.push(JSON.parse(String(init.body)));
				return Promise.resolve(Response.json({}));
			}
			return Promise.resolve(
				Response.json(
					{
						branding: 'c15t',
						location: { countryCode: 'DE', regionCode: null },
						observationEndpoint: 'https://consent.example/observations/banner',
						observationReceipt: 'opaque-browser-receipt',
						policyResolution: writePolicyResolutionWire(
							fixture.initialPolicyResolution
						),
						translations: { language: 'en', translations: {} },
					},
					{ headers: { 'x-c15t-policy-contract': '1' } }
				)
			);
		};
		const screen = await render(
			<ConsentProvider
				options={{
					journey: 'tab',
					mode: hosted({ backendURL: 'https://consent.example', fetch }),
					persistence: false,
				}}
			>
				<ConsentBanner disableAnimation />
			</ConsentProvider>
		);
		cleanup.push(() => {
			void screen.unmount();
		});
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="consent-banner-card"]')
			).not.toBeNull()
		);
		await vi.waitFor(() =>
			expect(events.map((event) => event.event)).toEqual([
				'page_seen',
				'banner_shown',
			])
		);
		expect(events[1]?.journeyScope).toBe('tab');
		expect(events[1]?.pageId).toBe(events[0]?.pageId);
	});

	test('waits for actual visible pixels and reports only once', async () => {
		const banner = document.createElement('div');
		banner.textContent = 'Choose your privacy settings';
		banner.style.cssText =
			'position:fixed;top:0;left:0;width:200px;height:100px;opacity:0';
		document.body.append(banner);
		const seen: string[] = [];
		let visibilityProbe: (() => boolean) | undefined;
		cleanup.push(
			() => banner.remove(),
			observeBannerElement(banner, (isVisible) => {
				visibilityProbe = isVisible;
				seen.push(banner.textContent ?? '');
			})
		);
		await new Promise((resolve) => {
			setTimeout(resolve, 80);
		});
		expect(seen).toEqual([]);
		banner.style.opacity = '1';
		banner.dispatchEvent(new Event('transitionend', { bubbles: true }));
		await vi.waitFor(() =>
			expect(seen).toEqual(['Choose your privacy settings'])
		);
		banner.dispatchEvent(new Event('animationend', { bubbles: true }));
		expect(seen).toHaveLength(1);
		expect(visibilityProbe?.()).toBe(true);
		banner.style.opacity = '0';
		expect(visibilityProbe?.()).toBe(false);
		banner.remove();
		expect(visibilityProbe?.()).toBe(false);
	});

	test('never reports a removed banner or a disposed observer', async () => {
		const banner = document.createElement('div');
		banner.style.cssText = 'position:fixed;top:0;width:100px;height:100px';
		const seen: boolean[] = [];
		const stop = observeBannerElement(banner, () => seen.push(true));
		stop();
		document.body.append(banner);
		cleanup.push(() => banner.remove());
		await new Promise((resolve) => {
			setTimeout(resolve, 80);
		});
		expect(seen).toEqual([]);
	});
});
