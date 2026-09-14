/**
 * Tests for ConsentRoot — the client component that creates a kernel
 * from the server-resolved state and wraps children in ConsentProvider.
 *
 * Invariants verified:
 * - State is respected (initial consents, initial overrides).
 * - Kernel is per-mount (two mounts → two kernels).
 * - Selector hooks work downstream.
 */
import { useConsent, useOverrides } from '@c15t/react';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

describe('ConsentRoot: state is honored', () => {
	test('initial consents from state reach useConsent', async () => {
		const MarketingStatus = () => {
			const allowed = useConsent('marketing');
			return <div data-testid="status">{String(allowed)}</div>;
		};

		const { getByTestId } = await render(
			<ConsentRoot
				state={policyFixture({ marketing: true, measurement: true })}
				persistence={false}
			>
				<MarketingStatus />
			</ConsentRoot>
		);

		await expect.element(getByTestId('status')).toHaveTextContent('true');
	});

	test('initial overrides from state reach useOverrides', async () => {
		const CountryLabel = () => {
			const o = useOverrides();
			return (
				<div data-testid="country">
					{o.country ?? 'none'}/{o.language ?? 'none'}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentRoot
				state={{ initialOverrides: { country: 'DE', language: 'de' } }}
			>
				<CountryLabel />
			</ConsentRoot>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('DE/de');
	});
});

describe('ConsentRoot: kernel is per-mount', () => {
	test('two roots receive independent kernels', async () => {
		const MarketingStatus = ({ label }: { label: string }) => {
			const allowed = useConsent('marketing');
			return (
				<div data-testid={label}>
					{label}:{String(allowed)}
				</div>
			);
		};

		// Two separate ConsentRoot mounts with different state values.
		// Each must produce its own kernel; mutating one shouldn't affect
		// the other.
		const screen = await render(
			<div>
				<ConsentRoot
					state={policyFixture({ marketing: true })}
					persistence={false}
				>
					<MarketingStatus label="a" />
				</ConsentRoot>
				<ConsentRoot
					state={policyFixture({ marketing: false })}
					persistence={false}
				>
					<MarketingStatus label="b" />
				</ConsentRoot>
			</div>
		);

		await expect.element(screen.getByTestId('a')).toHaveTextContent('a:true');
		await expect.element(screen.getByTestId('b')).toHaveTextContent('b:false');
	});
});
