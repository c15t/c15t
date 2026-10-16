/**
 * Rules the screen models enforce for every renderer, written out one at a
 * time so a failure names the rule rather than a fixture diff.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { ConsentIabDisplayModel } from '../../components/iab-display-model';
import { resolveConsentCopy } from '../../components/internal/copy';
import { resolveIabCopy } from '../../components/internal/iab-copy';
import {
	applyIabToggle,
	buildFirstLayer,
	buildIabFirstLayer,
	buildIabPurposeDetail,
	buildIabPurposes,
	buildIabVendorDetail,
	buildIabVendors,
	buildPreferences,
	categoryFromRowId,
	categoryRowId,
	decideConsentIabSelection,
	seedConsentIabSelection,
} from '../index';

const model = JSON.parse(
	readFileSync(
		resolve(
			dirname(fileURLToPath(import.meta.url)),
			'../../../../../native/ui/inputs/iab-model.json'
		),
		'utf8'
	)
) as ConsentIabDisplayModel;

const copy = resolveConsentCopy(null);
const iabCopy = resolveIabCopy();
const seeded = seedConsentIabSelection(model);

describe('standard first layer', () => {
	test('gives Accept all and Reject all the same emphasis', () => {
		const screen = buildFirstLayer({ copy, notice: false });
		const accept = screen.actions.find((action) => action.id === 'acceptAll');
		const reject = screen.actions.find((action) => action.id === 'rejectAll');

		expect(accept?.emphasis).toBe('parity');
		expect(reject?.emphasis).toBe(accept?.emphasis);
	});

	test('offers only an acknowledgement in notice mode', () => {
		const screen = buildFirstLayer({ copy, notice: true });

		expect(screen.actions.map((action) => action.id)).toEqual([
			'acknowledge',
			'manage',
		]);
	});
});

describe('standard preferences', () => {
	test('drops the branding footnote when asked', () => {
		const rows = [
			{
				description: 'd',
				disabled: true,
				key: 'necessary' as const,
				label: 'Necessary',
				value: true,
			},
		];

		expect(buildPreferences({ copy, rows }).branding).toBe(copy.securedBy);
		expect(
			buildPreferences({ copy, hideBranding: true, rows }).branding
		).toBeUndefined();
	});

	test('round-trips category row ids', () => {
		expect(categoryFromRowId(categoryRowId('marketing'))).toBe('marketing');
		expect(categoryFromRowId('category.unknown')).toBeNull();
		expect(categoryFromRowId('purpose.1')).toBeNull();
	});
});

describe('applyIabToggle', () => {
	test('ignores a purpose no partner holds on consent', () => {
		expect(applyIabToggle(model, seeded, 'purpose.7', true)).toBe(seeded);
	});

	test('sets a purpose with a consent basis, including one inside a stack', () => {
		const next = applyIabToggle(model, seeded, 'purpose.3', true);

		expect(next.purposeConsents[3]).toBe(true);
		expect(next.purposeConsents[4]).toBe(false);
	});

	test('moves only the consent-basis members of a stack', () => {
		const on = applyIabToggle(model, seeded, 'stack.42', true);

		expect(on.purposeConsents).toMatchObject({ 3: true, 4: true, 7: false });

		const off = applyIabToggle(model, on, 'stack.42', false);

		expect(off.purposeConsents).toMatchObject({ 3: false, 4: false });
	});

	test('records a special feature opt-in', () => {
		expect(
			applyIabToggle(model, seeded, 'specialFeature.1', true)
				.specialFeatureOptIns[1]
		).toBe(true);
	});

	test('records partner consent and a legitimate interest objection', () => {
		const consented = applyIabToggle(model, seeded, 'vendor.755.consent', true);
		const objected = applyIabToggle(
			model,
			consented,
			'vendor.755.legitimateInterest',
			false
		);

		expect(objected.vendorConsents['755']).toBe(true);
		expect(objected.vendorLegitimateInterests['755']).toBe(false);
	});

	test.each([
		'stack.999',
		'purpose.999',
		'purpose.x',
		'specialFeature.999',
		'vendor..consent',
		'vendor.999.consent',
		'vendor.999.legitimateInterest',
		'vendor.755',
		'category.marketing',
		'',
	])('leaves the draft alone for %j', (rowId) => {
		expect(applyIabToggle(model, seeded, rowId, true)).toBe(seeded);
	});

	test('ignores an objection for a vendor with no legitimate-interest purposes', () => {
		const consentOnly = {
			...model,
			vendors: model.vendors.map((vendor) => ({
				...vendor,
				legIntPurposes: [],
			})),
		};
		expect(
			applyIabToggle(
				consentOnly,
				seeded,
				'vendor.755.legitimateInterest',
				false
			)
		).toBe(seeded);
	});
});

describe('decideConsentIabSelection', () => {
	test('moves every decision, including objections, one way', () => {
		const rejected = decideConsentIabSelection(model, false);

		expect(Object.values(rejected.purposeConsents)).not.toContain(true);
		expect(Object.values(rejected.vendorLegitimateInterests)).not.toContain(
			true
		);
		expect(
			Object.values(decideConsentIabSelection(model, true).vendorConsents)
		).not.toContain(false);
	});
});

describe('IAB screens', () => {
	test('locks stacks whose members have no consent basis', () => {
		const withoutConsent = {
			...model,
			consentRows: model.consentRows.map((row) =>
				row.kind === 'stack'
					? {
							...row,
							purposes: row.purposes.map((purpose) => ({
								...purpose,
								hasConsentBasis: false,
							})),
						}
					: row
			),
		};
		const stack = buildIabPurposes({
			copy: iabCopy,
			model: withoutConsent,
			selection: seeded,
		})
			.sections.flatMap((section) => section.rows)
			.find((row) => row.id === 'stack.42');
		expect(stack?.control).toEqual({
			disabled: true,
			kind: 'switch',
			value: false,
		});
	});
	test('first layer keeps Accept and Reject at parity and counts partners', () => {
		const screen = buildIabFirstLayer({ copy: iabCopy, model });

		expect(
			screen.actions
				.filter((action) => action.id !== 'manage')
				.map((action) => action.emphasis)
		).toEqual(['parity', 'parity']);
		expect(screen.intro).toContain(String(model.vendors.length));
	});

	test('first-layer disclosures count only partners the native list shows', () => {
		const screen = buildIabFirstLayer({
			copy: iabCopy,
			model: {
				...model,
				data: { ...model.data, totalVendors: model.vendors.length + 2 },
				vendorTabCount: model.vendors.length + 2,
			},
		});

		expect(screen.intro).toContain(String(model.vendors.length));
		expect(
			screen.sections.find((section) => section.id === 'partners')?.rows[0]
				?.title
		).toBe(`${model.vendors.length} partners`);
	});

	test('a partly-on stack reads as partial and stays off', () => {
		const draft = applyIabToggle(model, seeded, 'purpose.3', true);
		const stack = buildIabPurposes({ copy: iabCopy, model, selection: draft })
			.sections.flatMap((section) => section.rows)
			.find((row) => row.id === 'stack.42');

		expect(stack?.detail).toBe(iabCopy.partiallyEnabled);
		expect(stack?.control).toMatchObject({ value: false });
	});

	test('special purposes and features carry no switch', () => {
		const screen = buildIabPurposes({
			copy: iabCopy,
			model,
			selection: seeded,
		});
		const locked = screen.sections.filter(
			(section) => section.id === 'essential' || section.id === 'features'
		);

		expect(locked.length).toBeGreaterThan(0);
		for (const section of locked) {
			for (const row of section.rows) {
				expect(row.control).toBeUndefined();
			}
		}
	});

	test('an empty search shows every partner and no empty state', () => {
		const screen = buildIabVendors({
			copy: iabCopy,
			model,
			query: '   ',
			selection: seeded,
		});

		expect(screen.empty).toBeUndefined();
		expect(screen.sections.flatMap((section) => section.rows)).toHaveLength(
			model.vendors.length
		);
	});

	test('details return null for ids the model does not carry', () => {
		expect(
			buildIabVendorDetail({
				copy: iabCopy,
				model,
				selection: seeded,
				vendorId: 'nobody',
			})
		).toBeNull();
		expect(
			buildIabPurposeDetail({
				copy: iabCopy,
				model,
				routeId: 'purpose.999',
				selection: seeded,
			})
		).toBeNull();
	});

	test('a feature detail lists examples and partners without a switch', () => {
		const screen = buildIabPurposeDetail({
			copy: iabCopy,
			model,
			routeId: 'feature.1',
			selection: seeded,
		});

		expect(screen?.sections.map((section) => section.id)).not.toContain(
			'control'
		);
		expect(screen?.sections.at(-1)?.id).toBe('partners');
	});
});
