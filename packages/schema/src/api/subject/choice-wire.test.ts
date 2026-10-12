import * as v from 'valibot';
import { describe, expect, test } from 'vitest';

import { subjectChoiceWireSchema } from './choice-wire';
import { subjectCookieBannerInputSchema } from './post';

const receipt = {
	basis: { fingerprint: 'abc', kind: 'choice-v1' },
	confirmedAt: 1_735_689_600_000,
	value: true,
};

const choice = {
	categories: {
		marketing: receipt,
		measurement: {
			basis: { kind: 'legacy-v2' },
			confirmedAt: 1_700_000_000_000,
			value: false,
		},
	},
	version: 3,
};

describe('subjectChoiceWireSchema', () => {
	test('accepts partial per-category receipts with either basis', () => {
		const parsed = v.parse(subjectChoiceWireSchema, choice);
		expect(parsed).toEqual(choice);
		expect(Object.keys(parsed.categories)).toEqual([
			'marketing',
			'measurement',
		]);
	});

	test.each([
		{ input: { ...choice, version: 2 }, label: 'unknown version' },
		{
			input: { ...choice, categories: { necessary: receipt } },
			label: 'unknown category',
		},
		{
			input: {
				...choice,
				categories: { marketing: { ...receipt, note: 'x' } },
			},
			label: 'extra receipt field',
		},
		{
			input: {
				...choice,
				categories: { marketing: { ...receipt, confirmedAt: 1.5 } },
			},
			label: 'fractional timestamp',
		},
		{
			input: {
				...choice,
				categories: { marketing: { ...receipt, confirmedAt: -1 } },
			},
			label: 'negative timestamp',
		},
		{
			input: {
				...choice,
				categories: {
					marketing: { ...receipt, confirmedAt: 8_640_000_000_000_001 },
				},
			},
			label: 'out-of-range timestamp',
		},
		{
			input: {
				...choice,
				categories: { marketing: { ...receipt, value: 'true' } },
			},
			label: 'string value',
		},
		{
			input: {
				...choice,
				categories: {
					marketing: {
						...receipt,
						basis: { fingerprint: 'x', kind: 'choice-v2' },
					},
				},
			},
			label: 'unknown basis',
		},
		{
			input: {
				...choice,
				categories: {
					marketing: {
						...receipt,
						basis: { fingerprint: '', kind: 'choice-v1' },
					},
				},
			},
			label: 'empty fingerprint',
		},
		{
			input: {
				...choice,
				categories: {
					marketing: {
						...receipt,
						basis: { fingerprint: 'x', kind: 'legacy-v2' },
					},
				},
			},
			label: 'legacy basis with choice fingerprint',
		},
	])('rejects $label', ({ input }) => {
		expect(v.safeParse(subjectChoiceWireSchema, input).success).toBe(false);
	});

	test('does not stamp or renew receipts on a round trip', () => {
		const parsed = v.parse(
			subjectChoiceWireSchema,
			JSON.parse(JSON.stringify(choice))
		);
		expect(parsed.categories.marketing?.confirmedAt).toBe(receipt.confirmedAt);
	});
});

describe('POST /subject cookie_banner input', () => {
	test('accepts an optional choice next to preferences', () => {
		const parsed = v.parse(subjectCookieBannerInputSchema, {
			choice,
			domain: 'example.com',
			givenAt: 1_735_689_600_000,
			preferences: { marketing: true, measurement: false, necessary: true },
			subjectId: 'sub_2jv6z8n4q9',
			type: 'cookie_banner',
		});
		expect(parsed.choice?.categories.measurement?.value).toBe(false);
	});
});
