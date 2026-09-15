import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, assert, beforeEach, expect, test, vi } from 'vitest';

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
