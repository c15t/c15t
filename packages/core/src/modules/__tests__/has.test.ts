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

import { choiceRecords } from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../index';
import type {
	ConsentSnapshot,
	KernelIABAuthority,
	KernelIABState,
} from '../../types';
import { evaluateConsent, has, hasIABConsent } from '../has';
import type { IABConsentInputs } from '../has';

const iabSlice = function iabSlice(
	patch: Partial<KernelIABState> = {}
): KernelIABState {
	return {
		authority: null,
		cmpId: null,
		customVendors: [],
		enabled: true,
		gvl: null,
		purposeConsents: {},
		purposeLegitimateInterests: {},
		specialFeatureOptIns: {},
		tcString: null,
		vendorConsents: {},
		vendorLegitimateInterests: {},
		...patch,
	};
};

describe('has() — v2 semantics preserved', () => {
	const consents = {
		experience: false,
		functionality: false,
		marketing: true,
		measurement: true,
		necessary: true,
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
				iabSlice({ vendorConsents: { '755': true } })
			)
		).toBe(true);
		expect(
			hasIABConsent(
				{ vendorId: 755 },
				iabSlice({ vendorConsents: { '755': false } })
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
			purposeConsents: { 1: true, 2: true },
			vendorConsents: { '755': true },
		});
		expect(hasIABConsent({ iabPurposes: [1, 2], vendorId: 755 }, iab)).toBe(
			true
		);
		expect(hasIABConsent({ iabPurposes: [1, 3], vendorId: 755 }, iab)).toBe(
			false
		);
	});

	test('empty IAB target is vacuously true', () => {
		expect(hasIABConsent({}, iabSlice())).toBe(true);
	});
});

describe('hasIABConsent — publisher restrictions', () => {
	/** Vendor 755 grants every signal; purposes 2 and 7 are flexible. */
	const granted = (
		publisherRestrictions: KernelIABAuthority['publisherRestrictions']
	): IABConsentInputs => ({
		...iabSlice({
			purposeConsents: { 1: true, 2: true, 3: true, 7: true },
			purposeLegitimateInterests: { 2: true, 7: true },
			vendorConsents: { '755': true },
			vendorLegitimateInterests: { '755': true },
		}),
		publisherRestrictions,
	});
	const flexible = { flexiblePurposes: [2, 7] };

	test('purpose prohibited (type 0) denies on either legal basis', () => {
		const iab = granted([
			{ purposeId: 2, restrictionType: 0, vendorIds: [755] },
		]);
		expect(
			hasIABConsent({ iabPurposes: [2], vendorId: 755 }, iab, flexible)
		).toBe(false);
		expect(
			hasIABConsent({ iabLegIntPurposes: [2], vendorId: 755 }, iab, flexible)
		).toBe(false);
		// Other purposes and other vendors are unaffected.
		expect(
			hasIABConsent({ iabPurposes: [7], vendorId: 755 }, iab, flexible)
		).toBe(true);
		expect(
			hasIABConsent(
				{ iabPurposes: [2], vendorId: 1 },
				{ ...iab, vendorConsents: { '1': true } },
				flexible
			)
		).toBe(true);
	});

	test('consent required (type 1): legitimate interest no longer satisfies', () => {
		const target = { iabLegIntPurposes: [7], vendorId: 755 };
		const restrictions = [
			{ purposeId: 7, restrictionType: 1 as const, vendorIds: [755] },
		];
		expect(hasIABConsent(target, granted(restrictions), flexible)).toBe(true);
		expect(
			hasIABConsent(
				target,
				{ ...granted(restrictions), purposeConsents: { 7: false } },
				flexible
			)
		).toBe(false);
		expect(
			hasIABConsent(
				target,
				{ ...granted(restrictions), vendorConsents: {} },
				flexible
			)
		).toBe(false);
		// Without flexibility the vendor has no permitted legal basis.
		expect(hasIABConsent(target, granted(restrictions), {})).toBe(false);
	});

	test('legitimate interest required (type 2): consent no longer satisfies', () => {
		const target = { iabPurposes: [2], vendorId: 755 };
		const restrictions = [
			{ purposeId: 2, restrictionType: 2 as const, vendorIds: [755] },
		];
		expect(hasIABConsent(target, granted(restrictions), flexible)).toBe(true);
		expect(
			hasIABConsent(
				target,
				{ ...granted(restrictions), purposeLegitimateInterests: {} },
				flexible
			)
		).toBe(false);
		expect(
			hasIABConsent(
				target,
				{ ...granted(restrictions), vendorLegitimateInterests: {} },
				flexible
			)
		).toBe(false);
		expect(hasIABConsent(target, granted(restrictions), {})).toBe(false);
	});

	test('legitimate interest is never allowed for consent-only purposes', () => {
		const iab = granted([
			{ purposeId: 3, restrictionType: 2, vendorIds: [755] },
		]);
		expect(
			hasIABConsent({ iabPurposes: [3], vendorId: 755 }, iab, {
				flexiblePurposes: [3],
			})
		).toBe(false);
	});

	test('a restriction matching the declared basis changes nothing', () => {
		const iab = granted([
			{ purposeId: 2, restrictionType: 1, vendorIds: [755] },
			{ purposeId: 7, restrictionType: 2, vendorIds: [755] },
		]);
		expect(
			hasIABConsent(
				{ iabLegIntPurposes: [7], iabPurposes: [2], vendorId: 755 },
				iab
			)
		).toBe(true);
	});

	test.each(['0755', '755.0', ' 755', '+755', '7.55e2'])(
		'custom vendor id %j is not registered vendor 755',
		(vendorId) => {
			const iab = {
				...granted([{ purposeId: 2, restrictionType: 0, vendorIds: [755] }]),
				vendorConsents: { [vendorId]: true },
			};
			expect(hasIABConsent({ iabPurposes: [2], vendorId }, iab)).toBe(true);
		}
	);

	test('the canonical string id still matches the registered vendor', () => {
		const iab = granted([
			{ purposeId: 2, restrictionType: 0, vendorIds: [755] },
		]);
		expect(
			hasIABConsent({ iabPurposes: [2], vendorId: '755' }, iab, flexible)
		).toBe(false);
	});

	test('restrictions need a vendorId to apply', () => {
		const iab = granted([
			{ purposeId: 2, restrictionType: 0, vendorIds: [755] },
		]);
		expect(hasIABConsent({ iabPurposes: [2] }, iab)).toBe(true);
	});
});

