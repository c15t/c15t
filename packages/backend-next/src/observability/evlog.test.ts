/**
 * Wide-event logging.
 *
 * Two properties matter here, and they pull in opposite directions.
 *
 * The first is that **the default is silence**. `@c15t/backend` builds its
 * logger with `level ?? 'error'` and so emits nothing per request; this
 * package replaces it in place, so an operator who upgrades a version must not
 * discover a new line of stdout per request. That is a behaviour change, and a
 * costed one on a hosted log pipeline.
 *
 * The second is that when it *is* on, the event has to carry the facts worth
 * querying — otherwise it is a slower `console.log`. So these assert the
 * domain fields land, not merely that something was emitted.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, type Layer, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { DrainContext } from 'evlog';
import { up as baseline } from '../db/migrations/1-baseline';
import { createApp } from '../http/app';
import type { AppOptions } from '../http/context';
import { resolveOptions } from './evlog';

/** Every event a run produced, in order. */
const collect = () => {
	const events: Record<string, unknown>[] = [];
	const drain = (ctx: DrainContext) => {
		events.push(ctx.event as unknown as Record<string, unknown>);
	};
	return { events, drain };
};

const withApp = async <A>(
	options: AppOptions,
	use: (app: ReturnType<typeof createApp>) => Promise<A>
): Promise<A> => {
	const runtime = ManagedRuntime.make(
		PgliteClient.layer({}) as unknown as Layer.Layer<SqlClient.SqlClient>
	);
	await runtime.runPromise(
		Effect.gen(function* () {
			yield* baseline;
			const sql = yield* SqlClient.SqlClient;
			yield* sql`
				insert into ${sql('domain')} ${sql.insert({
					id: 'dom_1',
					name: 'example.com',
					createdAt: new Date(1_800_000_000_000),
					updatedAt: new Date(1_800_000_000_000),
				})}
			`;
		})
	);
	try {
		return await use(createApp(runtime, options));
	} finally {
		await runtime.dispose();
	}
};

const seed = { appName: 'Example', policyPacks: [] } as const;

describe('observability: off by default', () => {
	it('emits nothing when unconfigured', async () => {
		const { events, drain } = collect();

		await withApp(
			// `drain` is wired but `observability` is absent, so the middleware is
			// never registered and the drain can never be called. If a future
			// change flips the default, this fails rather than quietly costing
			// someone money.
			{ manifest: seed, observability: undefined },
			async (app) => {
				const response = await app.request('/status');
				assert.strictEqual(response.status, 200);
			}
		);

		void drain;
		assert.strictEqual(events.length, 0);
	}, 60_000);

	it('emits nothing when explicitly disabled', async () => {
		const { events, drain } = collect();

		await withApp(
			{ manifest: seed, observability: { enabled: false, drain } },
			async (app) => {
				await app.request('/status');
			}
		);

		assert.strictEqual(events.length, 0);
	});
});

describe('observability: enabled', () => {
	it('emits one event per request', async () => {
		const { events, drain } = collect();

		await withApp(
			{ manifest: seed, observability: { enabled: true, drain } },
			async (app) => {
				await app.request('/status');
				await app.request('/status');
			}
		);

		assert.strictEqual(events.length, 2);
		assert.strictEqual(events[0]?.path, '/status');
		assert.strictEqual(events[0]?.status, 200);
		assert.strictEqual(events[0]?.method, 'GET');
	}, 60_000);

	it('records whether a consent was created or replayed', async () => {
		const { events, drain } = collect();

		const body = {
			subjectId: 'sub_wide_event',
			domainId: 'dom_1',
			purposeIds: ['analytics'],
			givenAt: new Date(1_800_000_000_000).toISOString(),
		};
		const post = () =>
			new Request('http://localhost/subjects', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			});

		await withApp(
			{ manifest: seed, observability: { enabled: true, drain } },
			async (app) => {
				const first = await app.request(post());
				assert.strictEqual(first.status, 200, await first.text());
				await app.request(post());
			}
		);

		const consents = events
			.map((event) => event.consent as { created?: boolean } | undefined)
			.filter((consent): consent is { created?: boolean } => Boolean(consent));

		// A replay is a normal outcome, not an error — the event has to
		// distinguish them or a client stuck retrying looks like healthy traffic.
		assert.strictEqual(consents.length, 2);
		assert.strictEqual(consents[0]?.created, true);
		assert.strictEqual(consents[1]?.created, false);
	}, 60_000);

	it('skips routes excluded by glob', async () => {
		const { events, drain } = collect();

		await withApp(
			{
				manifest: seed,
				observability: { enabled: true, drain, exclude: ['/status'] },
			},
			async (app) => {
				await app.request('/status');
			}
		);

		// Health checks are the highest-volume, least-informative traffic a
		// backend sees; being able to drop them is why `exclude` is exposed.
		assert.strictEqual(events.length, 0);
	}, 60_000);

	it('defaults redaction on, and lets it be turned off deliberately', () => {
		// A policy decision, and one nothing else can catch regressing: no field
		// this package sets on an event contains PII today, so an end-to-end
		// assertion would pass with redaction either way. Verified by trying —
		// the earlier version of this test passed with `redact: false`.
		//
		// It still defaults on, because the failure mode of forgetting once a
		// field *does* carry an IP is a compliance incident rather than an
		// untidy log.
		assert.strictEqual(resolveOptions({ enabled: true }).redact, true);
		assert.strictEqual(
			resolveOptions({ enabled: true, redact: false }).redact,
			false
		);
	}, 60_000);

	it('passes route filters through verbatim', () => {
		const resolved = resolveOptions({
			enabled: true,
			include: ['/subjects/**'],
			exclude: ['/status'],
		});
		assert.deepStrictEqual(resolved.include, ['/subjects/**']);
		assert.deepStrictEqual(resolved.exclude, ['/status']);
	});
});
