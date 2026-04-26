/**
 * Tests for ConsentBoundary — the client component that creates a kernel
 * from server-produced config and wraps children in ConsentProvider.
 *
 * Invariants verified:
 * - Config is respected (initial consents, initial overrides).
 * - Kernel is per-mount (two mounts → two kernels).
 * - Selector hooks work downstream.
 */
import { useConsent, useOverrides } from '@c15t/react/v3/hooks';
import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBoundary } from '../boundary';

describe('ConsentBoundary: config is honored', () => {
	test('initial consents from config reach useConsent', async () => {
		function MarketingStatus() {
			const allowed = useConsent('marketing');
			return <div data-testid="status">{String(allowed)}</div>;
		}

		const { getByTestId } = await render(
			<ConsentBoundary
				config={{ initialConsents: { marketing: true, measurement: true } }}
			>
				<MarketingStatus />
			</ConsentBoundary>
		);

		await expect.element(getByTestId('status')).toHaveTextContent('true');
	});

	test('initial overrides from config reach useOverrides', async () => {
		function CountryLabel() {
			const o = useOverrides();
			return (
				<div data-testid="country">
					{o.country ?? 'none'}/{o.language ?? 'none'}
				</div>
			);
		}

		const { getByTestId } = await render(
			<ConsentBoundary
				config={{ initialOverrides: { country: 'DE', language: 'de' } }}
			>
				<CountryLabel />
			</ConsentBoundary>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('DE/de');
	});
});

describe('ConsentBoundary: kernel is per-mount', () => {
	test('two boundaries receive independent kernels', async () => {
		function MarketingStatus({ label }: { label: string }) {
			const allowed = useConsent('marketing');
			return (
				<div data-testid={label}>
					{label}:{String(allowed)}
				</div>
			);
		}

		// Two separate ConsentBoundary mounts with different config values.
		// Each must produce its own kernel; mutating one shouldn't affect
		// the other.
		const screen = await render(
			<div>
				<ConsentBoundary config={{ initialConsents: { marketing: true } }}>
					<MarketingStatus label="a" />
				</ConsentBoundary>
				<ConsentBoundary config={{ initialConsents: { marketing: false } }}>
					<MarketingStatus label="b" />
				</ConsentBoundary>
			</div>
		);

		await expect.element(screen.getByTestId('a')).toHaveTextContent('a:true');
		await expect.element(screen.getByTestId('b')).toHaveTextContent('b:false');
	});
});