describe('evaluateConsent — dispatch between IAB and category paths', () => {
	const snapshotFor = function snapshotFor(
		options: {
			model?: ConsentSnapshot['model'];
			iab?: Partial<KernelIABState>;
			consents?: Partial<ConsentSnapshot['effectivePermissions']>;
		} = {}
	): ConsentSnapshot {
		const kernel = createConsentKernel({
			initialIab: options.iab,
			initialRecords: choiceRecords({
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				...options.consents,
			}),
		});
		// Force a specific model for the test — kernel usually derives this
		// from jurisdiction, but here we want deterministic dispatch tests.
		const snap = kernel.getSnapshot();
		return {
			...snap,
			model: options.model ?? snap.model,
		};
	};

	test('category path: no IAB metadata → uses has(category)', () => {
		const snap = snapshotFor({ consents: { marketing: true } });
		expect(evaluateConsent({ category: 'marketing' }, snap)).toBe(true);
		expect(evaluateConsent({ category: 'functionality' }, snap)).toBe(false);
	});

	test('IAB draft maps cannot authorize a target', () => {
		const snap = snapshotFor({
			iab: { vendorConsents: { '755': true } },
			model: 'iab',
		});
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 755 }, snap)
		).toBe(false);
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 500 }, snap)
		).toBe(false);
	});

	test('IAB targets require IAB authority even outside IAB mode', () => {
		const snap = snapshotFor({
			consents: { marketing: true },
			iab: { vendorConsents: { '755': true } },
			model: 'opt-in',
		});
		// Not in iab mode → vendorId is ignored, marketing check wins.
		expect(
			evaluateConsent({ category: 'marketing', vendorId: 999 }, snap)
		).toBe(false);
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
