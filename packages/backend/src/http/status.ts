/**
 * `GET /status` — liveness plus a database reachability check.
 *
 * Deliberately hits the database rather than answering from memory. A process
 * that is up but cannot reach its database is not healthy, and reporting 200
 * for it would keep a broken instance in a load balancer's rotation.
 *
 * Mirrors `@c15t/backend`'s handler: the same response shape, the same 503 on
 * a failed check, and the same single cheap query to verify connectivity.
 */

import { getIpAddress } from '@c15t/schema/geo';
import type { IpAddressConfig } from '@c15t/schema/geo';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { SqlError } from 'effect/unstable/sql';

import { readInitSignals } from './init';

export interface StatusResponse {
	readonly version: string;
	readonly timestamp: Date;
	readonly client: {
		readonly ip: string | null;
		readonly acceptLanguage: string;
		readonly userAgent: string | null;
		readonly region: {
			readonly countryCode: string | null;
			readonly regionCode: string | null;
		};
	};
}

/**
 * Verifies the database answers, then reports version and client context.
 *
 * Fails with `SqlError` when the database is unreachable, which the route maps
 * to 503 rather than 500 — the distinction matters to orchestrators, which
 * treat 503 as "retry me" and 500 as "I am broken".
 */
export const status = Effect.fn('status')(function* (
	headers: Headers,
	version: string,
	ipConfig: IpAddressConfig | undefined
): Generator<
	Effect.Effect<unknown, SqlError.SqlError, SqlClient.SqlClient>,
	StatusResponse
> {
	const sql = yield* SqlClient.SqlClient;
	const signals = readInitSignals(headers);

	// The cheapest query that proves the connection works and the schema is
	// present. `limit 1` rather than a count so it stays constant-time on a
	// large table.
	yield* sql`select 1 from ${sql('subject')} limit 1`;

	return {
		version,
		timestamp: new Date(),
		client: {
			ip: getIpAddress(headers, ipConfig),
			acceptLanguage: signals.language,
			userAgent: headers.get('user-agent'),
			region: {
				countryCode: signals.country,
				regionCode: signals.region,
			},
		},
	};
});
