/**
 * Stored times are UTC on every connection the backend opens.
 *
 * The server halves are opt-in because they need a real Postgres or MySQL:
 * PGlite has its own client and never goes through the URL.
 *
 * ```
 * docker run --rm -d -p 5455:5432 -e POSTGRES_PASSWORD=c15t \
 *   -e POSTGRES_DB=c15t --name c15t-pg postgres:16
 * docker run --rm -d -p 3307:3306 -e MYSQL_ROOT_PASSWORD=c15t \
 *   -e MYSQL_DATABASE=c15t --name c15t-mysql mysql:8.4
 * C15T_TEST_PG_URL=postgres://postgres:c15t@127.0.0.1:5455/c15t \
 *   C15T_TEST_MYSQL_URL=mysql://root:c15t@127.0.0.1:3307/c15t bun run test
 * ```
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/sql';

import { toLayer, withMysqlUtc, withPostgresUtc } from './connect';
import type { DatabaseConfig } from './connect';

const PG_URL = process.env.C15T_TEST_PG_URL;
const MYSQL_URL = process.env.C15T_TEST_MYSQL_URL;

describe('withPostgresUtc', () => {
	it('sets the session time zone', () => {
		const out = new URL(withPostgresUtc('postgres://u:p@host:5432/db'));
		assert.strictEqual(out.searchParams.get('options'), '-c timezone=UTC');
	});

	it('keeps other options and comes after them', () => {
		// Postgres applies repeated settings in order, so the last one wins.
		const out = new URL(
			withPostgresUtc(
				'postgres://u:p@host:5432/db?sslmode=require&options=-c timezone%3DEurope/Berlin'
			)
		);
		assert.strictEqual(out.searchParams.get('sslmode'), 'require');
		assert.strictEqual(
			out.searchParams.get('options'),
			'-c timezone=Europe/Berlin -c timezone=UTC'
		);
	});
});

describe('withMysqlUtc', () => {
	it('sets the driver time zone, replacing one the URL sets', () => {
		const out = new URL(
			withMysqlUtc('mysql://u:p@host:3306/db?timezone=local&ssl=true')
		);
		assert.strictEqual(out.searchParams.get('timezone'), 'Z');
		assert.strictEqual(out.searchParams.get('ssl'), 'true');
	});
});

/**
 * Writes a known instant into a zoneless timestamp column, through a
 * connection whose URL asks for another zone, and returns the wall clock
 * the server stored. A round trip alone would hide a shift: mysql2 converts
 * symmetrically, so another process reading the row is what goes wrong.
 */
const storedWallClock = async (
	config: DatabaseConfig,
	column: string,
	asText: string
) => {
	const runtime = ManagedRuntime.make(toLayer(config));
	try {
		return await runtime.runPromise(
			Effect.gen(function* gen() {
				const sql = yield* SqlClient.SqlClient;
				const at = new Date('2026-01-01T12:00:00.000Z');
				yield* sql.unsafe('drop table if exists c15t_utc_probe');
				yield* sql.unsafe(`create table c15t_utc_probe (at ${column})`);
				yield* sql`insert into c15t_utc_probe (at) values (${at})`;
				const rows = yield* sql.unsafe<{ wall: string }>(
					`select ${asText} as wall from c15t_utc_probe`
				);
				yield* sql.unsafe('drop table c15t_utc_probe');
				return rows[0]?.wall;
			})
		);
	} finally {
		await runtime.dispose();
	}
};

(PG_URL ? describe : describe.skip)('UTC against real Postgres', () => {
	it('stores UTC, whatever zone the URL asks for', async () => {
		const url = new URL(PG_URL ?? '');
		url.searchParams.set('options', '-c timezone=Europe/Berlin');
		assert.strictEqual(
			await storedWallClock(
				{ dialect: 'postgres', url: url.toString() },
				'timestamp(3)',
				'at::text'
			),
			'2026-01-01 12:00:00'
		);
	}, 60_000);
});

(MYSQL_URL ? describe : describe.skip)('UTC against real MySQL', () => {
	it('stores UTC, whatever zone the URL asks for', async () => {
		const url = new URL(MYSQL_URL ?? '');
		url.searchParams.set('timezone', '+01:00');
		assert.strictEqual(
			await storedWallClock(
				{ dialect: 'mysql', url: url.toString() },
				'datetime(3)',
				'cast(at as char)'
			),
			'2026-01-01 12:00:00.000'
		);
	}, 60_000);
});
