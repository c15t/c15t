/**
 * Consent purposes.
 *
 * 2.x stored a cookie-banner submission's granted categories as the ids of
 * `consentPurpose` rows whose `code` is the category name, and read them back
 * as `preferences` by mapping ids to codes. That representation is what every
 * existing database holds, so it is kept exactly: `purposeIds` remains the
 * granted codes, and denials are not representable in it. The v3 receipt on
 * the consent row is where denials and per-category times live.
 */

import { generateDeterministicId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId, tenantScope } from '../db/tenant';

const ID_TIMESTAMP = 0;

export const buildPurposeId = (
	tenantId: string | undefined,
	code: string
): Promise<string> =>
	generateDeterministicId('consentPurpose', ID_TIMESTAMP, [
		tenantId ?? null,
		'consentPurpose',
		code,
	]);

/** Purpose id for one code, created on first sight. */
const findOrCreatePurpose = Effect.fn('purpose.findOrCreate')(
	function* findOrCreatePurpose(code: string) {
		const sql = yield* SqlClient.SqlClient;
		const tenantId = yield* currentTenantId;
		const scope = yield* tenantScope();

		const existing = yield* sql<{ id: string }>`
			select ${sql('id')} from ${sql('consentPurpose')}
			where ${sql('code')} = ${code} and ${scope}
			order by ${sql('createdAt')} asc
			limit 1
		`;
		const [found] = existing;
		if (found) {
			return found.id;
		}

		const id = yield* Effect.promise(() => buildPurposeId(tenantId, code));
		const now = new Date();
		yield* insertOnce({
			conflictOn: 'id',
			into: 'consentPurpose',
			values: {
				code,
				createdAt: now,
				id,
				tenantId: tenantId ?? null,
				updatedAt: now,
			},
		});
		return id;
	}
);

/** Purpose ids for the given codes, in input order. */
export const findOrCreatePurposeIds = Effect.fn('purpose.findOrCreateIds')(
	function* findOrCreatePurposeIds(codes: readonly string[]) {
		const ids: string[] = [];
		for (const code of codes) {
			ids.push(yield* findOrCreatePurpose(code));
		}
		return ids;
	}
);

/** Every purpose code in the tenant, keyed by id. */
export const purposeCodesById = Effect.fn('purpose.codesById')(
	function* purposeCodesById() {
		const sql = yield* SqlClient.SqlClient;
		const scope = yield* tenantScope();
		const rows = yield* sql<{ id: string; code: string }>`
			select ${sql('id')}, ${sql('code')} from ${sql('consentPurpose')}
			where ${scope}
		`;
		return new Map(rows.map((row) => [row.id, row.code]));
	}
);
