import type { KernelConfig } from '@c15t/core';
/**
 * End-to-end tests for the Next.js adapter.
 *
 * Covers the full flow:
 * 1. Server: prefetchInitialConsent calls the backend, returns enriched config.
 * 2. Client: ConsentBoundary with backendURL auto-fires kernel.commands.init().
 * 3. Client: enabled=false disables init and treats consents as allowed.
 * 4. Prefetched banner visibility reaches the snapshot before the client
 *    roundtrip completes.
 */
import { useConsent, useSnapshot } from '@c15t/react';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBoundary } from '../boundary';
import { policyFixture } from './policy-fixture';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

const POLICY_RESOLUTION = writePolicyResolutionWire(
	resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				id: 'gdpr',
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	})
);

describe('ConsentBoundary: backendURL triggers auto-init', () => {
	test('boundary reports Next.js adapter identity on window.c15t', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ policyResolution: POLICY_RESOLUTION }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
		delete (window as WindowWithC15t).c15t;

		try {
			const { unmount } = await render(
				<ConsentBoundary
					config={{}}
					backendURL="/api/c15t"
					persistence={false}
				>
					<div data-testid="probe">ready</div>
				</ConsentBoundary>
			);

			await vi.waitFor(() => {
				expect((window as WindowWithC15t).c15t).toMatchObject({
					mode: 'hosted',
					pkg: '@c15t/nextjs',
				});
			});
			expect(typeof (window as WindowWithC15t).c15t?.version).toBe('string');
			unmount();
		} finally {
			globalThis.fetch = originalFetch;
			delete (window as WindowWithC15t).c15t;
		}
	});

	test('boundary with backendURL fires kernel.commands.init on mount', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					branding: 'c15t',
					jurisdiction: 'GDPR',
					location: { countryCode: 'DE', regionCode: null },
					policyResolution: POLICY_RESOLUTION,
					translations: { language: 'en', translations: { common: {} } },
				}),
				{
					headers: { 'content-type': 'application/json' },
					status: 200,
				}
			)
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		const Probe = () => {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${(snap.resolution.status === 'matched' ? snap.resolution.policyId : undefined) ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
			);
		};

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

		const Probe = () => {
			const allowed = useConsent('marketing');
			return <div data-testid="probe">{String(allowed)}</div>;
		};

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					persistence={false}
				>
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

		const Probe = () => {
			const allowed = useConsent('marketing');
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${String(allowed)}|${snap.activeUI ?? 'null'}`}</div>
			);
		};

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
			await createDeferredPromise((r) => setTimeout(r, 10));
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe('ConsentBoundary: prefetched config reaches first paint', () => {
	test('prepared policy renders without a duplicate browser init', async () => {
		// Fetch that resolves on demand — simulates a slow roundtrip.
		let resolveInit: (value: unknown) => void = () => undefined;
		const fetchSpy = vi.fn(() =>
			createDeferredPromise<Response>((resolve) => {
				resolveInit = (value: unknown) => {
					resolve(
						new Response(JSON.stringify(value), {
							headers: { 'content-type': 'application/json' },
							status: 200,
						})
					);
				};
			})
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		const Probe = () => {
			const snap = useSnapshot();
			return (
				<div data-testid="probe">{`${(snap.resolution.status === 'matched' ? snap.resolution.policyId : undefined) ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
			);
		};

		const config: KernelConfig = policyFixture({}, { id: 'gdpr' });

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
			expect(fetchSpy).not.toHaveBeenCalled();
			resolveInit({ policyResolution: POLICY_RESOLUTION });
			await createDeferredPromise((r) => setTimeout(r, 10));
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|opt-in|banner');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
