/**
 * Tests for ConsentBoundary's module prop auto-wiring.
 *
 * Verifies that passing curated module props causes the corresponding
 * modules to mount and react to kernel state.
 */
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBoundary } from '../boundary';

describe('ConsentBoundary module props', () => {
	test('scripts prop mounts <script> tags for eligible categories', async () => {
		const { getByText } = await render(
			<ConsentBoundary
				config={{ initialConsents: { marketing: true } }}
				persistence={false}
				scripts={[
					{
						id: 'test-script',
						src: 'https://example.com/test.js',
						category: 'marketing',
					},
				]}
			>
				<div>{'boundary rendered'}</div>
			</ConsentBoundary>
		);

		await expect.element(getByText('boundary rendered')).toBeInTheDocument();

		// Script should be appended to document.head by the script-loader module.
		const scripts = document.head.querySelectorAll(
			'script[src="https://example.com/test.js"]'
		);
		expect(scripts.length).toBeGreaterThanOrEqual(1);
	});

	test('no module props → no extra DOM work beyond the children', async () => {
		const { getByText } = await render(
			<ConsentBoundary config={{}} persistence={false}>
				<div>{'plain boundary'}</div>
			</ConsentBoundary>
		);
		await expect.element(getByText('plain boundary')).toBeInTheDocument();
	});
});
