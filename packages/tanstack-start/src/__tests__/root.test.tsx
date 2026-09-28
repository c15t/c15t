/**
 * Tests for ConsentRoot, the client component that creates a kernel
 * from loader-produced state and wraps children in ConsentProvider.
 *
 * Invariants verified:
 * - State is respected (initial consents, initial overrides).
 * - Kernel is per-mount (two mounts produce two kernels).
 * - `backendURL` selects hosted mode with the same-origin init route.
 */
import {
	useConsent,
	useDeclaredVendors,
	useOverrides,
	useVendorAllowed,
} from '@c15t/react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot, DEFAULT_INIT_ROUTE } from '../root';
import { policyFixture } from './policy-fixture';

describe('ConsentRoot: state is honored', () => {
	test('initial consents from state reach useConsent', async () => {
		const MarketingStatus = () => {
			const allowed = useConsent('marketing');
			return <div data-testid="status">{String(allowed)}</div>;
		};

		const { getByTestId } = await render(
			<ConsentRoot
				state={{
					...policyFixture({ marketing: true, measurement: true }),
				}}
				persistence={false}
			>
				<MarketingStatus />
			</ConsentRoot>
		);

		await expect.element(getByTestId('status')).toHaveTextContent('true');
	});

	test('initial overrides from state reach useOverrides', async () => {
		const CountryLabel = () => {
			const overrides = useOverrides();
			return (
				<div data-testid="country">
					{overrides.country ?? 'none'}/{overrides.language ?? 'none'}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentRoot
				state={{ initialOverrides: { country: 'DE', language: 'de' } }}
				persistence={false}
			>
				<CountryLabel />
			</ConsentRoot>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('DE/de');
	});
});

describe('ConsentRoot: kernel is per-mount', () => {
	test('two roots do not share consent state', async () => {
		const Status = ({ id }: { id: string }) => {
			const allowed = useConsent('marketing');
			return <div data-testid={id}>{String(allowed)}</div>;
		};

		const { getByTestId } = await render(
			<>
				<ConsentRoot
					state={{
						...policyFixture({ marketing: true }),
					}}
					persistence={false}
				>
					<Status id="first" />
				</ConsentRoot>
				<ConsentRoot
					state={{
						...policyFixture({ marketing: false }),
					}}
					persistence={false}
				>
					<Status id="second" />
				</ConsentRoot>
			</>
		);

		await expect.element(getByTestId('first')).toHaveTextContent('true');
		await expect.element(getByTestId('second')).toHaveTextContent('false');
	});
});

describe('ConsentRoot: transport selection', () => {
	test('backendURL runs init through the same-origin init route', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({
				branding: 'c15t',
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				translations: { language: 'en', translations: { common: {} } },
			})
		);

		try {
			await render(
				<ConsentRoot
					backendURL="https://consent.example.com"
					state={{}}
					persistence={false}
				>
					<span>ready</span>
				</ConsentRoot>
			);

			await vi.waitFor(() => {
				expect(fetchSpy).toHaveBeenCalled();
			});
			const initURL = String(fetchSpy.mock.calls[0]?.[0]);
			expect(initURL).toContain(DEFAULT_INIT_ROUTE);
			expect(initURL).not.toContain('consent.example.com');
		} finally {
			fetchSpy.mockRestore();
		}
	});

	test('initRoute={false} calls the backend init endpoint directly', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({
				branding: 'c15t',
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				translations: { language: 'en', translations: { common: {} } },
			})
		);

		try {
			await render(
				<ConsentRoot
					backendURL="https://consent.example.com"
					state={{}}
					initRoute={false}
					persistence={false}
				>
					<span>ready</span>
				</ConsentRoot>
			);

			await vi.waitFor(() => {
				expect(fetchSpy).toHaveBeenCalled();
			});
			expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
				'https://consent.example.com/init'
			);
		} finally {
			fetchSpy.mockRestore();
		}
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
