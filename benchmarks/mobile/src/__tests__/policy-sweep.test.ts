/**
 * The sweep runs against the real conformance corpus, so a fixture regenerated
 * in a different shape must produce a skipped row with a reason rather than a
 * thrown error inside the bench. That is the regression this file exists for.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { measurePolicySweep, skipReason } from '../measure/policy-sweep';

const PROTOCOL_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'..',
	'..',
	'native',
	'protocol'
);

const result = await measurePolicySweep(2, 3);

describe('measurePolicySweep', () => {
	it('drives every evaluation fixture in the corpus', () => {
		expect(result.unavailable).toBeUndefined();
		expect(result.ruleSets).toBeGreaterThan(0);
	});

	it('counts the corpus rather than a hard-coded rule set', () => {
		expect(result.ruleSets).toBe(result.ruleSetIds.length);
	});

	it('produces a real duration per rule set', () => {
		expect(result.evaluationUs).toBeGreaterThan(0);
		expect(result.worstRuleSetUs).toBeGreaterThanOrEqual(result.evaluationUs);
	});

	it('reports a sample count that matches the requested plan', () => {
		expect(result.samplesPerRuleSet).toBe(3);
	});
});

describe('fixture shapes it cannot drive', () => {
	it('accepts a fixture straight out of the corpus', () => {
		const fixture = JSON.parse(
			readFileSync(join(PROTOCOL_DIR, 'evaluation-eu-opt-in.json'), 'utf8')
		) as Parameters<typeof skipReason>[0];
		expect(skipReason(fixture, 'evaluation-eu-opt-in.json')).toBeNull();
	});

	it('names a missing transport instead of throwing', () => {
		const fixture = { id: 'x', input: {} };
		expect(skipReason(fixture, 'x.json')).toContain('input.transport');
	});

	it('names a missing contract header, without which the body fails closed', () => {
		const fixture = {
			id: 'x',
			input: {
				now: 1,
				transport: { body: {}, headers: {}, status: 200 },
			},
		};
		expect(skipReason(fixture, 'x.json')).toContain('x-c15t-policy-contract');
	});

	it('names a fixture with no input at all', () => {
		expect(skipReason({ id: 'x' }, 'x.json')).toContain('no "input"');
	});

	it('names a fixture with no clock', () => {
		const fixture = {
			id: 'x',
			input: {
				transport: {
					body: {},
					headers: { 'x-c15t-policy-contract': '1' },
					status: 200,
				},
			},
		};
		expect(skipReason(fixture, 'x.json')).toContain('input.now');
	});
});
