/**
 * Checks c15t's GPP encoder against the IAB reference implementation
 * (`@iabgpp/cmpapi`, a dev dependency only).
 */

import { GppModel } from '@iabgpp/cmpapi';
import { describe, expect, test } from 'vitest';

import { encodeGPPString, encodeUSSection } from '../gpp/encoder';
import type { GPPFieldValues } from '../gpp/encoder';
import { US_SECTIONS } from '../gpp/sections';
import type { USSectionDefinition } from '../gpp/sections';

/**
 * Distinct in-range values for every field, so a field read from the wrong
 * offset shows up as a mismatch.
 */
const sampleValues = function sampleValues(
	definition: USSectionDefinition,
	seed: number
): GPPFieldValues {
	const values: GPPFieldValues = {};
	definition.core.forEach(([name, bits, count], index) => {
		if (name === 'Version') {
			values[name] = definition.version;
		} else if (count !== undefined) {
			values[name] = Array.from(
				{ length: count },
				(_, entry) => (seed + index + entry) % 3
			);
		} else if (name === 'MspaCoveredTransaction') {
			values[name] = 1 + ((seed + index) % 2);
		} else {
			values[name] = (seed + index) % Math.min(3, 2 ** bits);
		}
	});
	return values;
};

const referenceString = function referenceString(
	definition: USSectionDefinition,
	values: GPPFieldValues,
	gpc: boolean
): string {
	const model = new GppModel();
	for (const [name, value] of Object.entries(values)) {
		if (name !== 'Version') {
			model.setFieldValue(definition.prefix, name, value);
		}
	}
	if (definition.gpc) {
		model.setFieldValue(definition.prefix, 'Gpc', gpc);
	}
	return model.encode();
};

describe('GPP encoder', () => {
	test.each(US_SECTIONS.map((definition) => [definition.prefix, definition]))(
		'%s matches the IAB reference encoding',
		(_, definition) => {
			for (const seed of [0, 1, 2]) {
				const values = sampleValues(definition, seed);
				const gpc = seed % 2 === 0;
				const ours = encodeGPPString([
					{
						encoded: encodeUSSection(definition, { core: values, gpc }),
						id: definition.id,
					},
				]);
				expect(ours).toBe(referenceString(definition, values, gpc));

				const decoded = new GppModel(ours);
				expect(decoded.getSectionIds()).toEqual([definition.id]);
				for (const [name, value] of Object.entries(values)) {
					expect(decoded.getFieldValue(definition.prefix, name)).toEqual(value);
				}
				const decodedGpc = definition.gpc
					? decoded.getFieldValue(definition.prefix, 'Gpc')
					: null;
				expect(decodedGpc).toBe(definition.gpc ? gpc : null);
			}
		}
	);

	test('the header lists several sections as Fibonacci ranges', () => {
		const sections = [...US_SECTIONS].reverse().map((definition) => ({
			encoded: encodeUSSection(definition, {
				core: sampleValues(definition, 1),
				gpc: true,
			}),
			id: definition.id,
		}));
		const ours = encodeGPPString(sections);
		const decoded = new GppModel(ours);
		expect(decoded.getSectionIds()).toEqual(
			US_SECTIONS.map((definition) => definition.id)
		);
		expect(decoded.encode()).toBe(ours);
	});

	test('an empty section list encodes as an empty string', () => {
		expect(encodeGPPString([])).toBe('');
	});

	test('rejects a value that does not fit its field', () => {
		const [definition] = US_SECTIONS;
		if (!definition) {
			throw new Error('No US section');
		}
		expect(() =>
			encodeUSSection(definition, {
				core: { ...sampleValues(definition, 0), SaleOptOut: 4 },
				gpc: false,
			})
		).toThrow(RangeError);
	});
});
