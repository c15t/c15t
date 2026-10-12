/**
 * ConsentRoot module prop auto-wiring tests.
 *
 * Verifies that passing curated module props causes the corresponding
 * modules to mount and react to kernel state.
 */
import { offline } from '@c15t/core/modes';
import { useDeclaredVendors, useVendorAllowed } from '@c15t/react';
import { ConsentGPP } from '@c15t/react/gpp';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

/** These tests are not about the backend; an explicit offline() needs none. */
const OFFLINE_CONFIG = { mode: offline() };

describe('ConsentRoot module props', () => {
	test('scripts prop mounts <script> tags for eligible categories', async () => {
		const { getByText } = await render(
			<ConsentRoot
				config={OFFLINE_CONFIG}
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
				config={OFFLINE_CONFIG}
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
			config={OFFLINE_CONFIG}
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

test('forwards vendors so the preference center lists them and gates their scripts', async () => {
	const Probe = () => {
		const declared = useDeclaredVendors();
		const allowed = useVendorAllowed('meta-pixel');
		return (
			<output data-testid="probe">
				{JSON.stringify({ allowed, ids: declared.map((vendor) => vendor.id) })}
			</output>
		);
	};
	const { getByTestId } = await render(
		<ConsentRoot
			config={OFFLINE_CONFIG}
			state={policyFixture({ marketing: true })}
			persistence={false}
			vendors={[
				{
					category: 'marketing',
					id: 'meta-pixel',
					name: 'Meta Pixel',
					privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
				},
			]}
		>
			<Probe />
		</ConsentRoot>
	);
	await expect
		.element(getByTestId('probe'))
		.toHaveTextContent('{"allowed":true,"ids":["meta-pixel"]}');
});

test('ConsentGPP mounts __gpp inside ConsentRoot, and unmount removes it', async () => {
	type GPPPing = (
		command: 'ping',
		callback: (data: { cmpStatus: string }) => void
	) => void;
	const cmpStatus = () => {
		let status: string | undefined;
		(window as { __gpp?: GPPPing }).__gpp?.('ping', (data) => {
			status = data.cmpStatus;
		});
		return status;
	};
	const screen = await render(
		<ConsentRoot
			config={OFFLINE_CONFIG}
			state={policyFixture()}
			persistence={false}
		>
			<ConsentGPP />
			<div>gpp configured</div>
		</ConsentRoot>
	);
	await vi.waitFor(() => expect(cmpStatus()).toBe('loaded'), {
		timeout: 5000,
	});
	await screen.unmount();
	expect((window as { __gpp?: GPPPing }).__gpp).toBeUndefined();
});
