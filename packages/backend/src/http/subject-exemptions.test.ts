/** Exempt processing preferences persist independently of consent receipts. */
import type { PolicyRule } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const T0 = 1_700_000_000_000;
const headers = { 'x-c15t-country': 'GB', 'x-c15t-policy-contract': '2' };
const rules: PolicyRule[] = [
	{
		exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
		id: 'uk-mixed',
		match: { countries: ['GB'] },
		model: 'opt-in',
		prompt: 'choice',
	},
	{
		id: 'fallback',
		match: { isDefault: true },
		model: 'opt-in',
		prompt: 'choice',
	},
];
const base = {
	choice: { categories: {}, version: 3 },
	domain: 'example.com',
	preferences: { necessary: true },
	subjectId: 'sub_exempt1',
	type: 'cookie_banner',
};

for (const engine of ENGINES) {
	describe(`exemption preference HTTP (${engine.name})`, () => {
		let harness: HttpHarness;
		let proof: {
			policyId: unknown;
			fingerprint: unknown;
			country: string;
			language: string;
			gpc: boolean;
			region: null;
		};
		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Exemptions', policyRules: rules },
				tenantId: 'tenant_exempt',
			});
			const init = await harness.json('GET', '/init', undefined, headers);
			const resolution = init.body.policyResolution;
			if (
				!resolution ||
				typeof resolution !== 'object' ||
				!('policyId' in resolution) ||
				!('fingerprints' in resolution) ||
				!resolution.fingerprints ||
				typeof resolution.fingerprints !== 'object' ||
				!('policy' in resolution.fingerprints)
			) {
				throw new Error(
					`Expected a matched policy: ${JSON.stringify(init.body)}`
				);
			}
			proof = {
				country: 'GB',
				fingerprint: resolution.fingerprints.policy,
				gpc: false,
				language: 'en',
				policyId: resolution.policyId,
				region: null,
			};
		});
		afterEach(async () => {
			await harness.dispose();
		});

		it('records an objection without consent and merges a later reversal', async () => {
			const objection = {
				categories: { measurement: { confirmedAt: T0, value: false } },
				version: 1,
			};
			const first = await harness.json(
				'POST',
				'/subjects',
				{ ...base, ...proof, exemptionPreferences: objection, givenAt: T0 },
				headers
			);
			expect(first.status, JSON.stringify(first.body)).toBe(200);
			expect(first.body.exemptionPreferences).toEqual(objection);
			const evidence = await harness.runtime.runPromise(
				Effect.gen(function* readEvidence() {
					const sql = yield* SqlClient.SqlClient;
					const decisions = yield* sql<{
						exemptions: unknown;
					}>`select ${sql('exemptions')} from ${sql('runtimePolicyDecision')}`;
					const audits = yield* sql<{
						actionType: string;
					}>`select ${sql('actionType')} from ${sql('auditLog')}`;
					return { audits, decisions };
				})
			);
			const declaration = evidence.decisions[0]?.exemptions;
			expect(
				typeof declaration === 'string' ? JSON.parse(declaration) : declaration
			).toEqual({ measurement: { kind: 'uk-statistics', revision: '1' } });
			expect(evidence.audits[0]?.actionType).toBe(
				'exemption_preferences_changed'
			);
			const read = await harness.json('GET', `/subjects/${base.subjectId}`);
			expect(read.body.subjectChoice).toBeNull();
			expect(read.body.subjectExemptionPreferences).toEqual(objection);
			const reversal = {
				categories: { measurement: { confirmedAt: T0 + 1, value: true } },
				version: 1,
			};
			const second = await harness.json(
				'POST',
				'/subjects',
				{ ...base, ...proof, exemptionPreferences: reversal, givenAt: T0 + 1 },
				headers
			);
			expect(second.status, JSON.stringify(second.body)).toBe(200);
			const reread = await harness.json('GET', `/subjects/${base.subjectId}`);
			expect(reread.body.subjectExemptionPreferences).toEqual(reversal);
			expect(reread.body.subjectChoice).toBeNull();
		});
		it('rejects positive preferences outside active exemptions and incompatible clients', async () => {
			const positive = {
				categories: { marketing: { confirmedAt: T0, value: true } },
				version: 1,
			};
			const response = await harness.json(
				'POST',
				'/subjects',
				{ ...base, ...proof, exemptionPreferences: positive, givenAt: T0 },
				headers
			);
			expect(response.status).toBe(400);
			const old = await harness.json(
				'POST',
				'/subjects',
				{ ...base, ...proof, givenAt: T0 },
				{ ...headers, 'x-c15t-policy-contract': '1' }
			);
			expect(old.status).toBe(400);
			const unbound = await harness.json(
				'POST',
				'/subjects',
				{ ...base, givenAt: T0 },
				{ ...headers, 'x-c15t-policy-contract': '1' }
			);
			expect(unbound.status).toBe(400);
			expect(await harness.count('consent')).toBe(0);
		});
		it('cannot synthesize consent for exempt processing from a missing choice wire', async () => {
			const { choice: _choice, ...withoutChoice } = base;
			const response = await harness.json(
				'POST',
				'/subjects',
				{
					...withoutChoice,
					...proof,
					givenAt: T0,
					preferences: { measurement: true, necessary: true },
				},
				headers
			);
			expect(response.status).toBe(400);
			expect(await harness.count('consent')).toBe(0);
		});

		it('rejects changes to an already-recorded preference action', async () => {
			const action = {
				...base,
				...proof,
				exemptionPreferences: {
					categories: { measurement: { confirmedAt: T0, value: false } },
					version: 1,
				},
				givenAt: T0,
			};
			const first = await harness.json('POST', '/subjects', action, headers);
			expect(first.status, JSON.stringify(first.body)).toBe(200);
			const retry = await harness.json(
				'POST',
				'/subjects',
				{
					...action,
					exemptionPreferences: {
						categories: { measurement: { confirmedAt: T0, value: true } },
						version: 1,
					},
				},
				headers
			);
			expect(retry.status).toBe(400);
			expect(await harness.count('consent')).toBe(1);
			const unchanged = await harness.json(
				'GET',
				`/subjects/${base.subjectId}`
			);
			expect(unchanged.body.subjectExemptionPreferences).toEqual(
				action.exemptionPreferences
			);
		});
	});
}
