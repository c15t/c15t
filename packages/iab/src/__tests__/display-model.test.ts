import { MINIMAL_GVL } from '@c15t/conformance/fixtures/gvl';
import type { GlobalVendorList } from '@c15t/core';
import { describe, expect, test } from 'vitest';

import { iabDisplayTestId, resolveIABDialogDisplayModel } from '../headless';
import type { HeadlessIABDisplayStackRow } from '../headless';
import { completeGVL } from './fixtures/gvl-sample';

/**
 * The conformance fixture is the same GVL the cross-framework drivers
 * mount, so a disagreement between this model and a rendered surface
 * shows up here first.
 */
const conformanceGVL = MINIMAL_GVL as unknown as GlobalVendorList;

describe('IAB dialog display model', () => {
	test('orders the conformance fixture as purposes, stacks, then special features', () => {
		const model = resolveIABDialogDisplayModel({ gvl: conformanceGVL });

		expect(model.isReady).toBe(true);
		expect(model.isLoading).toBe(false);
		expect(model.consentRows.map((row) => [row.kind, row.testId])).toEqual([
			['purpose', 'purpose-item-1'],
			['purpose', 'purpose-item-2'],
			['special-feature', 'special-feature-item-1'],
		]);
	});

	test('puts special purposes and features in the locked essential section', () => {
		const model = resolveIABDialogDisplayModel({ gvl: conformanceGVL });

		expect(model.essentialRows.map((row) => row.testId)).toEqual([
			'special-purpose-item-1',
			'feature-item-1',
		]);
		expect(model.essentialRows.every((row) => row.locked)).toBe(true);
		expect(model.essentialRows.every((row) => row.toggle === 'none')).toBe(
			true
		);
		// One vendor declares both, so the section names one partner.
		expect(model.essentialPartnerCount).toBe(1);
	});

	test('gives every row a test-id no other row shares', () => {
		const model = resolveIABDialogDisplayModel({ gvl: completeGVL });
		const testIds = [
			...model.consentRows.flatMap((row) =>
				row.kind === 'stack'
					? [row.testId, ...row.purposes.map((purpose) => purpose.testId)]
					: [row.testId]
			),
			...model.essentialRows.map((row) => row.testId),
		];

		expect(new Set(testIds).size).toBe(testIds.length);
	});

	test('lists each purpose once — either standalone or inside one stack', () => {
		const model = resolveIABDialogDisplayModel({ gvl: completeGVL });
		const purposeIds = model.consentRows.flatMap((row) =>
			row.kind === 'stack'
				? row.purposes.map((purpose) => purpose.id)
				: row.kind === 'purpose'
					? [row.id]
					: []
		);

		expect(new Set(purposeIds).size).toBe(purposeIds.length);
		expect(purposeIds).toHaveLength(model.data.purposes.length);
	});

	test('counts the whole GVL on the purposes tab, not the rendered rows', () => {
		const model = resolveIABDialogDisplayModel({ gvl: completeGVL });

		expect(model.purposeTabCount).toBe(
			model.data.purposes.length +
				model.data.specialPurposes.length +
				model.data.specialFeatures.length +
				model.data.features.length
		);
		expect(model.vendorTabCount).toBe(model.data.totalVendors);
		// A stack absorbs purposes without adding to the count.
		expect(model.consentRows.length).toBeLessThan(model.purposeTabCount);
	});

	test('routes each row kind to the consent map that owns it', () => {
		const model = resolveIABDialogDisplayModel({ gvl: completeGVL });
		const toggles = new Map(
			model.consentRows
				.filter((row) => row.kind !== 'stack')
				.map((row) => [row.kind, row.toggle])
		);

		expect(toggles.get('purpose')).toBe('purpose');
		expect(toggles.get('special-feature')).toBe('special-feature');
	});

	test('carries a stack’s purposes as rows of their own', () => {
		const model = resolveIABDialogDisplayModel({ gvl: completeGVL });
		const stack = model.consentRows.find(
			(row): row is HeadlessIABDisplayStackRow => row.kind === 'stack'
		);

		expect(stack).toBeDefined();
		expect(stack?.purposes.length).toBeGreaterThan(1);
		expect(stack?.purposes.every((purpose) => purpose.kind === 'purpose')).toBe(
			true
		);
	});

	test('reports loading with no GVL and renders nothing', () => {
		const model = resolveIABDialogDisplayModel(null);

		expect(model.isReady).toBe(false);
		expect(model.isLoading).toBe(true);
		expect(model.consentRows).toHaveLength(0);
		expect(model.essentialRows).toHaveLength(0);
		expect(model.purposeTabCount).toBe(0);
		expect(model.vendorTabCount).toBe(0);
	});

	test('namespaces test-ids by kind so one numeric id cannot collide', () => {
		expect(iabDisplayTestId('purpose', 1)).toBe('purpose-item-1');
		expect(iabDisplayTestId('stack', 1)).toBe('stack-item-1');
		expect(iabDisplayTestId('special-feature', 1)).toBe(
			'special-feature-item-1'
		);
		expect(iabDisplayTestId('special-purpose', 1)).toBe(
			'special-purpose-item-1'
		);
		expect(iabDisplayTestId('feature', 1)).toBe('feature-item-1');
	});
});
