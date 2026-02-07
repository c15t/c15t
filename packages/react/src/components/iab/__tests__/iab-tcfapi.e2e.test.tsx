/**
 * IAB __tcfapi E2E Tests
 *
 * Browser-based tests for complete CMP API compliance.
 */

import { userEvent } from '@vitest/browser/context';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { IABConsentBanner } from '~/components/iab-consent-banner';
import { IABConsentDialog } from '~/components/iab-consent-dialog';
import {
	ConsentManagerProvider,
	clearConsentManagerCache,
} from '~/providers/consent-manager-provider';
import {
	addCMPEventListener,
	clearConsentState,
	defaultIABOptions,
	getCMPPingData,
	getCMPTCData,
	removeCMPEventListener,
	tcfApiPromise,
	waitForCMP,
	waitForElement,
} from './e2e-setup';

describe('__tcfapi E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentManagerCache();
	});

	describe('ping Command', () => {
		test('should return cmpLoaded=true after CMP ready', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');

			// Wait for CMP to be ready
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(pingData.cmpLoaded).toBe(true);
		});

		test('should return correct gdprApplies value', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(typeof pingData.gdprApplies).toBe('boolean');
		});

		test('should return cmpId matching configured ID', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(pingData.cmpId).toBe(160);
		});

		test('should return apiVersion="2.3"', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(pingData.apiVersion).toBe('2.3');
		});

		test('should return tcfPolicyVersion=5', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(pingData.tcfPolicyVersion).toBe(5);
		});

		test('should return cmpStatus="loaded"', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const pingData = await getCMPPingData();
			expect(pingData.cmpStatus).toBe('loaded');
		});
	});

	describe('addEventListener Command', () => {
		test('should invoke callback immediately on registration', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();
			expect(eventData).toBeDefined();
			expect(eventData.eventStatus).toBeDefined();
		});

		test('should return unique listenerId', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const event1 = await addCMPEventListener();
			const event2 = await addCMPEventListener();

			expect(event1.listenerId).toBeDefined();
			expect(event2.listenerId).toBeDefined();
			expect(event1.listenerId).not.toBe(event2.listenerId);
		});

		test('should fire eventStatus="tcloaded" initially', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();
			expect(eventData.eventStatus).toBe('tcloaded');
		});
	});

	describe('removeEventListener Command', () => {
		test('should remove listener by listenerId', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const eventData = await addCMPEventListener();
			const success = await removeCMPEventListener(eventData.listenerId);
			expect(success).toBe(true);
		});

		test('should return false for invalid listenerId', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const success = await removeCMPEventListener(999999);
			expect(success).toBe(false);
		});
	});

	describe('getTCData Command', () => {
		test('should return complete TCData object', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();

			expect(tcData).toBeDefined();
			expect(tcData).toHaveProperty('tcString');
			expect(tcData).toHaveProperty('gdprApplies');
			expect(tcData).toHaveProperty('cmpStatus');
			expect(tcData).toHaveProperty('isServiceSpecific');
			expect(tcData).toHaveProperty('publisherCC');
			expect(tcData).toHaveProperty('purpose');
			expect(tcData).toHaveProperty('vendor');
		});

		test('should return isServiceSpecific=true', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();
			expect(tcData.isServiceSpecific).toBe(true);
		});

		test('should have purpose.consents and purpose.legitimateInterests', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();

			expect(tcData.purpose).toBeDefined();
			expect(tcData.purpose.consents).toBeDefined();
			expect(tcData.purpose.legitimateInterests).toBeDefined();
		});

		test('should have vendor.consents and vendor.legitimateInterests', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();

			expect(tcData.vendor).toBeDefined();
			expect(tcData.vendor.consents).toBeDefined();
			expect(tcData.vendor.legitimateInterests).toBeDefined();
		});

		test('should have specialFeatureOptins', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();
			expect(tcData.specialFeatureOptins).toBeDefined();
		});

		test('should have publisher object', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();

			expect(tcData.publisher).toBeDefined();
			expect(tcData.publisher.consents).toBeDefined();
			expect(tcData.publisher.legitimateInterests).toBeDefined();
		});
	});

	describe('getVendorList Command', () => {
		test('should return complete GVL', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				purposes: Record<number, unknown>;
				vendors: Record<number, unknown>;
			}>('getVendorList', 2);

			expect(gvl).toBeDefined();
			expect(gvl.purposes).toBeDefined();
			expect(gvl.vendors).toBeDefined();
		});

		test('GVL should contain all 11 purposes', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				purposes: Record<number, unknown>;
			}>('getVendorList', 2);

			const purposeIds = Object.keys(gvl.purposes).map(Number);
			expect(purposeIds).toContain(1);
			expect(purposeIds).toContain(11);
			expect(purposeIds.length).toBe(11);
		});
	});

	describe('getInAppTCData Command (Mobile Alias)', () => {
		test('should return same data as getTCData', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-banner-card"]');
			await waitForCMP();

			const tcData = await getCMPTCData();
			const inAppData = await tcfApiPromise<{
				gdprApplies: boolean;
				cmpStatus: string;
			}>('getInAppTCData', 2);

			expect(inAppData.gdprApplies).toBe(tcData.gdprApplies);
			expect(inAppData.cmpStatus).toBe(tcData.cmpStatus);
		});
	});
});
