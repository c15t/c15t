/**
 * Manifest recompute-on-write against a real Postgres.
 *
 * The mocked `post.handler.test.ts` suite asserts on the *arguments* passed to
 * a fake `db.create`, so it stays green no matter what those arguments mean to
 * a database. That is how `consent.policyId` ended up holding a runtime policy
 * pack id (`eu_opt_in`) rather than a `consentPolicy` primary key: every
 * manifest-mode save 500s on Postgres while the unit tests pass and SQLite —
 * which ships with `PRAGMA foreign_keys` off — accepts the row happily.
 *
 * These tests run the real handler through the real HTTP surface against
 * PGlite, so the foreign keys in the schema are actually enforced.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	createPgliteDatabase,
	type PgliteDatabase,
} from '../../__tests__/utils/pglite-database';
import { c15tInstance } from '../../core';
import { policyPackPresets } from '../../policies/defaults';

const BASE_PATH = '/api/c15t';
const ORIGIN = 'http://localhost:3000';

let database: PgliteDatabase;
let instance: ReturnType<typeof c15tInstance>;

/** Base58-ish ids, matching the `^sub_[1-9A-HJ-NP-Za-km-z]+$` the API enforces. */
function subjectId(seed: string): string {
	return `sub_${seed.replace(/[0OIl]/g, 'x')}`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
	return instance.handler(
		new Request(`${ORIGIN}${BASE_PATH}${path}`, {
			...init,
			headers: {
				'content-type': 'application/json',
				origin: ORIGIN,
				...init?.headers,
			},
		})
	);
}

/** The `policyId` + `fingerprint` a manifest-mode client asserts on save. */
async function resolveDecision(country: string, region?: string) {
	const response = await request('/init', {
		headers: {
			'x-c15t-country': country,
			...(region ? { 'x-c15t-region': region } : {}),
			'accept-language': 'en',
		},
	});
	expect(response.status).toBe(200);
	const init = (await response.json()) as {
		policy?: { id?: string; fingerprint?: string };
		policyDecision?: { policyId?: string; fingerprint?: string };
	};
	const policyId = init.policyDecision?.policyId ?? init.policy?.id;
	const fingerprint =
		init.policyDecision?.fingerprint ?? init.policy?.fingerprint;
	if (!policyId || !fingerprint) {
		throw new Error('Expected /init to resolve a policy pack');
	}
	return { policyId, fingerprint };
}

async function save(params: {
	subjectId: string;
	country: string;
	region: string | null;
	policyId: string;
	fingerprint: string;
}) {
	return request('/subjects', {
		method: 'POST',
		body: JSON.stringify({
			subjectId: params.subjectId,
			domain: 'localhost',
			type: 'cookie_banner',
			preferences: { necessary: true, measurement: true, marketing: false },
			givenAt: Date.now(),
			jurisdictionModel: 'opt-in',
			uiSource: 'banner',
			consentAction: 'custom',
			policyId: params.policyId,
			fingerprint: params.fingerprint,
			country: params.country,
			region: params.region,
			language: 'en',
		}),
	});
}

beforeAll(async () => {
	database = await createPgliteDatabase();
	instance = c15tInstance({
		appName: 'c15t-pglite-test',
		basePath: BASE_PATH,
		adapter: database.adapter,
		trustedOrigins: ['localhost'],
		tenantId: 'ins_1',
		policyPacks: [
			policyPackPresets.europeOptIn(),
			policyPackPresets.californiaOptOut(),
			policyPackPresets.worldNoBanner(),
		],
	});
}, 120_000);

afterAll(async () => {
	await database?.destroy();
});

describe('manifest recompute-on-write against real Postgres', () => {
	it('writes a consent row whose policyId satisfies the consentPolicy foreign key', async () => {
		const decision = await resolveDecision('DE');
		const id = subjectId('reviewFkGuardEu');

		const response = await save({
			subjectId: id,
			country: 'DE',
			region: null,
			policyId: decision.policyId,
			fingerprint: decision.fingerprint,
		});

		// Pre-fix this is a 500: `consent.policyId` held the pack id
		// ('europe_opt_in'), which is not a row in `consentPolicy`.
		expect(response.status).toBe(200);

		const rows = await database.db
			.selectFrom('consent as c')
			.innerJoin('consentPolicy as p', 'p.id', 'c.policyId')
			.innerJoin(
				'runtimePolicyDecision as r',
				'r.id',
				'c.runtimePolicyDecisionId'
			)
			.select([
				'c.policyId as consentPolicyId',
				'p.id as policyRowId',
				'r.policyId as packId',
				'c.runtimePolicySource as source',
			])
			.where('c.subjectId', '=', id)
			.execute();

		expect(rows).toHaveLength(1);
		const row = rows[0] as Record<string, unknown>;
		// The join only returns a row because the FK target genuinely exists.
		expect(row.policyRowId).toBe(row.consentPolicyId);
		// Pack identity lives on the runtime decision, not on consent.policyId.
		expect(row.packId).toBe(decision.policyId);
		expect(row.consentPolicyId).not.toBe(decision.policyId);
		expect(row.source).toBe('manifest_recompute');
	});

	it('reuses one consentPolicy row across saves rather than creating one per save', async () => {
		const decision = await resolveDecision('DE');

		for (const seed of ['reviewReuseAaa', 'reviewReuseBbb']) {
			const response = await save({
				subjectId: subjectId(seed),
				country: 'DE',
				region: null,
				policyId: decision.policyId,
				fingerprint: decision.fingerprint,
			});
			expect(response.status).toBe(200);
		}

		const policies = await database.db
			.selectFrom('consentPolicy')
			.select(['id'])
			.execute();

		expect(policies.length).toBeGreaterThanOrEqual(1);
		// find-or-create, not create-every-time.
		expect(policies.length).toBeLessThanOrEqual(2);
	});

	it('persists a California opt-out save through the same FK path', async () => {
		const decision = await resolveDecision('US', 'CA');
		const id = subjectId('reviewFkGuardCa');

		const response = await save({
			subjectId: id,
			country: 'US',
			region: 'CA',
			policyId: decision.policyId,
			fingerprint: decision.fingerprint,
		});

		expect(response.status).toBe(200);

		const row = await database.db
			.selectFrom('consent as c')
			.innerJoin('consentPolicy as p', 'p.id', 'c.policyId')
			.select(['c.jurisdiction as jurisdiction', 'p.id as policyRowId'])
			.where('c.subjectId', '=', id)
			.executeTakeFirst();

		expect(row?.policyRowId).toBeTruthy();
	});
});
