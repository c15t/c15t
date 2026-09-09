/**
 * Domain rows.
 *
 * The wire carries a domain *name*; the consent row references a domain *id*,
 * and that id is part of the consent's deterministic identity. So the same
 * name must always resolve to the same row, or a retried submission would
 * derive a different consent id and land twice. The id is therefore derived
 * from the tenant and the name rather than generated, and the insert is a
 * conflict-tolerant single statement like every other idempotent write here.
 */

import { generateDeterministicId } from '@c15t/schema';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { insertOnce } from '../db/insert-once';
import { currentTenantId, tenantScope } from '../db/tenant';

/** Fixed so the derived id is a function of the identity alone. */
const ID_TIMESTAMP = 0;

export const buildDomainId = (
	tenantId: string | undefined,
	name: string
): Promise<string> =>
	generateDeterministicId('domain', ID_TIMESTAMP, [
		tenantId ?? null,
		'domain',
		name,
	]);

/**
 * The domain row for a name, created on first sight.
 *
 * An existing row written by an older process has a random id, so a lookup by
 * name runs first; the deterministic id only decides collisions between
 * concurrent first writes.
 */
export const findOrCreateDomain = Effect.fn('domain.findOrCreate')(
	function* findOrCreateDomain(name: string) {
		const sql = yield* SqlClient.SqlClient;
		const tenantId = yield* currentTenantId;
		const scope = yield* tenantScope();

		const existing = yield* sql<{ id: string; name: string }>`
			select ${sql('id')}, ${sql('name')} from ${sql('domain')}
			where ${sql('name')} = ${name} and ${scope}
			order by ${sql('createdAt')} asc
			limit 1
		`;
		const [found] = existing;
		if (found) {
			return { id: found.id, name: found.name };
		}

		const id = yield* Effect.promise(() => buildDomainId(tenantId, name));
		const now = new Date();
		yield* insertOnce({
			conflictOn: 'id',
			into: 'domain',
			values: {
				createdAt: now,
				id,
				name,
				tenantId: tenantId ?? null,
				updatedAt: now,
			},
		});
		return { id, name };
	}
);
