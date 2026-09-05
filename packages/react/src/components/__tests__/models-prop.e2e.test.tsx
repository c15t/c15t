/**
 * E2E tests for the `models` prop on consent components.
 *
 * Verifies that components only render when the current consent model
 * matches their `models` prop (default or explicitly set).
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentBanner } from '~/components/consent-banner';
import { ConsentDialog } from '~/components/consent-dialog';
import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import {
	clearConsentState,
	defaultProviderIABOptions,
} from '~/components/iab/__tests__/e2e-setup';
import { offline } from '~/transports/offline';

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

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		clear: () => {
			store = {};
		},
		getItem: (key: string) => store[key] || null,
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
});

const optInOptions: ConsentProviderOptions = {
	consentCategories: [
		'necessary',
		'functionality',
		'experience',
		'marketing',
		'measurement',
	],
	mode: offline(),
	prefetch: policyFixture(undefined, {
		categories: [
			'necessary',
			'functionality',
			'experience',
			'marketing',
			'measurement',
		],
		id: 'models-prop-opt-in-test',
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
	}),
};

describe('models Prop E2E Tests', () => {
	beforeEach(() => {
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
		vi.clearAllMocks();
		clearConsentState();
	});

	describe('Opt-in mode (default)', () => {
		test('ConsentBanner renders in opt-in mode (default models includes opt-in)', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<ConsentBanner />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('IABConsentBanner does NOT render in opt-in mode (default models is iab)', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<IABConsentBanner />
				</ConsentProvider>
			);

			// Wait long enough to confirm it doesn't appear
			await createDeferredPromise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="iab-consent-banner-card"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		test('ConsentDialog renders in opt-in mode when open', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<ConsentDialog open={true} />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const dialog = document.querySelector(
						'[data-testid="consent-dialog-root"]'
					);
					expect(dialog).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('IABConsentDialog does NOT render in opt-in mode', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<IABConsentDialog open={true} />
				</ConsentProvider>
			);

			await createDeferredPromise((resolve) => setTimeout(resolve, 1000));

			const dialog = document.querySelector(
				'[data-testid="iab-consent-dialog-root"]'
			);
			expect(dialog).not.toBeInTheDocument();
		});
	});

	describe('IAB mode', () => {
		test('IABConsentBanner renders when model is iab', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="iab-consent-banner-card"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('ConsentBanner does NOT render when model is iab', async () => {
			render(
				<ConsentProvider options={defaultProviderIABOptions}>
					<ConsentBanner />
				</ConsentProvider>
			);

			await createDeferredPromise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});
	});

	describe('Custom models prop', () => {
		test('ConsentBanner with models=[opt-in] renders in opt-in mode', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<ConsentBanner models={['opt-in']} />
				</ConsentProvider>
			);

			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('ConsentBanner with models=[iab] does NOT render in opt-in mode', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<ConsentBanner models={['iab']} />
				</ConsentProvider>
			);

			await createDeferredPromise((resolve) => setTimeout(resolve, 1000));

			const banner = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			expect(banner).not.toBeInTheDocument();
		});

		test('only matching component renders when both are present', async () => {
			render(
				<ConsentProvider options={optInOptions}>
					<ConsentBanner />
					<IABConsentBanner />
				</ConsentProvider>
			);

			// Standard banner should render
			await vi.waitFor(
				() => {
					const banner = document.querySelector(
						'[data-testid="consent-banner-root"]'
					);
					expect(banner).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// IAB banner should NOT render
			const iabBanner = document.querySelector(
				'[data-testid="iab-consent-banner-card"]'
			);
			expect(iabBanner).not.toBeInTheDocument();
		});
	});
});
