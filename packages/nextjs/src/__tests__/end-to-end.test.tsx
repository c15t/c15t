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

import type { KernelConfig } from '@c15t/core';
import { useConsent, useSaveConsents, useSnapshot } from '@c15t/react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentBoundary } from '../boundary';
import { defineConsentConfig } from '../config';
import { MANIFEST_FIXTURE } from './manifest-fixture';

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

const POLICY = {
	id: 'gdpr',
	model: 'opt-in',
	ui: { mode: 'banner' },
} as const;

describe('ConsentBoundary: backendURL triggers auto-init', () => {
	test('boundary reports Next.js adapter identity on window.c15t', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ policy: POLICY }), {
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
					policy: POLICY,
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
				<div data-testid="probe">{`${snap.policy?.id ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
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
	test('prefetched policy-derived UI is visible before init finishes', async () => {
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
				<div data-testid="probe">{`${snap.policy?.id ?? 'none'}|${snap.model ?? 'none'}|${snap.activeUI ?? 'null'}`}</div>
			);
		};

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
			await createDeferredPromise((r) => setTimeout(r, 10));
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|opt-in|banner');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe('ConsentBoundary: consent config picks the transport', () => {
	const jsonResponse = (body: unknown) =>
		new Response(JSON.stringify(body), {
			headers: { 'content-type': 'application/json' },
			status: 200,
		});

	const PolicyProbe = () => {
		const snap = useSnapshot();
		const save = useSaveConsents();
		return (
			<div>
				<div data-testid="probe">{`${snap.policy?.id ?? 'none'}|${snap.location?.countryCode ?? 'null'}|${String(snap.hasConsented)}`}</div>
				<button
					type="button"
					data-testid="save"
					onClick={() => {
						void save('all');
					}}
				>
					save
				</button>
			</div>
		);
	};

	test('initURL: init hits the same-origin route, saves post to the backend', async () => {
		const fetchSpy = vi.fn((url: string, _init?: RequestInit) =>
			Promise.resolve(
				url.endsWith('/subjects')
					? jsonResponse({ ok: true, subjectId: 'sub_saved' })
					: jsonResponse({
							branding: 'c15t',
							jurisdiction: 'GDPR',
							location: { countryCode: 'DE', regionCode: null },
							policy: POLICY,
							policyDecision: {
								country: 'DE',
								fingerprint: 'eu-fingerprint',
								policyId: 'gdpr',
							},
							translations: { language: 'en', translations: { common: {} } },
						})
			)
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					consent={defineConsentConfig({
						backendURL: 'https://consent.example.com',
						initURL: '/api/consent/init',
						manifestURL: '/api/consent/manifest',
					})}
					persistence={false}
				>
					<PolicyProbe />
				</ConsentBoundary>
			);

			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|DE|false');
			await getByTestId('save').click();
			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|DE|true');
			await vi.waitFor(() => {
				expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
					'/api/consent/init',
					'https://consent.example.com/subjects',
				]);
			});
			// Manifest-resolved init issues no snapshot token, so the save
			// asserts the policy it was made against.
			const saveInit = fetchSpy.mock.calls[1]?.[1];
			expect(JSON.parse(String(saveInit?.body))).toMatchObject({
				fingerprint: 'eu-fingerprint',
				policyId: 'gdpr',
			});
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('manifestURL: init resolves in the browser from the manifest route', async () => {
		const fetchSpy = vi.fn((url: string) =>
			Promise.resolve(
				url.endsWith('/subjects')
					? jsonResponse({ ok: true, subjectId: 'sub_saved' })
					: jsonResponse(MANIFEST_FIXTURE)
			)
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{ initialOverrides: { country: 'DE' } }}
					consent={defineConsentConfig({
						backendURL: 'https://consent.example.com',
						manifestURL: '/api/consent/manifest',
					})}
					persistence={false}
				>
					<PolicyProbe />
				</ConsentBoundary>
			);

			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('eu-opt-in|DE|false');
			await getByTestId('save').click();
			await vi.waitFor(() => {
				expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
					'/api/consent/manifest',
					'https://consent.example.com/subjects',
				]);
			});
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('backendURL only: hosted mode against the backend /init', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			jsonResponse({
				branding: 'c15t',
				jurisdiction: 'GDPR',
				location: { countryCode: 'DE', regionCode: null },
				policy: POLICY,
				translations: { language: 'en', translations: { common: {} } },
			})
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					consent={defineConsentConfig({
						backendURL: 'https://consent.example.com',
					})}
					persistence={false}
				>
					<PolicyProbe />
				</ConsentBoundary>
			);

			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|DE|false');
			expect(fetchSpy.mock.calls[0]?.[0]).toBe(
				'https://consent.example.com/init'
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('options.mode still wins over the consent config', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(new Response());
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
		const init = vi.fn().mockResolvedValue({ policy: POLICY });

		try {
			const { getByTestId } = await render(
				<ConsentBoundary
					config={{}}
					consent={defineConsentConfig({
						backendURL: 'https://consent.example.com',
						initURL: '/api/consent/init',
						manifestURL: '/api/consent/manifest',
					})}
					options={{
						mode: Object.assign(() => ({ init }), { kind: 'custom' as const }),
					}}
					persistence={false}
				>
					<PolicyProbe />
				</ConsentBoundary>
			);

			await expect
				.element(getByTestId('probe'))
				.toHaveTextContent('gdpr|null|false');
			expect(init).toHaveBeenCalledTimes(1);
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
