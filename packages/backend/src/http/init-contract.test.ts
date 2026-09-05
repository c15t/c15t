/**
 * The policy contract on `/init` and `/manifest`.
 *
 * What a client can rely on: every response says which contract this
 * producer speaks; a client that declares a contract this producer does not
 * speak gets an explicit failure rather than a wire it may misread; a
 * configured pack that matches nothing is a `no-match` with an explicit
 * `null` policy, and an invalid pack is a `failed` with a reason, never the
 * same thing; and the manifest's cache identity moves when semantics move.
 */

import { POLICY_CONTRACT_HEADER } from '@c15t/schema';
import type { PolicyRule } from '@c15t/schema';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const [engine] = ENGINES;
if (!engine) {
	throw new Error('No test engine available');
}

const RULES: PolicyRule[] = [
	{
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
	},
	{
		id: 'ca_opt_out',
		match: { regions: [{ country: 'US', region: 'CA' }] },
		model: 'opt-out',
		privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
		prompt: 'notice',
	},
];

describe('policy contract negotiation on /init', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest: { appName: 'Contract', policyRules: RULES },
			trustedOrigins: ['https://app.example.com'],
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	it('declares its contract on every response and exposes it to browsers', async () => {
		const response = await harness.app.request('/init', {
			headers: { Origin: 'https://app.example.com' },
		});
		assert.strictEqual(response.headers.get(POLICY_CONTRACT_HEADER), '1');
		assert.include(
			response.headers.get('Access-Control-Expose-Headers') ?? '',
			POLICY_CONTRACT_HEADER
		);

		const manifest = await harness.app.request('/manifest');
		assert.strictEqual(manifest.headers.get(POLICY_CONTRACT_HEADER), '1');
	});

	it('allows the contract header through CORS preflight', async () => {
		const response = await harness.app.request('/init', {
			headers: {
				'Access-Control-Request-Headers': POLICY_CONTRACT_HEADER,
				'Access-Control-Request-Method': 'GET',
				Origin: 'https://app.example.com',
			},
			method: 'OPTIONS',
		});
		assert.strictEqual(response.status, 204);
		assert.include(
			response.headers.get('Access-Control-Allow-Headers') ?? '',
			POLICY_CONTRACT_HEADER
		);
	});

	it('serves a negotiated client the matched rule with precomputed fingerprints', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: '1',
			'x-c15t-country': 'DE',
		});
		const resolution = init.body.policyResolution as {
			status: string;
			version: number;
			policyId: string;
			fingerprints: { policy: string; choice: string; notice: string };
		};
		assert.strictEqual(resolution.version, 1);
		assert.strictEqual(resolution.status, 'matched');
		assert.strictEqual(resolution.policyId, 'eu_opt_in');
		assert.isString(resolution.fingerprints.choice);
	});

	it('returns the canonical wire without legacy projection when the header is absent', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			'x-c15t-country': 'US',
			'x-c15t-region': 'CA',
		});
		assert.isUndefined(init.body.policy);
		assert.isUndefined(init.body.policyDecision);
		assert.deepInclude(init.body.policyResolution, { status: 'matched' });
	});

	it('fails closed for a client declaring a contract it does not speak', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: '2',
			'x-c15t-country': 'DE',
		});
		assert.deepStrictEqual(init.body.policyResolution, {
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
			version: 1,
		});
		assert.isUndefined(init.body.policy);
		assert.isUndefined(init.body.policySnapshotToken);
		assert.isUndefined(init.body.gvl);

		const garbage = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: 'latest',
		});
		assert.strictEqual(
			(garbage.body.policyResolution as { reason: string }).reason,
			'unsupported-contract'
		);
	});

	it('answers a successful no-match with an explicit null policy', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: '1',
			'x-c15t-country': 'BR',
		});
		assert.deepStrictEqual(init.body.policyResolution, {
			policy: null,
			status: 'no-match',
			version: 1,
		});
		assert.isUndefined(init.body.policy);
		assert.isUndefined(init.body.policySnapshotToken);
	});

	it('answers an unknown location without a fallback as a failure, not a no-match', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: '1',
		});
		assert.deepStrictEqual(init.body.policyResolution, {
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
			version: 1,
		});
	});
});

describe('invalid policy configuration', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest: {
				appName: 'Broken',
				policyRules: [
					{
						id: 'broken',
						match: { isDefault: true },
						model: 'opt-in',
						// An opt-in rule cannot use a notice prompt.
						prompt: 'notice',
					},
				],
			},
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	it('is a failed resolution with a reason, distinct from no-match', async () => {
		const init = await harness.json('GET', '/init', undefined, {
			[POLICY_CONTRACT_HEADER]: '1',
			'x-c15t-country': 'DE',
		});
		assert.strictEqual(init.status, 200);
		assert.deepStrictEqual(init.body.policyResolution, {
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
			version: 1,
		});
		const manifest = await harness.json('GET', '/manifest');
		assert.isDefined(manifest.body.policyFailure);
	});
});

describe('manifest cache identity', () => {
	const revisionFor = async (rules: PolicyRule[]) => {
		const harness = await createHttpHarness(engine, {
			manifest: { appName: 'Cache', policyRules: rules },
		});
		try {
			const response = await harness.app.request('/manifest');
			return {
				etag: response.headers.get('ETag'),
				schemaVersion: ((await response.json()) as { schemaVersion: number })
					.schemaVersion,
			};
		} finally {
			await harness.dispose();
		}
	};

	it('moves when semantics move and carries the manifest schema version', async () => {
		const base = await revisionFor(RULES);
		assert.strictEqual(base.schemaVersion, 2);

		const gpcChanged = await revisionFor([
			RULES[0] as PolicyRule,
			{
				...(RULES[1] as PolicyRule),
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			},
		]);
		assert.notStrictEqual(gpcChanged.etag, base.etag);

		const copyChanged = await revisionFor([
			{ ...(RULES[0] as PolicyRule), copyRevision: '2' },
			RULES[1] as PolicyRule,
		]);
		assert.notStrictEqual(copyChanged.etag, base.etag);

		const same = await revisionFor(RULES);
		assert.strictEqual(same.etag, base.etag);
	});
});
