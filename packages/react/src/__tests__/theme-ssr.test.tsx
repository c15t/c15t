import '@c15t/ui/styles.css';
import { defaultDarkColors, defaultTheme } from '@c15t/ui/theme';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, assert, beforeEach, expect, test, vi } from 'vitest';
import { cdp } from 'vitest/browser';

import { ConsentBanner } from '../components/prompt';
import { ConsentProvider, offline } from '../index';
import { policyFixture } from './policy-fixture';

beforeEach(() => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('renders custom theme CSS before the banner and preserves it through hydration', async () => {
	const options = {
		disableAnimation: true,
		mode: offline(),
		nonce: 'ssr-theme-nonce',
		persistence: false as const,
		prefetch: policyFixture(),
		theme: {
			colors: { primary: '#008080', surface: '#f0fafa' },
			dark: { primary: '#40e0d0' },
		},
	};
	const app = (
		<ConsentProvider options={options}>
			<ConsentBanner />
		</ConsentProvider>
	);
	const host = document.createElement('div');
	host.innerHTML = renderToString(app);
	const style = host.querySelector<HTMLStyleElement>('#c15t-theme');
	const banner = host.querySelector('[data-testid="consent-banner-root"]');
	assert(banner, 'The banner must be present in the server HTML');
	assert(style, 'The theme stylesheet must be present in the server HTML');
	expect(style?.textContent).toContain('--c15t-primary: #008080;');
	expect(style?.textContent).toContain('--c15t-surface: #f0fafa;');
	expect(style?.nonce).toBe('ssr-theme-nonce');
	expect(style?.textContent).toContain('--c15t-primary: #40e0d0;');
	expect(style?.compareDocumentPosition(banner)).toBe(
		Node.DOCUMENT_POSITION_FOLLOWING
	);

	document.body.append(host);
	const css = style?.textContent;
	const onRecoverableError = vi.fn();
	let root: ReturnType<typeof hydrateRoot> | undefined;
	try {
		expect(
			getComputedStyle(banner).getPropertyValue('--c15t-primary').trim()
		).toBe('#008080');
		await act(() => {
			root = hydrateRoot(host, app, { onRecoverableError });
		});
		expect(onRecoverableError).not.toHaveBeenCalled();
		expect(host.querySelectorAll('#c15t-theme')).toHaveLength(1);
		expect(host.querySelector('#c15t-theme')).toBe(style);
		expect(style?.textContent).toBe(css);
		expect(
			getComputedStyle(banner).getPropertyValue('--c15t-primary').trim()
		).toBe('#008080');

		await act(() => {
			root?.render(
				<ConsentProvider
					options={{ ...options, theme: { colors: { primary: '#800080' } } }}
				>
					<ConsentBanner />
				</ConsentProvider>
			);
		});
		expect(host.querySelector('#c15t-theme')).toBe(style);
		expect(style?.textContent).toContain('--c15t-primary: #800080;');
	} finally {
		await act(() => root?.unmount());
		host.remove();
	}
});

test('renders default theme tokens on the server without a nonce', () => {
	const html = renderToString(
		<ConsentProvider options={{ mode: offline(), persistence: false }}>
			<div />
		</ConsentProvider>
	);
	const host = document.createElement('div');
	host.innerHTML = html;
	const style = host.querySelector('#c15t-theme');
	expect(style?.textContent).toContain('--c15t-surface:');
	expect(style?.hasAttribute('nonce')).toBe(false);
});

test.each([
	{ colorScheme: 'dark', system: 'light' },
	{ colorScheme: 'light', system: 'dark' },
	{ colorScheme: 'system', system: 'dark' },
	{ colorScheme: 'system', system: 'light' },
] as const)(
	'applies $colorScheme with a $system OS before hydration and after client updates',
	async ({ colorScheme, system }) => {
		const originalClassName = document.documentElement.className;
		document.documentElement.className = '';
		await cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-color-scheme', value: system }],
		});
		const options = {
			colorScheme,
			disableAnimation: true,
			mode: offline(),
			persistence: false as const,
			prefetch: policyFixture(),
			theme: {
				colors: { primary: '#008080' },
				dark: { primary: '#40e0d0' },
			},
		};
		const app = (
			<ConsentProvider options={options}>
				<ConsentBanner />
			</ConsentProvider>
		);
		const host = document.createElement('div');
		host.innerHTML = renderToString(app);
		document.body.append(host);
		const banner = host.querySelector('[data-testid="consent-banner-root"]');
		assert(banner);
		const primary = () =>
			getComputedStyle(banner).getPropertyValue('--c15t-primary').trim();
		const expected =
			colorScheme === 'dark' || (colorScheme === 'system' && system === 'dark')
				? '#40e0d0'
				: '#008080';
		const border = () =>
			getComputedStyle(banner).getPropertyValue('--c15t-border').trim();
		const expectedBorder =
			expected === '#40e0d0'
				? defaultDarkColors.border
				: defaultTheme.colors.border;
		const style = host.querySelector('#c15t-theme');
		const css = style?.textContent;
		const onRecoverableError = vi.fn();
		let root: ReturnType<typeof hydrateRoot> | undefined;
		try {
			expect(primary()).toBe(expected);
			expect(border()).toBe(expectedBorder);
			await act(() => {
				root = hydrateRoot(host, app, { onRecoverableError });
			});
			expect(primary()).toBe(expected);
			expect(border()).toBe(expectedBorder);
			expect(onRecoverableError).not.toHaveBeenCalled();
			expect(style?.textContent).toBe(css);

			await cdp().send('Emulation.setEmulatedMedia', {
				features: [
					{
						name: 'prefers-color-scheme',
						value: system === 'dark' ? 'light' : 'dark',
					},
				],
			});
			const updatedSystemPrimary = system === 'dark' ? '#008080' : '#40e0d0';
			await expect
				.poll(primary)
				.toBe(colorScheme === 'system' ? updatedSystemPrimary : expected);

			await act(() => {
				root?.render(
					<ConsentProvider options={{ ...options, colorScheme: 'light' }}>
						<ConsentBanner />
					</ConsentProvider>
				);
			});
			expect(primary()).toBe('#008080');
			expect(host.querySelector('#c15t-theme')).toBe(style);
		} finally {
			await act(() => root?.unmount());
			host.remove();
			document.documentElement.className = originalClassName;
			await cdp().send('Emulation.setEmulatedMedia', { features: [] });
		}
	}
);

