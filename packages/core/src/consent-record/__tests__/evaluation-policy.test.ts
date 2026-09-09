import { describe, expect, it } from 'vitest';

import { createEvaluationPolicy } from '../evaluation-policy';
import { makePolicy } from './fixtures';

describe('createEvaluationPolicy', () => {
	it('canonicalizes scope and GPC mapping and copies validity inputs', () => {
		const policy = makePolicy({
			gpcDenyCategories: ['measurement', 'marketing'],
			scope: ['marketing', 'functionality', 'marketing', 'measurement'],
		});
		expect(policy.scope).toEqual(['functionality', 'marketing', 'measurement']);
		expect(policy.gpcDenyCategories).toEqual(['marketing', 'measurement']);
		expect(policy.choice).toEqual({
			fingerprint: 'choice-fp-1',
			maxAgeMs: null,
		});
		expect(policy.legacyMaterialFingerprint).toBeNull();
	});

	it('only allows notice and none prompts with the opt-out model', () => {
		expect(() => makePolicy({ model: 'opt-in', prompt: 'notice' })).toThrow(
			TypeError
		);
		expect(() => makePolicy({ model: 'iab', prompt: 'none' })).toThrow(
			TypeError
		);
		expect(makePolicy({ model: 'opt-out', prompt: 'none' }).prompt).toBe(
			'none'
		);
	});

	it('rejects invalid GPC mappings', () => {
		expect(() =>
			makePolicy({ gpcDenyCategories: ['necessary' as never] })
		).toThrow(/necessary/u);
		expect(() =>
			makePolicy({ gpcDenyCategories: ['marketing', 'marketing'] })
		).toThrow(/repeats/u);
		expect(() =>
			makePolicy({ gpcDenyCategories: ['analytics' as never] })
		).toThrow(/unknown/u);
		expect(() =>
			makePolicy({ gpcDenyCategories: ['marketing'], scope: ['functionality'] })
		).toThrow(/outside/u);
	});

	it('rejects unknown scope entries, empty fingerprints and bad durations', () => {
		expect(() => makePolicy({ scope: ['analytics' as never] })).toThrow(
			/unknown/u
		);
		expect(() =>
			makePolicy({ choice: { fingerprint: '', maxAgeMs: null } })
		).toThrow(/fingerprint/u);
		expect(() =>
			makePolicy({ notice: { fingerprint: 'n', maxAgeMs: -1 } })
		).toThrow(/maxAgeMs/u);
		expect(() =>
			makePolicy({ choice: { fingerprint: 'c', maxAgeMs: Number.NaN } })
		).toThrow(/maxAgeMs/u);
	});

	it('accepts zero as immediate expiry and an empty scope', () => {
		const policy = createEvaluationPolicy({
			choice: { fingerprint: 'c', maxAgeMs: 0 },
			model: 'opt-out',
			notice: { fingerprint: 'n', maxAgeMs: 0 },
			prompt: 'none',
			scope: [],
			scopeMode: 'strict',
		});
		expect(policy.choice.maxAgeMs).toBe(0);
		expect(policy.scope).toEqual([]);
	});
});
