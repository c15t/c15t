/**
 * The `consentPolicy` row a cookie-banner consent hangs off.
 *
 * `consent.policyId` is a foreign key into `consentPolicy`, and it is part of
 * the consent's deterministic id. 2.x anchored every cookie-banner submission
 * to a runtime policy row for its type (`findOrCreatePolicy(type)`), created
 * on first use; the matched runtime policy pack and its fingerprint live on
 * `runtimePolicyDecision`, not here. This keeps that split: the row is the
 * stable anchor for a type, and the decision is the evidence.
 */

import { generateDeterministicId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId, tenantScope } from '../db/tenant';
import { encoder } from '../db/values';

const ID_TIMESTAMP = 0;
const RUNTIME_POLICY_VERSION = '1.0';

export const buildRuntimePolicyId = (
	tenantId: string | undefined,
	type: string
): Promise<string> =>
	generateDeterministicId('consentPolicy', ID_TIMESTAMP, [
		tenantId ?? null,
		'runtime',
		type,
	]);

/**
 * The newest active policy of a type, created when the type has none.
 *
 * An existing active row wins, whichever process wrote it, so a database
 * adopted from 2.x keeps anchoring new consents to the policy its old
 * consents already reference.
 */
export const findOrCreateRuntimePolicy = Effect.fn('policy.findOrCreate')(
	function* findOrCreateRuntimePolicy(type: string) {
		const sql = yield* SqlClient.SqlClient;
		const encode = yield* encoder;
		const tenantId = yield* currentTenantId;
		const scope = yield* tenantScope();

		const active = yield* sql<{ id: string }>`
			select ${sql('id')} from ${sql('consentPolicy')}
			where ${sql('type')} = ${type}
				and ${sql('isActive')} = ${encode(true)}
				and ${scope}
			order by ${sql('effectiveDate')} desc
			limit 1
		`;
		const [found] = active;
		if (found) {
			return { created: false, id: found.id };
		}

		const id = yield* Effect.promise(() =>
			buildRuntimePolicyId(tenantId, type)
		);
		const now = new Date();
		const created = yield* insertOnce({
			conflictOn: 'id',
			into: 'consentPolicy',
			values: {
				createdAt: now,
				effectiveDate: now,
				hash: null,
				id,
				isActive: true,
				tenantId: tenantId ?? null,
				type,
				version: RUNTIME_POLICY_VERSION,
			},
		});
		return { created, id };
	}
);