test.each(['</style>', '</StYlE>', '</style >'])(
	'keeps theme values containing %s inside the stylesheet through hydration',
	async (closingTag) => {
		const fontFamily = `"${closingTag}<script data-theme-injection>window.themeInjected = true</script>"`;
		const app = (
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
					theme: { typography: { fontFamily } },
				}}
			>
				<div data-testid="themed-child" />
			</ConsentProvider>
		);
		const host = document.createElement('div');
		host.innerHTML = renderToString(app);
		expect(host.querySelector('[data-theme-injection]')).toBeNull();
		const style = host.querySelector('#c15t-theme');
		assert(style);
		expect(style.textContent).toContain('window.themeInjected = true');
		expect(style.textContent).not.toContain('<');
		const css = style.textContent;
		const onRecoverableError = vi.fn();
		let root: ReturnType<typeof hydrateRoot> | undefined;
		document.body.append(host);
		try {
			await act(() => {
				root = hydrateRoot(host, app, { onRecoverableError });
			});
			expect(onRecoverableError).not.toHaveBeenCalled();
			expect(host.querySelector('[data-theme-injection]')).toBeNull();
			expect(host.querySelector('#c15t-theme')).toBe(style);
			expect(style.textContent).toBe(css);
		} finally {
			await act(() => root?.unmount());
			host.remove();
		}
	}
);
