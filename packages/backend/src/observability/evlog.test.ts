/**
 * Wide-event logging.
 *
 * The default is the interesting case, and it is two claims at once: logging
 * is **on**, so a new self-hoster is not debugging failures by guesswork, and
 * a **successful request is silent**, so nobody upgrading discovers a line per
 * request and a bigger log bill.
 *
 * That combination is not one setting. Hono answers a thrown handler error
 * with a 500 *response* rather than propagating it, so evlog sees a status and
 * never an exception, and the event's level stays `info` even for a 500 —
 * head sampling alone drops exactly the requests worth keeping. It takes
 * status-based grading *and* a keep rule, which is why both are asserted here
 * rather than trusted.
 *
 * When the full stream is on, the event also has to carry the facts worth
 * querying, or it is a slower `console.log`. So the domain fields are asserted
 * too.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { assert, describe, it } from '@effect/vitest';
import { Effect, ManagedRuntime } from 'effect';
import type { Layer } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import type { DrainContext } from 'evlog';

import { up as baseline } from '../db/migrations/1-baseline';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { createApp } from '../http/app';
import type { AppOptions } from '../http/context';
import { resolveOptions } from './evlog';

/** Every event a run produced, in order. */
const collect = () => {
	const events: Record<string, unknown>[] = [];
	const drain = (ctx: DrainContext) => {
		events.push(ctx.event as unknown as Record<string, unknown>);
	};
	return { drain, events };
};

const withApp = async <A>(
	options: AppOptions,
	runWith: (app: ReturnType<typeof createApp>) => Promise<A>
): Promise<A> => {
	const runtime = ManagedRuntime.make(
		PgliteClient.layer({}) as unknown as Layer.Layer<SqlClient.SqlClient>
	);
	await runtime.runPromise(
		// oxlint-disable-next-line no-shadow -- Preserve established bindings and assignment semantics.
		Effect.gen(function* withApp() {
			yield* baseline;
			yield* receipts;
			const sql = yield* SqlClient.SqlClient;
			yield* sql`
				insert into ${sql('domain')} ${sql.insert({
					createdAt: new Date(1_800_000_000_000),
					id: 'dom_1',
					name: 'example.com',
					updatedAt: new Date(1_800_000_000_000),
				})}
			`;
		})
	);
	try {
		return await runWith(createApp(runtime, options));
	} finally {
		await runtime.dispose();
	}
};

const seed = { appName: 'Example', policyRules: [] } as const;

describe('observability: the default', () => {
	it('stays quiet on a successful request', async () => {
		const { events, drain } = collect();

		await withApp(
			// No `level` — the default must be quiet when nothing is wrong.
			{ manifest: seed, observability: { drain } },
			async (app) => {
				const response = await app.request('/status');
				assert.strictEqual(response.status, 200);
			}
		);

		assert.strictEqual(events.length, 0);
	}, 60_000);

	it('reports a rejected request at warn', async () => {
		const { events, drain } = collect();

		await withApp(
			{ apiKeys: [], manifest: seed, observability: { drain } },
			async (app) => {
				// 401: no API key configured, so nothing authenticates.
				const response = await app.request('/subjects?externalId=ext_1');
				assert.strictEqual(response.status, 401);
			}
		);

		// Kept despite head sampling, and graded from the status rather than
		// left at info — without both, a new self-hoster sees nothing at all
		// when their requests are being rejected.
		assert.strictEqual(events.length, 1);
		assert.strictEqual(events[0]?.status, 401);
		assert.strictEqual(events[0]?.level, 'warn');
	}, 60_000);

	it('emits nothing at all when silenced', async () => {
		const { events, drain } = collect();

		await withApp(
			{
				apiKeys: [],
				manifest: seed,
				observability: { drain, level: 'silent' },
			},
			async (app) => {
				await app.request('/status');
				await app.request('/subjects?externalId=ext_1');
			}
		);

		// Not even the failure. `silent` registers no middleware at all.
		assert.strictEqual(events.length, 0);
	}, 60_000);
});

describe("observability: level 'info'", () => {
	it('emits one event per request', async () => {
		const { events, drain } = collect();

		await withApp(
			{ manifest: seed, observability: { drain, level: 'info' } },
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
			domain: 'example.com',
			givenAt: 1_700_000_000_000,
			preferences: { analytics: true, necessary: true },
			subjectId: 'sub_wideevent',
			type: 'cookie_banner',
		};
		const post = () =>
			new Request('http://localhost/subjects', {
				body: JSON.stringify(body),
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			});

		await withApp(
			{ manifest: seed, observability: { drain, level: 'info' } },
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
				observability: { drain, exclude: ['/status'], level: 'info' },
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
		assert.strictEqual(resolveOptions({}).redact, true);
		assert.strictEqual(resolveOptions({ redact: false }).redact, false);
	}, 60_000);

	it('passes route filters through verbatim', () => {
		const resolved = resolveOptions({
			exclude: ['/status'],
			include: ['/subjects/**'],
		});
		assert.deepStrictEqual(resolved.include, ['/subjects/**']);
		assert.deepStrictEqual(resolved.exclude, ['/status']);
	});
});

describe('a database failure', () => {
	it('records the cause in the wide event', async () => {
		const { events, drain } = collect();

		// Its own runtime, because the shared harness migrates a working schema
		// and this needs a broken one.
		const runtime = ManagedRuntime.make(
			PgliteClient.layer({}) as unknown as Layer.Layer<SqlClient.SqlClient>
		);
		try {
			const app = createApp(runtime, {
				apiKeys: ['sk_test'],
				manifest: seed,
				observability: { drain },
			});

			// No baseline at all, so the read path's first query fails. The
			// response is deliberately opaque — table and column names in a body
			// are information disclosure — which only works if the detail is
			// recorded somewhere. It was not: `toHttp` dropped the error and
			// nothing else looked at it, so a 500 left an operator with the
			// status and nothing else.
			const response = await app.request('/subjects?externalId=ext_1', {
				headers: { Authorization: 'Bearer sk_test' },
			});
			assert.strictEqual(response.status, 500);
			assert.notInclude(await response.text(), 'subject');
		} finally {
			await runtime.dispose();
		}

		const event = events.at(-1);
		assert.isDefined(event, 'a failed request emitted no event');
		// Specifically the SQL failure. A looser check — "the event mentions
		// error somewhere" — passes either way, because a 500 already sets
		// `level: 'error'`; the first version of this test did exactly that and
		// proved nothing. Verified by removing the fix and watching this fail.
		const recorded = (event as { error?: { name?: string } }).error;
		assert.isDefined(recorded, 'the wide event carried no error');
		assert.include(recorded?.name ?? '', 'SqlError');
	});
});
