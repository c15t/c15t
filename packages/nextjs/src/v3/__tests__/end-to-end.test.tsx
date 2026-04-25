/**
 * End-to-end tests for the Next.js v3 adapter.
 *
 * Covers the full flow:
 * 1. Server: prefetchInitialConsent calls the backend, returns enriched config.
 * 2. Client: ConsentBoundary with backendURL auto-fires kernel.commands.init().
 * 3. skipAutoInit prop disables the mount effect.
 * 4. Prefetched initialShowConsentBanner reaches the snapshot before the
 *    client roundtrip completes.
 */

import { useConsent, useSnapshot } from '@c15t/react/v3';
import type { KernelConfig, KernelTransport } from 'c15t/v3';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBoundary } from '../boundary';

describe('ConsentBoundary: backendURL triggers auto-init', () => {
	test('boundary with backendURL fires kernel.commands.init on mount', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(
					JSON.stringify({ jurisdiction: 'GDPR', showConsentBanner: true }),
					{ status: 200, headers: { 'content-type': 'application/json' } }
				)
			);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		function Probe() {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">
					{snap.jurisdiction ?? 'none'}|{String(snap.showConsentBanner)}
				</div>
			);
		}

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					backendURL="http://bench.example.com/api/c15t"
				>
					<Probe />
				</ConsentBoundary>
			);

			// Initial render: jurisdiction is null, showConsentBanner is null.
			// After the init roundtrip completes (microtask), the snapshot updates.
			await expect.element(getByTestId('probe')).toHaveTextContent('GDPR|true');
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('boundary without backendURL or transport does NOT fire any network call', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		function Probe() {
			const allowed = useConsent('marketing');
			return <div data-testid="probe">{String(allowed)}</div>;
		}

		try {
			const { getByTestId } = await render(
				<ConsentBoundary config={{}}>
					<Probe />
				</ConsentBoundary>
			);

			await expect.element(getByTestId('probe')).toHaveTextContent('false');
			// No network call should have fired — no transport, no backendURL.
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('skipAutoInit blocks the mount-time init call', async () => {
		const initSpy = vi.fn().mockResolvedValue({ jurisdiction: 'GDPR' });
		const transport: KernelTransport = { init: initSpy };

		function Probe() {
			return <div data-testid="probe">rendered</div>;
		}

		await render(
			<ConsentBoundary config={{}} transport={transport} skipAutoInit>
				<Probe />
			</ConsentBoundary>
		);

		// Give any microtasks a chance to drain.
		await new Promise((r) => setTimeout(r, 10));
		expect(initSpy).not.toHaveBeenCalled();
	});

	test('explicit transport prop wins over backendURL', async () => {
		const initSpy = vi.fn().mockResolvedValue({ jurisdiction: 'CCPA' });
		const transport: KernelTransport = { init: initSpy };

		function Probe() {
			const snap = useSnapshot();
			return <div data-testid="probe">{snap.jurisdiction ?? 'none'}</div>;
		}

		const { getByTestId } = await render(
			<ConsentBoundary
				config={{}}
				backendURL="http://should-not-be-called.example.com"
				transport={transport}
			>
				<Probe />
			</ConsentBoundary>
		);

		await expect.element(getByTestId('probe')).toHaveTextContent('CCPA');
		expect(initSpy).toHaveBeenCalledTimes(1);
	});
});

describe('ConsentBoundary: prefetched config reaches first paint', () => {
	test('initialShowConsentBanner from prefetch is visible before init finishes', async () => {
		// Transport that never resolves — simulates a slow roundtrip.
		let resolveInit: (value: unknown) => void = () => undefined;
		const transport: KernelTransport = {
			init: () =>
				new Promise((resolve) => {
					resolveInit = resolve as typeof resolveInit;
				}),
		};

		function Probe() {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">
					{String(snap.showConsentBanner)}|{snap.jurisdiction ?? 'none'}
				</div>
			);
		}

		const config: KernelConfig = {
			initialShowConsentBanner: true,
			initialJurisdiction: 'GDPR',
		};

		const { getByTestId } = await render(
			<ConsentBoundary config={config} transport={transport}>
				<Probe />
			</ConsentBoundary>
		);

		// First paint carries the prefetched values. The init roundtrip
		// is still in flight (resolveInit never called).
		await expect.element(getByTestId('probe')).toHaveTextContent('true|GDPR');

		// Now resolve the slow init. Snapshot should not regress.
		resolveInit({ jurisdiction: 'GDPR', showConsentBanner: true });
		await new Promise((r) => setTimeout(r, 10));
		await expect.element(getByTestId('probe')).toHaveTextContent('true|GDPR');
	});
});
