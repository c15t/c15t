/**
 * The mobile mirror of the IAB display model, checked against the web model that
 * mirror claims to copy.
 *
 * `ConsentIabDisplayModel` in `../iab-display-model` is a hand-written mirror of
 * `HeadlessIABDialogDisplayModel`. A mirror is only worth having if something
 * holds it in place, because the failure this package is exposed to is quiet: the
 * web resolver gains a field, reorders a tab, or widens a test-id scheme, and a
 * phone keeps drawing yesterday's disclosure without a type error or a red
 * screen. So this file builds the web model from the same sample GVL the web's
 * own resolver tests use, and compares it to the data the example app and the
 * drawer tests render.
 *
 * The web model wins every argument here. If this file fails, the mirror or the
 * fixture is wrong; the assertion is the thing that was checked against
 * `packages/iab`, and weakening it to get green throws away the only signal the
 * file exists to give.
 *
 * Two things are deliberate:
 *
 * - The sample GVL and the helper come from source and from the published entry
 *   point respectively. `gvl-sample` is a fixture with no export path, so it is
 *   read where it lives rather than copied; `iabDisplayTestId` is exported from
 *   `@c15t/iab/headless`, so the ids below are produced by the web's own
 *   function and not by a mobile-side copy of its template.
 * - The fixture is imported from the example app rather than restated here,
 *   because the thing worth proving is that the data a real screen renders is the
 *   data the web would have rendered.
 */

import {
	iabDisplayTestId,
	resolveIABDialogDisplayModel,
} from '@c15t/iab/headless';
import { describe, expect, test } from 'vitest';

import { IAB_DEMO_DISPLAY_MODEL } from '../../../../../examples/react-native-bare/src/fixtures/iab-display-model';
import { completeGVL } from '../../../../iab/src/__tests__/fixtures/gvl-sample';

/** The disclosure the web builds from the same GVL the fixture was written from. */
const webModel = resolveIABDialogDisplayModel({ gvl: completeGVL });

/**
 * The mirror's own row list: `testId` plus the object it names.
 *
 * @returns Every row on the surface, stacks expanded into their members.
 */
const mobileRows = function mobileRows() {
	const rows: { id: number; kind: string; testId: string }[] = [];

	for (const row of IAB_DEMO_DISPLAY_MODEL.consentRows) {
		rows.push({ id: row.id, kind: row.kind, testId: row.testId });

		if (row.kind === 'stack') {
			for (const member of row.purposes) {
				rows.push({ id: member.id, kind: member.kind, testId: member.testId });
			}
		}
	}

	for (const row of IAB_DEMO_DISPLAY_MODEL.essentialRows) {
		rows.push({ id: row.id, kind: row.kind, testId: row.testId });
	}

	return rows;
};

