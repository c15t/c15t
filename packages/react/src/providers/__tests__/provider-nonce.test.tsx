import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
