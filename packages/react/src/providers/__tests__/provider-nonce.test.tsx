import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentManagerProvider } from '~/index';

import { clearConsentRuntimeCache } from '../consent-manager-provider';

/**
 * Regression coverage for the injected theme stylesheet under a nonce-based
 * Content Security Policy.
 *
 * @see https://github.com/c15t/c15t/issues/948
 */
describe('ConsentManagerProvider CSP nonce', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
	});

	afterEach(() => {
		clearConsentRuntimeCache();
		// Scripts injected by these tests outlive the React tree.
		for (const el of document.querySelectorAll(
			'script[src^="data:text/javascript"]'
		)) {
			el.remove();
		}
	});

	it('applies the provided nonce to the injected theme stylesheet', async () => {
		const { getByText } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					nonce: 'test-nonce-value',
					theme: {
						colors: {
							primary: '#6366f1',
						},
					},
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		await expect.element(getByText('Test Component')).toBeInTheDocument();

		const styleEl = document.querySelector<HTMLStyleElement>('#c15t-theme');

		expect(styleEl).not.toBeNull();
		expect(styleEl?.textContent).toContain('#6366f1');
		// Read the IDL property rather than the content attribute: browsers hide
		// the `nonce` attribute once a real CSP is in force.
		expect(styleEl?.nonce).toBe('test-nonce-value');
	});

	it('falls back to a nonce nested under store', async () => {
		const { getByText } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					store: { nonce: 'nested-store-nonce' },
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		await expect.element(getByText('Test Component')).toBeInTheDocument();

		const styleEl = document.querySelector<HTMLStyleElement>('#c15t-theme');

		expect(styleEl?.nonce).toBe('nested-store-nonce');
	});

	it('prefers the top-level nonce over a nested one', async () => {
		const { getByText } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					nonce: 'top-level-nonce',
					store: { nonce: 'nested-store-nonce' },
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		await expect.element(getByText('Test Component')).toBeInTheDocument();

		const styleEl = document.querySelector<HTMLStyleElement>('#c15t-theme');

		expect(styleEl?.nonce).toBe('top-level-nonce');
	});

	it('applies the same nonce to scripts the provider injects', async () => {
		// A data: URL keeps this entirely off the network. A fetched src leaves a
		// pending request that destabilizes timing-sensitive tests in other files
		// sharing the browser run.
		const src = 'data:text/javascript,0';
		const { getByText } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					nonce: 'shared-nonce',
					scripts: [
						{
							id: 'nonce-e2e',
							src,
							category: 'necessary',
							alwaysLoad: true,
						},
					],
				}}
			>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		await expect.element(getByText('Test Component')).toBeInTheDocument();

		const styleEl = document.querySelector<HTMLStyleElement>('#c15t-theme');
		const scriptEl = await vi.waitUntil(() =>
			document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
		);

		// The stylesheet and the injected script must agree, otherwise a CSP
		// authorizes only one of them.
		expect(styleEl?.nonce).toBe('shared-nonce');
		expect(scriptEl?.nonce).toBe('shared-nonce');
	});

	it('omits the nonce attribute when no nonce is configured', async () => {
		const { getByText } = await render(
			<ConsentManagerProvider options={{ mode: 'offline' }}>
				<div>Test Component</div>
			</ConsentManagerProvider>
		);

		await expect.element(getByText('Test Component')).toBeInTheDocument();

		const styleEl = document.querySelector<HTMLStyleElement>('#c15t-theme');

		expect(styleEl).not.toBeNull();
		expect(styleEl?.hasAttribute('nonce')).toBe(false);
	});
});