describe('the mirror of the web display model', () => {
	test('names every field the web model returns, plus the one it has to add', () => {
		// `vendors` is the mirror's single documented addition: the web reads that
		// list off the live GVL and a phone has no GVL to read it from.
		expect(Object.keys(IAB_DEMO_DISPLAY_MODEL).sort()).toStrictEqual([
			...Object.keys(webModel).sort(),
			'vendors',
		]);
		expect(Object.keys(IAB_DEMO_DISPLAY_MODEL.data).sort()).toStrictEqual(
			Object.keys(webModel.data).sort()
		);
	});

	test('returns the same rows as the web, field for field and in the same order', () => {
		const { vendors: _mobileVendors, ...mobileWithoutVendors } =
			IAB_DEMO_DISPLAY_MODEL;

		expect(mobileWithoutVendors).toStrictEqual(webModel);
	});

	test('orders the two tabs the way the web orders them', () => {
		// Written out rather than derived, so a reordering upstream is a named
		// difference and not a diff of two recomputed lists. The stacks land
		// between the standalone purposes and the special features in GVL order,
		// which is not numeric order: stack 2 and 3 come before stack 1.
		expect(
			IAB_DEMO_DISPLAY_MODEL.consentRows.map((row) => row.testId)
		).toStrictEqual([
			'purpose-item-1',
			'stack-item-2',
			'stack-item-3',
			'stack-item-1',
			'stack-item-4',
			'special-feature-item-1',
			'special-feature-item-2',
		]);
		expect(
			IAB_DEMO_DISPLAY_MODEL.essentialRows.map((row) => row.testId)
		).toStrictEqual([
			'special-purpose-item-1',
			'special-purpose-item-2',
			'feature-item-1',
			'feature-item-2',
			'feature-item-3',
		]);
	});

	test('takes every test id from the web helper, not from a mobile-side template', () => {
		for (const row of mobileRows()) {
			// `kind` is narrowed by the fixture's own typing, and the helper is the
			// only place the scheme is written down.
			expect(row.testId).toBe(
				iabDisplayTestId(
					row.kind as Parameters<typeof iabDisplayTestId>[0],
					row.id
				)
			);
		}
	});

	test('keeps the four objects that share an id apart', () => {
		// Id 1 exists as a purpose, a special purpose, a feature and a special
		// feature at once, which is why the id is a prefix and a number rather than
		// a number. A mirror that built its own `purpose-item-${id}` strings from
		// the row id would pass a comparison against itself and still collide on
		// screen, so the four are named here explicitly.
		expect(new Set(mobileRows().map((row) => row.testId)).size).toBe(
			mobileRows().length
		);
		expect(IAB_DEMO_DISPLAY_MODEL.consentRows[0]?.testId).toBe(
			'purpose-item-1'
		);
		expect(
			IAB_DEMO_DISPLAY_MODEL.consentRows.find(
				(row) => row.kind === 'special-feature'
			)?.testId
		).toBe('special-feature-item-1');
		expect(IAB_DEMO_DISPLAY_MODEL.essentialRows[0]?.testId).toBe(
			'special-purpose-item-1'
		);
		expect(IAB_DEMO_DISPLAY_MODEL.essentialRows[2]?.testId).toBe(
			'feature-item-1'
		);
	});

	test('shows a stack as the purposes it absorbed, each a row in its own right', () => {
		const stacks = IAB_DEMO_DISPLAY_MODEL.consentRows.filter(
			(row) => row.kind === 'stack'
		);

		expect(stacks).toHaveLength(
			webModel.consentRows.filter((row) => row.kind === 'stack').length
		);

		for (const stack of stacks) {
			if (stack.kind !== 'stack') {
				continue;
			}

			const web = webModel.consentRows.find(
				(row) => row.kind === 'stack' && row.id === stack.id
			);

			expect(stack.purposes.map((purpose) => purpose.testId)).toStrictEqual(
				web?.kind === 'stack'
					? web.purposes.map((purpose) => purpose.testId)
					: undefined
			);
		}
	});

	test('locks the essential rows and leaves the rest movable', () => {
		expect(
			IAB_DEMO_DISPLAY_MODEL.consentRows.every(
				(row) => row.kind === 'stack' || (!row.locked && row.toggle !== 'none')
			)
		).toBe(true);
		expect(
			IAB_DEMO_DISPLAY_MODEL.essentialRows.every(
				(row) => row.locked && row.toggle === 'none'
			)
		).toBe(true);
	});

	test('puts the same counts on the tabs', () => {
		expect(IAB_DEMO_DISPLAY_MODEL.purposeTabCount).toBe(18);
		expect(IAB_DEMO_DISPLAY_MODEL.vendorTabCount).toBe(4);
		expect(IAB_DEMO_DISPLAY_MODEL.essentialPartnerCount).toBe(4);
		expect(IAB_DEMO_DISPLAY_MODEL.isReady).toBe(true);
		expect(IAB_DEMO_DISPLAY_MODEL.isLoading).toBe(false);
	});
});

describe('the partner list the mirror adds', () => {
	test('holds every GVL partner, sorted by name, as the partners tab maps it', () => {
		const entries = Object.entries(completeGVL.vendors);
		const expectedOrder = entries
			.sort(([, a], [, b]) => a.name.localeCompare(b.name))
			.map(([id]) => Number(id));

		expect(
			IAB_DEMO_DISPLAY_MODEL.vendors.map((vendor) => vendor.id)
		).toStrictEqual(expectedOrder);

		for (const vendor of IAB_DEMO_DISPLAY_MODEL.vendors) {
			const entry = completeGVL.vendors[String(vendor.id)];

			if (entry === undefined) {
				throw new Error(`partner ${String(vendor.id)} is not in the GVL`);
			}

			// Read straight off the GVL entry rather than through a second copy of
			// the web's mapping, so the two sides cannot drift in the same direction.
			expect({ ...vendor, dataDeclaration: undefined }).toStrictEqual({
				cookieMaxAgeSeconds: entry.cookieMaxAgeSeconds,
				cookieRefresh: entry.cookieRefresh,
				dataDeclaration: undefined,
				dataRetention: entry.dataRetention,
				deviceStorageDisclosureUrl: null,
				features: entry.features,
				id: Number(vendor.id),
				isCustom: false,
				legIntPurposes: entry.legIntPurposes,
				legitimateInterestUrl: null,
				name: entry.name,
				policyUrl: '',
				purposes: entry.purposes,
				specialFeatures: entry.specialFeatures,
				specialPurposes: entry.specialPurposes,
				usesCookies: entry.usesCookies,
				usesNonCookieAccess: entry.usesNonCookieAccess,
			});
		}
	});

	test('keeps the two shapes the web uses for a partner distinct', () => {
		// The partners tab maps a partner off the GVL entry, and the purposes tab
		// maps it off a purpose, which is where `usesLegitimateInterest` comes from.
		// The mirror carries both shapes because the web has both.
		for (const vendor of IAB_DEMO_DISPLAY_MODEL.vendors) {
			expect('usesLegitimateInterest' in vendor).toBe(false);
			expect(Array.isArray(vendor.dataDeclaration)).toBe(true);
		}

		const [row] = IAB_DEMO_DISPLAY_MODEL.consentRows;

		if (row === undefined || row.kind === 'stack') {
			throw new Error('expected the first row to be a purpose row');
		}

		expect(row.vendors.length).toBeGreaterThan(0);

		for (const vendor of row.vendors) {
			expect(typeof vendor.usesLegitimateInterest).toBe('boolean');
			expect('dataDeclaration' in vendor).toBe(false);
		}
	});
});
