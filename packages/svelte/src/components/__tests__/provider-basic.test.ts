/**
 * Tests for ConsentManagerProvider basic request behavior.
 *
 * Mirrors: packages/react/src/providers/__tests__/provider-basic.test.tsx
 */

import { clearConsentRuntimeCache } from '@c15t/core';
import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ContextConsumerFixture from '../../__tests__/fixtures/context-consumer-fixture.svelte';
import ProviderOnlyFixture from '../../__tests__/fixtures/provider-only-fixture.svelte';
import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';

type DeferredPromise<Value> = {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
};

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers<Value>(): DeferredPromise<Value>;
};

function createDeferredPromise<Value>(
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
}

const mockFetch = vi.fn();
window.fetch = mockFetch;

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
};

describe('ConsentManagerProvider Basic Request Behavior', () => {
	beforeEach(() => {
		delete (window as WindowWithC15t).c15t;
		vi.resetAllMocks();
		clearConsentRuntimeCache();

		mockFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					showConsentBanner: true,
					jurisdiction: { code: 'GDPR' },
				}),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}
			)
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
		delete (window as WindowWithC15t).c15t;
	});

	test('should install window.c15t with Svelte offline identity', async () => {
		const result = render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
			},
		});

		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toMatchObject({
				pkg: '@c15t/svelte',
				mode: 'offline',
			});
		});
		expect(typeof (window as WindowWithC15t).c15t?.version).toBe('string');

		result.unmount();
		expect((window as WindowWithC15t).c15t).toBeUndefined();
	});

	test('should report hosted mode on window.c15t when backendURL is set', async () => {
		const result = render(ProviderOnlyFixture, {
			options: {
				backendURL: '/api/c15t',
			},
		});

		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toMatchObject({
				pkg: '@c15t/svelte',
				mode: 'hosted',
			});
		});

		result.unmount();
	});

	test('should not make fetch calls in offline mode', async () => {
		mockFetch.mockClear();

		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
			},
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 100));

		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('should accept top-level options and prefer them over options object', async () => {
		mockFetch.mockClear();

		render(ConsentManagerProvider, {
			options: {
				mode: 'hosted',
				backendURL: 'https://example.invalid',
			},
			mode: 'offline',
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 100));

		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('should not make additional requests when theme changes but mode remains same', async () => {
		mockFetch.mockClear();

		render(ProviderOnlyFixture, {
			options: {
				mode: 'offline',
				theme: { slots: { bannerCard: 'light' } },
			},
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 100));

		// No fetch in offline mode
		expect(mockFetch).not.toHaveBeenCalled();
	});

	test('should resolve policies in offline mode', async () => {
		const { getByTestId } = render(ContextConsumerFixture, {
			options: {
				mode: 'offline',
				policies: [
					{
						id: 'policy_region_us_ca',
						match: { regions: [{ country: 'US', region: 'CA' }] },
						consent: { model: 'opt-out' },
						ui: { mode: 'banner' },
					},
				],
				overrides: {
					country: 'US',
					region: 'CA',
				},
			},
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 100));

		expect(mockFetch).not.toHaveBeenCalled();
		expect(getByTestId('model')).toHaveTextContent('opt-out');
		expect(getByTestId('active-ui')).toHaveTextContent('banner');
	});

	test('should call transport init once on initial mount', async () => {
		const init = vi.fn(async () => ({}));

		render(ProviderOnlyFixture, {
			options: {
				transport: {
					init,
					async save(payload) {
						return { ok: true, subjectId: payload.subjectId };
					},
				},
			},
		});

		await createDeferredPromise((resolve) => setTimeout(resolve, 100));

		expect(init).toHaveBeenCalledTimes(1);
	});
});
