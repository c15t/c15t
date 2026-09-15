/**
 * ConsentRoot module prop auto-wiring tests.
 *
 * Verifies that passing curated module props causes the corresponding
 * modules to mount and react to kernel state.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

describe('ConsentRoot module props', () => {
	test('scripts prop mounts <script> tags for eligible categories', async () => {
		const { getByText } = await render(
			<ConsentRoot
				state={policyFixture({ marketing: true })}
				persistence={false}
				scripts={[
					{
						category: 'marketing',
						id: 'test-script',
						src: 'https://example.com/test.js',
					},
				]}
			>
				<div>root rendered</div>
			</ConsentRoot>
		);

		await expect.element(getByText('root rendered')).toBeInTheDocument();

		// Script should be appended to document.head by the script-loader module.
		await vi.waitFor(
			() => {
				const scripts = document.head.querySelectorAll(
					'script[src="https://example.com/test.js"]'
				);
				expect(scripts.length).toBeGreaterThanOrEqual(1);
			},
			{ timeout: 5000 }
		);
	});

	test('no module props → no extra DOM work beyond the children', async () => {
		const { getByText } = await render(
			<ConsentRoot
				state={{}}
				persistence={false}
			>
				<div>plain root</div>
			</ConsentRoot>
		);
		await expect.element(getByText('plain root')).toBeInTheDocument();
	});
});

test('forwards clearOnRevocation and removes denied category storage', async () => {
	localStorage.setItem('analytics:visitor', 'visitor');
	const screen = await render(
		<ConsentRoot
			state={policyFixture({ measurement: false })}
			persistence={false}
			clearOnRevocation={{
				measurement: { localStorage: ['analytics:visitor'] },
			}}
		>
			<div>cleanup configured</div>
		</ConsentRoot>
	);
	await vi.waitFor(() =>
		expect(localStorage.getItem('analytics:visitor')).toBeNull()
	);
	screen.unmount();
});
