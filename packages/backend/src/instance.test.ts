/**
 * The public entry point.
 *
 * Everything else in this package is reachable only through `c15tInstance`, so
 * these are the tests that speak for a consumer. Until this file existed the
 * package's `index.ts` was literally `export {}` — a fully working backend
 * with no way to use it, which no amount of internal coverage would have
 * surfaced.
 *
 * The cases are chosen around the one thing the cutover changes for callers:
 * `database` replaces 2.x's `adapter`. Both accepted forms are exercised,
 * because the config object is what a self-hoster writes and the layer is what
 * makes the config object not a dead end.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { toLayer } from './db/connect';
import { up as baseline } from './db/migrations/1-baseline';
import { c15tInstance } from './instance';
import { composePacks, policyBuilder } from './policy/builder';

/**
 * A migrated database, as a layer that hands out the *same* client.
 *
 * `PgliteClient.layer({})` cannot be shared by passing it twice: each build
 * creates a fresh in-process database, so an instance handed that layer would
 * connect to an empty one and every request would 503. Learned by doing
 * exactly that.
 *
 * Building the client once and wrapping it in `Layer.succeed` is also the
 * honest version of the case being tested — "the caller already has a pool and
 * wants c15t to use it" is precisely why the layer form exists.
 */
const migrated = async () => {
	const runtime = ManagedRuntime.make(
		PgliteClient.layer({}) as unknown as Layer.Layer<SqlClient.SqlClient, never>
	);
	await runtime.runPromise(baseline);

	const client = await runtime.runPromise(
		Effect.gen(function* () {
			return yield* SqlClient.SqlClient;
		})
	);
	return {
		layer: Layer.succeed(SqlClient.SqlClient, client),
		dispose: () => runtime.dispose(),
	};
};

describe('c15tInstance', () => {
	it('serves a request through a supplied client layer', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({ database: layer });

		try {
			const response = await instance.handler(
				new Request('http://localhost/status')
			);
			assert.strictEqual(response.status, 200);
		} finally {
			await instance.dispose();
			await dispose();
		}
	}, 60_000);

	it('accepts a plain config object without the caller touching Effect', async () => {
		// The point of the config form: no Layer, no Redacted, no driver
		// import at the call site. SQLite because it needs no server.
		const instance = c15tInstance({
			database: { dialect: 'sqlite', filename: ':memory:' },
		});

		try {
			const layer = toLayer({ dialect: 'sqlite', filename: ':memory:' });
			assert.isDefined(layer);

			// The database is empty — no migration has run — so this answers
			// unhealthy rather than throwing. That it answers at all is the
			// assertion: the driver resolved and a connection was made from
			// nothing but `{ dialect, filename }`.
			const response = await instance.handler(
				new Request('http://localhost/status')
			);
			assert.oneOf(response.status, [200, 503]);
		} finally {
			await instance.dispose();
		}
	}, 60_000);

	it('releases its pool on dispose', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({ database: layer });
		await instance.handler(new Request('http://localhost/status'));

		await instance.dispose();
		await dispose();

		// Nothing to assert beyond "this did not hang or throw" — a pool that
		// cannot be released is a leak in every test and script that builds
		// an instance, which is why `dispose` is on the public interface.
		assert.isTrue(true);
	}, 60_000);

	it('passes app options through to the routes', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({
			database: layer,
			// Listing subjects is key-only; with no keys configured nothing
			// authenticates, which is the documented safe default.
			apiKeys: [],
		});

		try {
			const response = await instance.handler(
				new Request('http://localhost/subjects?externalId=ext_1')
			);
			assert.strictEqual(response.status, 401);
		} finally {
			await instance.dispose();
			await dispose();
		}
	}, 60_000);
});

describe('basePath', () => {
	it('routes a request that arrives with the mount prefix', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({
			database: layer,
			basePath: '/api/self-host',
		});

		try {
			// How a Next.js catch-all actually delivers it. Without stripping,
			// every route 404s and the cause is not obvious.
			const response = await instance.handler(
				new Request('http://localhost/api/self-host/status')
			);
			assert.strictEqual(response.status, 200);
		} finally {
			await instance.dispose();
			await dispose();
		}
	}, 60_000);

	it('leaves a request alone when no basePath is set', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({ database: layer });

		try {
			const response = await instance.handler(
				new Request('http://localhost/status')
			);
			assert.strictEqual(response.status, 200);
		} finally {
			await instance.dispose();
			await dispose();
		}
	}, 60_000);

	it('ignores a path that does not carry the prefix', async () => {
		const { layer, dispose } = await migrated();
		const instance = c15tInstance({
			database: layer,
			basePath: '/api/self-host',
		});

		try {
			// Stripping must be conditional: a request that already lacks the
			// prefix would otherwise have its first path segment eaten.
			const response = await instance.handler(
				new Request('http://localhost/status')
			);
			assert.strictEqual(response.status, 200);
		} finally {
			await instance.dispose();
			await dispose();
		}
	}, 60_000);
});

describe('policy authoring', () => {
	it('builds and composes packs', () => {
		const pack = policyBuilder.createPack([
			{ id: 'eu', countries: ['DE'], model: 'opt-in' },
			{ id: 'us', countries: ['US'], model: 'opt-out' },
		]);

		const composed = composePacks(pack, [
			// A duplicate id must lose to the earlier pack rather than shadow it,
			// or composition order silently changes which policy a visitor gets.
			...policyBuilder.createPack([{ id: 'eu', countries: ['FR'] }]),
		]);

		assert.deepStrictEqual(
			composed.map((policy) => policy.id),
			['eu', 'us']
		);
		assert.deepStrictEqual(composed[0]?.match?.countries, ['DE']);
	});
});
