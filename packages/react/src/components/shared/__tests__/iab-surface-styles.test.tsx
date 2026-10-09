import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { IABConsentDialog } from '~/components/iab-panel';
import { IABConsentBanner } from '~/components/iab-prompt';
import { mockGVL } from '~/components/iab/__tests__/fixtures/mock-consent-state';
import { offline } from '~/transports/offline';

const fixture = (
	options: Partial<ComponentFixtureOptions> = {}
): ComponentFixtureOptions => ({
	iab: { cmpId: 160, gvl: mockGVL },
	mode: offline(),
	nonce: 'iab-style-nonce',
	prefetch: {
		...policyFixture(undefined, {
			categories: undefined,
			model: 'iab',
			scopeMode: 'strict',
		}),
		initialIab: { cmpId: 160, enabled: true, gvl: mockGVL },
	},
	...options,
});

const styleIds = (root: ParentNode = document) =>
	[...root.querySelectorAll('style[data-c15t-styles]')].map((style) =>
		style.getAttribute('data-c15t-styles')
	);

const renderBanner = (options: Partial<ComponentFixtureOptions> = {}) =>
	renderToString(
		<ComponentFixtureProvider options={fixture(options)}>
			<IABConsentBanner />
			<IABConsentDialog />
		</ComponentFixtureProvider>
	);

describe('IAB styles without CSS imports', () => {
	test('SSR includes banner rules and nonce without loading dialog rules', () => {
		const html = renderBanner();
		const parsed = new DOMParser().parseFromString(html, 'text/html');
		expect(
			parsed.querySelector('[data-testid="iab-consent-banner-root"]')
		).not.toBeNull();
		expect(styleIds(parsed)).toEqual([
			'c15t-first-paint',
			'c15t-iab-first-paint',
		]);
		for (const style of parsed.querySelectorAll('style[data-c15t-styles]')) {
			expect(style.getAttribute('nonce')).toBe('iab-style-nonce');
			expect(style.textContent).not.toContain('&gt;');
		}
		expect(parsed.querySelector('link[rel="stylesheet"]')).toBeNull();
	});

	test('styles: false and global noStyle leave CSS to the app', () => {
		for (const options of [{ styles: false }, { noStyle: true }]) {
			const html = renderBanner(options);
			expect(html).toContain('data-testid="iab-consent-banner-root"');
			expect(html).not.toContain('<style');
		}
	});

	test('component noStyle omits the banner sheets', () => {
		const html = renderToString(
			<ComponentFixtureProvider options={fixture()}>
				<IABConsentBanner noStyle />
			</ComponentFixtureProvider>
		);
		expect(html).toContain('data-testid="iab-consent-banner-root"');
		expect(html).not.toContain('<style');
	});

	test.each([false, true])(
		'a standalone dialog carries its rules and nonce, compound=%s',
		async (compound) => {
			const screen = await render(
				<ComponentFixtureProvider options={fixture({ initialUI: 'dialog' })}>
					{compound ? (
						<IABConsentDialog.Root disableAnimation>
							<IABConsentDialog.Card>Preferences</IABConsentDialog.Card>
						</IABConsentDialog.Root>
					) : (
						<IABConsentDialog disableAnimation />
					)}
				</ComponentFixtureProvider>
			);
			await expect
				.element(screen.getByTestId('iab-consent-dialog-root'))
				.toBeInTheDocument();
			expect(styleIds()).toEqual([
				'c15t-first-paint',
				'c15t-iab-first-paint',
				'c15t-dialog',
				'c15t-iab-dialog',
			]);
			for (const style of document.querySelectorAll<HTMLStyleElement>(
				'style[data-c15t-styles]'
			)) {
				expect(style.nonce).toBe('iab-style-nonce');
			}
			const card = document.querySelector<HTMLElement>(
				'[data-testid="iab-consent-dialog-card"]'
			);
			if (!card) {
				throw new Error('IAB dialog card did not render');
			}
			const computed = getComputedStyle(card);
			expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');
			expect(Number.parseFloat(computed.borderRadius)).toBeGreaterThan(0);
			await screen.unmount();
		}
	);

	test('React 19 deduplicates shared sheets and loads dialog rules on open', async () => {
		const screen = await render(
			<ComponentFixtureProvider options={fixture({ nonce: undefined })}>
				<IABConsentBanner />
				<IABConsentDialog disableAnimation />
			</ComponentFixtureProvider>
		);
		await expect
			.element(screen.getByTestId('iab-consent-banner-root'))
			.toBeInTheDocument();
		const hoistedIds = () =>
			[...document.head.querySelectorAll('style[data-precedence="c15t"]')].map(
				(style) => style.getAttribute('data-href')
			);
		expect(hoistedIds()).toEqual(['c15t-first-paint', 'c15t-iab-first-paint']);
		await screen.getByTestId('iab-consent-banner-customize-button').click();
		await expect
			.element(screen.getByTestId('iab-consent-dialog-root'))
			.toBeInTheDocument();
		expect(hoistedIds()).toEqual([
			'c15t-first-paint',
			'c15t-iab-first-paint',
			'c15t-dialog',
			'c15t-iab-dialog',
		]);
		await screen.unmount();
	});
});
