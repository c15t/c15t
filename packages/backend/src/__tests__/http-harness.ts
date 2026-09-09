/**
 * A migrated app on one engine, for HTTP-level tests.
 *
 * Every HTTP test in this package stands up the same thing: a runtime on an
 * engine, the three migrations, an app with some options, and a few helpers
 * to issue requests and count rows. Doing it once here keeps the receipt and
 * privacy suites about behaviour rather than about setup.
 */

import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { encodeRow, encoder } from '../db/values';
import { createApp } from '../http/app';
import type { AppOptions } from '../http/context';
import { resetDatabase } from './engines';
import type { TestEngine } from './engines';

export interface HttpHarness {
	readonly app: ReturnType<typeof createApp>;
	readonly runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
	/** A second app over the same database with different options. */
	readonly appWith: (options: AppOptions) => ReturnType<typeof createApp>;
	readonly json: (
		method: 'GET' | 'POST' | 'PATCH',
		path: string,
		body?: unknown,
		headers?: Record<string, string>,
		app?: ReturnType<typeof createApp>
	) => Promise<{ status: number; body: Record<string, unknown> }>;
	/** Row count, optionally filtered by one column. */
	readonly count: (
		table: string,
		where?: { column: string; value: string }
	) => Promise<number>;
	/** Inserts a row through the engine's encoder. */
	readonly insert: (
		table: string,
		values: Record<string, unknown>
	) => Promise<void>;
	readonly dispose: () => Promise<void>;
}

export const createHttpHarness = async function createHttpHarness(
	engine: TestEngine,
	options: AppOptions
): Promise<HttpHarness> {
	const runtime = ManagedRuntime.make(engine.client);
	await runtime.runPromise(
		Effect.gen(function* migrate() {
			yield* resetDatabase;
			yield* baseline;
			yield* indexes;
			yield* receipts;
		})
	);
	const app = createApp(runtime, options);

	const json: HttpHarness['json'] = async (
		method,
		path,
		body,
		headers = {},
		target = app
	) => {
		const requestHeaders: Record<string, string> = { ...headers };
		if (body !== undefined) {
			requestHeaders['Content-Type'] = 'application/json';
		}
		const response = await target.request(path, {
			body: body === undefined ? undefined : JSON.stringify(body),
			headers: requestHeaders,
			method,
		});
		const text = await response.text();
		let parsed: Record<string, unknown> = {};
		try {
			parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
		} catch {
			parsed = { raw: text };
		}
		return { body: parsed, status: response.status };
	};

	return {
		app,
		appWith: (next) => createApp(runtime, next),
		count: (table, where) =>
			runtime.runPromise(
				Effect.gen(function* count() {
					const sql = yield* SqlClient.SqlClient;
					const rows = yield* where
						? sql<{ total: number | string }>`
								select count(*) as total from ${sql(table)}
								where ${sql(where.column)} = ${where.value}
							`
						: sql<{ total: number | string }>`
								select count(*) as total from ${sql(table)}
							`;
					return Number(rows[0]?.total ?? 0);
				})
			),
		dispose: () => runtime.dispose(),
		insert: (table, values) =>
			runtime.runPromise(
				Effect.gen(function* insert() {
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					yield* sql`insert into ${sql(table)} ${sql.insert(
						encodeRow(encode, values)
					)}`;
				})
			),
		json,
		runtime,
	};
};
