/**
 * End-to-end tests for the Next.js v3 adapter.
 *
 * Covers the full flow:
 * 1. Server: prefetchInitialConsent calls the backend, returns enriched config.
 * 2. Client: ConsentBoundary with backendURL auto-fires kernel.commands.init().
 * 3. Client: enabled=false disables init and treats consents as allowed.
 * 4. Prefetched banner visibility reaches the snapshot before the client
 *    roundtrip completes.
 */

import { useConsent, useSnapshot } from '@c15t/react/v3/hooks';
import type { KernelConfig } from 'c15t/v3';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentBoundary } from '../boundary';

const POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
} as const;

describe('ConsentBoundary: backendURL triggers auto-init', () => {
	test('boundary with backendURL fires kernel.commands.init on mount', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ policy: POLICY }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		function Probe() {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${snap.policy?.id ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
			);
		}

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					backendURL="http://bench.example.com/api/c15t"
					persistence={false}
				>
					<Probe />
				</ConsentBoundary>
			);

			// After the init roundtrip completes, policy-derived state updates.
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|opt-in|banner');
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
				<ConsentBoundary config={{}} persistence={false}>
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

	test('enabled=false skips init and treats consent checks as allowed', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		function Probe() {
			const allowed = useConsent('marketing');
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${String(allowed)}|${snap.activeUI ?? 'null'}`}</div>
			);
		}

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					backendURL="http://bench.example.com/api/c15t"
					options={{ enabled: false }}
				>
					<Probe />
				</ConsentBoundary>
			);

			await expect.element(getByTestId('probe')).toHaveTextContent('true|none');
			await new Promise((r) => setTimeout(r, 10));
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe('ConsentBoundary: prefetched config reaches first paint', () => {
	test('prefetched policy-derived UI is visible before init finishes', async () => {
		// Fetch that resolves on demand — simulates a slow roundtrip.
		let resolveInit: (value: unknown) => void = () => undefined;
		const fetchSpy = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					resolveInit = (value: unknown) => {
						resolve(
							new Response(JSON.stringify(value), {
								status: 200,
								headers: { 'content-type': 'application/json' },
							})
						);
					};
				})
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		function Probe() {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${snap.policy?.id ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
			);
		}

		const config: KernelConfig = {
			initialPolicy: POLICY as never,
		};

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={config}
					backendURL="http://bench.example.com/api/c15t"
					persistence={false}
				>
					<Probe />
				</ConsentBoundary>
			);

			// First paint carries the prefetched values. The init roundtrip
			// is still in flight (resolveInit has not been called).
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|opt-in|banner');

			// Now resolve the slow init. Snapshot should not regress.
			resolveInit({ policy: POLICY });
			await new Promise((r) => setTimeout(r, 10));
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|opt-in|banner');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
