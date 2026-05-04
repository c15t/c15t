/**
 * IAB GVL E2E Tests
 *
 * Browser-based tests for GVL loading and content validation.
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
	mockGVL,
	tcfApiPromise,
	waitForCMP,
	waitForElement,
} from './e2e-setup';

describe('IAB GVL E2E Tests', () => {
	beforeEach(() => {
		clearConsentState();
		vi.clearAllMocks();
		clearConsentRuntimeCache();
	});

	describe('GVL Loading', () => {
		test('should fetch GVL successfully', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// GVL should be available via getVendorList
			const gvl = await tcfApiPromise<{
				purposes: Record<number, unknown>;
				vendors: Record<number, unknown>;
			}>('getVendorList', 2);

			expect(gvl).toBeDefined();
			expect(gvl.purposes).toBeDefined();
			expect(gvl.vendors).toBeDefined();
		});

		test('should display vendor count from GVL', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			// Banner should show vendor count
			const bannerText =
				document.querySelector('[data-testid="iab-consent-banner-header"]')
					?.textContent || '';

			// Should contain a number
			expect(bannerText).toMatch(/\d+/);
		});
	});

	describe('GVL Content - Purposes', () => {
		test('should have all 11 purposes', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				purposes: Record<number, { id: number; name: string }>;
			}>('getVendorList', 2);

			const purposeIds = Object.keys(gvl.purposes).map(Number);

			expect(purposeIds).toContain(1);
			expect(purposeIds).toContain(2);
			expect(purposeIds).toContain(3);
			expect(purposeIds).toContain(4);
			expect(purposeIds).toContain(5);
			expect(purposeIds).toContain(6);
			expect(purposeIds).toContain(7);
			expect(purposeIds).toContain(8);
			expect(purposeIds).toContain(9);
			expect(purposeIds).toContain(10);
			expect(purposeIds).toContain(11);
			expect(purposeIds.length).toBe(11);
		});
	});

	describe('GVL Content - Special Purposes', () => {
		test('should have special purposes 1-2', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				specialPurposes: Record<number, { id: number; name: string }>;
			}>('getVendorList', 2);

			const specialPurposeIds = Object.keys(gvl.specialPurposes).map(Number);

			expect(specialPurposeIds).toContain(1);
			expect(specialPurposeIds).toContain(2);
		});
	});

	describe('GVL Content - Features', () => {
		test('should have features 1-3', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				features: Record<number, { id: number; name: string }>;
			}>('getVendorList', 2);

			const featureIds = Object.keys(gvl.features).map(Number);

			expect(featureIds).toContain(1);
			expect(featureIds).toContain(2);
			expect(featureIds).toContain(3);
		});
	});

	describe('GVL Content - Special Features', () => {
		test('should have special features 1-2', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				specialFeatures: Record<number, { id: number; name: string }>;
			}>('getVendorList', 2);

			const specialFeatureIds = Object.keys(gvl.specialFeatures).map(Number);

			expect(specialFeatureIds).toContain(1);
			expect(specialFeatureIds).toContain(2);
		});
	});

	describe('GVL Content - Stacks', () => {
		test('should have stacks for UI grouping', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				stacks: Record<
					number,
					{ id: number; name: string; purposes: number[] }
				>;
			}>('getVendorList', 2);

			expect(gvl.stacks).toBeDefined();
			expect(Object.keys(gvl.stacks).length).toBeGreaterThan(0);
		});
	});

	describe('GVL Content - Vendors', () => {
		test('should have vendors with required fields', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				vendors: Record<
					number,
					{
						id: number;
						name: string;
						purposes: number[];
						legIntPurposes: number[];
					}
				>;
			}>('getVendorList', 2);

			expect(Object.keys(gvl.vendors).length).toBeGreaterThan(0);

			// Check first vendor has required fields
			const firstVendor = Object.values(gvl.vendors)[0];
			expect(firstVendor).toHaveProperty('id');
			expect(firstVendor).toHaveProperty('name');
			expect(firstVendor).toHaveProperty('purposes');
		});
	});

	describe('GVL Version', () => {
		test('should have vendorListVersion', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				vendorListVersion: number;
			}>('getVendorList', 2);

			expect(gvl.vendorListVersion).toBeDefined();
			expect(typeof gvl.vendorListVersion).toBe('number');
		});

		test('should have tcfPolicyVersion=5', async () => {
			render(
				<ConsentManagerProvider options={defaultIABOptions}>
					<IABConsentBanner />
					<IABConsentDialog />
				</ConsentManagerProvider>
			);

			await waitForElement('[data-testid="iab-consent-banner-card"]');
			await waitForCMP();

			const gvl = await tcfApiPromise<{
				tcfPolicyVersion: number;
			}>('getVendorList', 2);

			expect(gvl.tcfPolicyVersion).toBe(5);
		});
	});
});
