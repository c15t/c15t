import { describe, expect, test } from 'bun:test';

import type { PolicyRecordFixture } from '../contract/policy-scenarios';
import { POLICY_EXPIRED, POLICY_NOW, POLICY_RECORDS } from './policy-records';
import { POLICY_SCENARIOS } from './policy-scenarios';

const records: Readonly<Record<string, PolicyRecordFixture>> = POLICY_RECORDS;

describe('policy fixture inputs', () => {
	test('every storage reference can be seeded with raw bytes', () => {
		for (const scenario of POLICY_SCENARIOS) {
			for (const id of Object.values(scenario.storage ?? {})) {
				expect(records[id]?.raw.length).toBeGreaterThan(0);
			}
		}
	});

	test('JSON fixtures survive transport serialization with receipt coverage intact', () => {
		for (const record of Object.values(POLICY_RECORDS)) {
			if (record.encoding !== 'v3-choice-json' || !record.expected.valid) {
				continue;
			}
			expect(
				JSON.parse(decodeURIComponent(encodeURIComponent(record.raw)))
			).toEqual(record.expected.choice);
		}
		expect(
			POLICY_RECORDS['v3-partial'].expected.choice.categories
		).not.toHaveProperty('measurement');
		expect(
			POLICY_RECORDS['v3-partial'].expected.choice.categories.marketing?.value
		).toBe(false);
	});

	test('legacy JSON omission and compact omission have different coverage', () => {
		const json = POLICY_RECORDS['legacy-partial-json'];
		const compact = POLICY_RECORDS['legacy-compact-omitted-false'];
		expect(JSON.parse(json.raw).consents).not.toHaveProperty('measurement');
		expect(json.expected.choice.categories).not.toHaveProperty('measurement');
		expect(compact.raw).not.toContain('c.measurement');
		expect(compact.expected.choice.categories.measurement?.value).toBe(false);
	});

	test('partial confirmation keeps the omitted expired receipt', () => {
		const scenario = POLICY_SCENARIOS.find(
			(item) => item.id === 'partial-save-renews-only-confirmed-keys'
		);
		const choice = scenario?.steps[1]?.expect.choice;
		expect(choice?.categories.marketing?.confirmedAt).toBe(POLICY_EXPIRED);
		expect(choice?.categories.measurement?.confirmedAt).toBe(POLICY_NOW);
	});

	test('scenario matrix survives JSON transfer to framework drivers', () => {
		expect(JSON.parse(JSON.stringify(POLICY_SCENARIOS))).toEqual(
			POLICY_SCENARIOS
		);
		const ids = POLICY_SCENARIOS.map((scenario) => scenario.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
