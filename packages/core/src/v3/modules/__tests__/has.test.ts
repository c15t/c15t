/**
 * Tests for the IAB-aware has() in v3/modules/has.ts.
 *
 * Coverage:
 * 1. Re-exported `has()` still behaves like v2 (simple, AND, OR, NOT, nested).
 * 2. `hasIABConsent` implements v2's vendor+purpose+LI+special-feature logic.
 * 3. `evaluateConsent` picks IAB when model==='iab' AND target has IAB fields,
 *    otherwise falls back to category-based has.
 */
import { describe, expect, test } from 'vitest';
import { createConsentKernel } from '../../index';
import type { ConsentSnapshot, KernelIABState } from '../../types';
import { evaluateConsent, has, hasIABConsent } from '../has';

function iabSlice(patch: Partial<KernelIABState> = {}): KernelIABState {
	return {
		enabled: true,
		gvl: null,
		customVendors: [],
		cmpId: null,
		vendorConsents: {},
		vendorLegitimateInterests: {},
		purposeConsents: {},
		purposeLegitimateInterests: {},
		specialFeatureOptIns: {},
		tcString: null,
		...patch,
	};
}

describe('has() — v2 semantics preserved', () => {
	const consents = {
		necessary: true,
		functionality: false,
		marketing: true,
		measurement: true,
		experience: false,
	};

	test('simple category', () => {
		expect(has('measurement', consents)).toBe(true);
		expect(has('functionality', consents)).toBe(false);
	});

	test('AND / OR / NOT', () => {
		expect(has({ and: ['necessary', 'measurement'] }, consents)).toBe(true);
		expect(has({ and: ['necessary', 'functionality'] }, consents)).toBe(false);
		expect(has({ or: ['functionality', 'marketing'] }, consents)).toBe(true);
		expect(has({ not: 'functionality' }, consents)).toBe(true);
	});

	test('nested', () => {
		expect(
			has(
				{
					and: [
						'necessary',
						{ or: ['measurement', 'functionality'] },
						{ not: 'experience' },
					],
				},
				consents
			)
		).toBe(true);
	});
});

describe('hasIABConsent — v2 parity', () => {
	test('vendor consent required when vendorId is set', () => {
		expect(
			hasIABConsent(
				{ vendorId: 755 },
				iabSlice({ vendorConsents: { '755': true } }).valueOf()
			)
		).toBe(true);
		expect(
			hasIABConsent(
				{ vendorId: 755 },
				iabSlice({ vendorConsents: { '755': false } }).valueOf()
			)
		).toBe(false);
	});

	test('all iabPurposes must be granted', () => {
		const iab = iabSlice({ purposeConsents: { 1: true, 2: true, 3: false } });
		expect(hasIABConsent({ iabPurposes: [1, 2] }, iab)).toBe(true);
		expect(hasIABConsent({ iabPurposes: [1, 2, 3] }, iab)).toBe(false);
	});

	test('all iabLegIntPurposes must be granted', () => {
		const iab = iabSlice({
			purposeLegitimateInterests: { 2: true, 7: true },
		});
		expect(hasIABConsent({ iabLegIntPurposes: [2, 7] }, iab)).toBe(true);
		expect(hasIABConsent({ iabLegIntPurposes: [2, 9] }, iab)).toBe(false);
	});

	test('all iabSpecialFeatures must be opted in', () => {
		const iab = iabSlice({ specialFeatureOptIns: { 1: true, 2: false } });
		expect(hasIABConsent({ iabSpecialFeatures: [1] }, iab)).toBe(true);
		expect(hasIABConsent({ iabSpecialFeatures: [1, 2] }, iab)).toBe(false);
	});

	test('multiple fields must ALL pass (AND across fields)', () => {
		const iab = iabSlice({
			vendorConsents: { '755': true },
			purposeConsents: { 1: true, 2: true },
		});
		expect(hasIABConsent({ vendorId: 755, iabPurposes: [1, 2] }, iab)).toBe(
			true
		);
		expect(hasIABConsent({ vendorId: 755, iabPurposes: [1, 3] }, iab)).toBe(
			false
		);
	});

	test('empty IAB target is vacuously true', () => {
		expect(hasIABConsent({}, iabSlice())).toBe(true);
	});
});

describe('evaluateConsent — dispatch between IAB and category paths', () => {
	function snapshotFor(
		options: {
			model?: ConsentSnapshot['model'];
			iab?: Partial<KernelIABState>;
			consents?: Partial<ConsentSnapshot['consents']>;
		} = {}
	): ConsentSnapshot {
		const kernel = createConsentKernel({
			initialConsents: {
				necessary: true,
				functionality: false,
				marketing: false,
				measurement: false,
				experience: false,
				...options.consents,
			},
			initialIab: options.iab,
		});
		// Force a specific model for the test — kernel usually derives this
		// from jurisdiction, but here we want deterministic dispatch tests.
		const snap = kernel.getSnapshot();
		return {
			...snap,
			model: options.model ?? snap.model,
		};
	}

	test('category path: no IAB metadata → uses has(category)', () => {
		const snap = snapshotFor({ consents: { marketing: true } });
		expect(evaluateConsent({ category: 'marketing' }, snap)).toBe(true);
		expect(evaluateConsent({ category: 'functionality' }, snap)).toBe(false);
	});

	test('IAB path: model==="iab" + vendorId → IAB evaluation', () => {
		const snap = snapshotFor({
			model: 'iab',
			iab: { vendorConsents: { '755': true } },
		});
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 755 }, snap)
		).toBe(true);
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 500 }, snap)
		).toBe(false);
	});

	test('model!=="iab" + IAB fields → category path still wins', () => {
		const snap = snapshotFor({
			model: 'opt-in',
			iab: { vendorConsents: { '755': true } },
			consents: { marketing: true },
		});
		// Not in iab mode → vendorId is ignored, marketing check wins.
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 999 }, snap)
		).toBe(true);
	});

	test('model==="iab" but iab slice is null → denies access', () => {
		const snap = snapshotFor({ model: 'iab' });
		// Construction above creates an iab slice via initialIab, but
		// overriding model alone leaves iab null by default.
		const withoutIab: ConsentSnapshot = { ...snap, iab: null };
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 755 }, withoutIab)
		).toBe(false);
	});
});
