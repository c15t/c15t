/**
 * IAB Stub E2E Tests
 *
 * Browser-based tests for IAB stub and queue behavior.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { IABConsentBanner } from '~/v3/components/iab-consent-banner';
import { IABConsentDialog } from '~/v3/components/iab-consent-dialog';
import {
	clearConsentState,
	defaultIABOptions,
	waitForCMP,
	waitForElement,
} from './e2e-setup';

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
			await new Promise<void>((resolve) => {
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
			const result = await new Promise<boolean>((resolve) => {
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

			const pingData = await new Promise<{ cmpLoaded: boolean }>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'ping',
					2,
					(data: { cmpLoaded: boolean }) => {
						resolve(data);
					}
				);
			});

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

			const pingData = await new Promise<{ cmpStatus: string }>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'ping',
					2,
					(data: { cmpStatus: string }) => {
						resolve(data);
					}
				);
			});

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
			const result = await new Promise<{ tcString: string }>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'getTCData',
					2,
					(data: { tcString: string }) => {
						resolve(data);
					}
				);
			});

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

			const result = await new Promise<{ apiVersion: string }>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'ping',
					2,
					(data: { apiVersion: string }) => {
						resolve(data);
					}
				);
			});

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

			const result = await new Promise<{
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

			const result = await new Promise<{ listenerId: number }>((resolve) => {
				(window as { __tcfapi?: Function }).__tcfapi?.(
					'addEventListener',
					2,
					(data: { listenerId: number }) => {
						resolve(data);
					}
				);
			});

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

			const result = await new Promise<{
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

			const result = await new Promise<{
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
