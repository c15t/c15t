import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions } from '~/__tests__/component-fixture-provider';
import { ConsentDialog } from '~/components/panel';
import { ConsentBanner } from '~/components/prompt';
import { offline } from '~/transports/offline';

/**
 * The stock surfaces render the c15t rules they use, so an app that imports
 * no stylesheet still gets styled surfaces: the banner the first-paint
 * sheet, the dialog that sheet and the dialog's. React 19 hoists them into
 * `<head>` and renders each once. These tests share one document, whose
 * hoisted styles outlive the trees that rendered them, so the cases that
 * expect no styles run first.
 */

const c15tStyles = () =>
	[
		...document.head.querySelectorAll<HTMLStyleElement>(
			'style[data-precedence="c15t"]'
		),
	].map((element) => element.dataset.href);

const fixture = (options: Partial<ComponentFixtureOptions> = {}) => ({
	mode: offline(),
	...options,
});

describe('surface styles', () => {
	test('styles: false renders no stylesheet', async () => {
		const screen = await render(
			<ComponentFixtureProvider options={fixture({ styles: false })}>
				<ConsentBanner />
			</ComponentFixtureProvider>
		);
		await expect
			.element(screen.getByTestId('consent-banner-root'))
			.toBeInTheDocument();

		expect(c15tStyles()).toEqual([]);
		await screen.unmount();
	});

	test('noStyle renders no stylesheet', async () => {
		const screen = await render(
			<ComponentFixtureProvider options={fixture({ noStyle: true })}>
				<ConsentBanner />
			</ComponentFixtureProvider>
		);
		await expect
			.element(screen.getByTestId('consent-banner-root'))
			.toBeInTheDocument();

		expect(c15tStyles()).toEqual([]);
		await screen.unmount();
	});

	test('the server-rendered banner carries the first-paint sheet only', () => {
		const html = renderToString(
			<ComponentFixtureProvider options={fixture()}>
				<ConsentBanner />
				<ConsentDialog />
			</ComponentFixtureProvider>
		);

		expect(html).toContain('data-testid="consent-banner-root"');
		expect(html).toMatch(
			/<style[^>]*data-precedence="c15t"[^>]*data-href="c15t-first-paint"/u
		);
		expect(html).not.toContain('c15t-dialog');
		// The rules reach the HTML as written, not entity-escaped.
		expect(html).not.toMatch(/<style[^>]*>[^<]*&gt;/u);
	});

	test('with a nonce, the banner renders its sheet in place, carrying it', () => {
		// React drops the nonce of a style it hoists unless the server
		// renderer was given the same one.
		const html = renderToString(
			<ComponentFixtureProvider options={fixture({ nonce: 'test-nonce' })}>
				<ConsentBanner />
			</ComponentFixtureProvider>
		);

		expect(html).toMatch(
			/<style data-c15t-styles="c15t-first-paint" nonce="test-nonce">/u
		);
		expect(html).not.toContain('data-precedence="c15t"');
		expect(html).not.toMatch(/<style[^>]*>[^<]*&gt;/u);
	});

	test('the banner adds the first-paint sheet, the dialog adds its own after it', async () => {
		const banner = await render(
			<ComponentFixtureProvider options={fixture()}>
				<ConsentBanner />
			</ComponentFixtureProvider>
		);
		await expect
			.element(banner.getByTestId('consent-banner-root'))
			.toBeInTheDocument();

		expect(c15tStyles()).toEqual(['c15t-first-paint']);
		await banner.unmount();

		// The app's own token rules win wherever the hoisted sheet lands:
		// here it comes after them.
		const appTokens = document.createElement('style');
		appTokens.textContent =
			':root{--c15t-surface:rgb(1, 2, 3)}:root.c15t-dark{--c15t-surface:rgb(4, 5, 6)}';
		document.head.prepend(appTokens);
		const surface = () =>
			getComputedStyle(document.documentElement)
				.getPropertyValue('--c15t-surface')
				.trim();
		expect(surface()).toBe('rgb(1, 2, 3)');
		document.documentElement.classList.add('c15t-dark');
		expect(surface()).toBe('rgb(4, 5, 6)');
		document.documentElement.classList.remove('c15t-dark');
		appTokens.remove();

		const dialog = await render(
			<ComponentFixtureProvider options={fixture({ initialUI: 'dialog' })}>
				<ConsentBanner />
				<ConsentDialog />
			</ComponentFixtureProvider>
		);
		await expect
			.element(dialog.getByTestId('consent-dialog-root'))
			.toBeInTheDocument();

		expect(c15tStyles()).toEqual(['c15t-first-paint', 'c15t-dialog']);
		const card = document.querySelector<HTMLElement>(
			'[data-testid="consent-dialog-root"]'
		);
		expect(card && getComputedStyle(card).display).not.toBe('inline');
		await dialog.unmount();
	});
});
