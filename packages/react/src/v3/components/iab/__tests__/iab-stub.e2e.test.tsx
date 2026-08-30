/**
 * IAB Stub E2E Tests
 *
 * Browser-based tests for IAB stub and queue behavior.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { IABConsentBanner } from '~/v3/components/iab-consent-banner';
import { IABConsentDialog } from '~/v3/components/iab-consent-dialog';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/v3/providers/consent-manager-provider';

import {
	clearConsentState,
	defaultIABOptions,
	waitForCMP,
	waitForElement,
} from './e2e-setup';

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

describe('IAB Stub E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('__tcfapi Availability', () => {
		test('__tcfapi should be available after CMP loads', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			expect((window as { __tcfapi?: unknown }).__tcfapi).toBeDefined();
			expect(typeof (window as { __tcfapi?: unknown }).__tcfapi).toBe(
				'function'
			);
		});

		test('__tcfapi should accept standard parameters', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;
			expect(tcfapi).toBeDefined();

			// Should accept command, version, callback
			await createDeferredPromise<void>((resolve) => {
				tcfapi?.('ping', 2, () => {
					resolve();
				});
			});
		});

		test('__tcfapi should accept optional parameter', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const tcfapi = (window as { __tcfapi?: Function }).__tcfapi;

			// Should accept command, version, callback, parameter
			const result = await createDeferredPromise<boolean>((resolve) => {
				tcfapi?.(
					'removeEventListener',
					2,
					(success: boolean) => {
						resolve(success);
					},
					12345
				);
			});

			// Should return false for non-existent listener
			expect(result).toBe(false);
		});
	});

	describe('Stub Ping Behavior', () => {
		test('ping should return cmpLoaded=true after CMP ready', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const pingData = await createDeferredPromise<{ cmpLoaded: boolean }>(
				(resolve) => {
					(window as { __tcfapi?: Function }).__tcfapi?.(
						'ping',
						2,
						(data: { cmpLoaded: boolean }) => {
							resolve(data);
						}
					);
				}
			);

			expect(pingData.cmpLoaded).toBe(true);
		});

		test('ping should return cmpStatus="loaded" after CMP ready', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const pingData = await createDeferredPromise<{ cmpStatus: string }>(
				(resolve) => {
					(window as { __tcfapi?: Function }).__tcfapi?.(
						'ping',
						2,
						(data: { cmpStatus: string }) => {
							resolve(data);
						}
					);
				}
			);

			expect(pingData.cmpStatus).toBe('loaded');
		});
	});

	describe('Queue Processing', () => {
		test('calls should be processed after CMP loads', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Make a call that requires CMP to be loaded
			const result = await createDeferredPromise<{ tcString: string }>(
				(resolve) => {
					(window as { __tcfapi?: Function }).__tcfapi?.(
						'getTCData',
						2,
						(data: { tcString: string }) => {
							resolve(data);
						}
					);
				}
			);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('tcString');
		});
	});

	describe('Command Handling', () => {
		test('should handle ping command', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const result = await createDeferredPromise<{ apiVersion: string }>(
				(resolve) => {
					(window as { __tcfapi?: Function }).__tcfapi?.(
						'ping',
						2,
						(data: { apiVersion: string }) => {
							resolve(data);
						}
					);
				}
			);

			expect(result.apiVersion).toBe('2.3');
		});

		test('should handle getTCData command', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const result = await createDeferredPromise<{
				gdprApplies: boolean;
				cmpStatus: string;
			}>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'getTCData',
					2,
					(data: { gdprApplies: boolean; cmpStatus: string }) => {
						resolve(data);
					}
				);
			});

			expect(result).toBeDefined();
			expect(typeof result.gdprApplies).toBe('boolean');
		});

		test('should handle addEventListener command', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const result = await createDeferredPromise<{ listenerId: number }>(
				(resolve) => {
					(window as { __tcfapi?: Function }).__tcfapi?.(
						'addEventListener',
						2,
						(data: { listenerId: number }) => {
							resolve(data);
						}
					);
				}
			);

			expect(result.listenerId).toBeDefined();
			expect(typeof result.listenerId).toBe('number');
		});

		test('should handle getVendorList command', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const result = await createDeferredPromise<{
				purposes: Record<number, unknown>;
			}>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'getVendorList',
					2,
					(data: { purposes: Record<number, unknown> }) => {
						resolve(data);
					}
				);
			});

			expect(result.purposes).toBeDefined();
		});

		test('should return false for unknown commands', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const result = await createDeferredPromise<{
				data: unknown;
				success: boolean;
			}>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'unknownCommand',
					2,
					(data: unknown, success: boolean) => {
						resolve({ data, success });
					}
				);
			});

			expect(result.success).toBe(false);
		});
	});
});
