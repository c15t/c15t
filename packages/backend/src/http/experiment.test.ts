/**
 * `GET /experiments/:id/summary` over HTTP, on every engine.
 *
 * Seeds consents across two arms with different actions, surfaces and
 * decision times, then asserts the counts and the median come back grouped
 * the way the docs promise — and that the window, the domain filter and the
 * tenant scope each narrow them.
 */

import { experimentSummaryOutputSchema } from '@c15t/schema';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import * as v from 'valibot';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES, resetDatabase } from '../__tests__/engines';
import { up as baseline } from '../db/migrations/1-baseline';
import { up as indexes } from '../db/migrations/2-hot-path-indexes';
import { up as receipts } from '../db/migrations/3-consent-receipts-and-privacy-directives';
import { up as attribution } from '../db/migrations/4-experiment-attribution';
import { encodeRow, encoder } from '../db/values';
import { createApp } from './app';

const API_KEY = 'sk_test_key';
const authed = { headers: { Authorization: `Bearer ${API_KEY}` } };

const T0 = 1_800_000_000_000;
const HOUR = 3_600_000;

interface SeedConsent {
	readonly id: string;
	readonly variant: string | null;
	readonly action: string | null;
	readonly surface: string | null;
	readonly ms: number | null;
	readonly givenAt?: number;
	readonly domainId?: string;
	readonly experimentId?: string;
	readonly tenantId?: string | null;
}

/**
 * Two arms. `bar` has an odd count so its median is a real sample; `floating`
 * has an even count so the median is an interpolation.
 */
const CONSENTS: readonly SeedConsent[] = [
	{ action: 'all', id: 'cns_1', ms: 4000, surface: 'banner', variant: 'bar' },
	{ action: 'all', id: 'cns_2', ms: 4200, surface: 'banner', variant: 'bar' },
	{
		action: 'necessary',
		id: 'cns_3',
		ms: 9000,
		surface: 'banner',
		variant: 'bar',
	},
	{
		action: 'custom',
		id: 'cns_4',
		ms: null,
		surface: 'dialog',
		variant: 'bar',
	},
	{
		action: 'all',
		givenAt: T0 + 3 * HOUR,
		id: 'cns_5',
		ms: 1000,
		surface: 'banner',
		variant: 'bar',
	},
	{
		action: 'all',
		id: 'cns_6',
		ms: 2000,
		surface: 'banner',
		variant: 'floating',
	},
	{
		action: 'necessary',
		id: 'cns_7',
		ms: 6000,
		surface: 'dialog',
		variant: 'floating',
	},
	// No arm at all: recorded outside the experiment, never counted.
	{ action: 'all', id: 'cns_8', ms: 500, surface: 'banner', variant: null },
	// A different experiment, same tenant.
	{
		action: 'all',
		experimentId: 'other',
		id: 'cns_9',
		ms: 100,
		surface: 'banner',
		variant: 'bar',
	},
	// Another domain.
	{
		action: 'all',
		domainId: 'dom_2',
		id: 'cns_10',
		ms: 100,
		surface: 'widget',
		variant: 'bar',
	},
	// Another tenant, same experiment and arm.
	{
		action: 'all',
		id: 'cns_11',
		ms: 100,
		surface: 'banner',
		tenantId: 'tenant_other',
		variant: 'bar',
	},
];

for (const engine of ENGINES) {
	describe(`GET /experiments/:id/summary (${engine.name})`, () => {
		let runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
		let app: ReturnType<typeof createApp>;

		beforeEach(async () => {
			runtime = ManagedRuntime.make(engine.client);
			await runtime.runPromise(
				Effect.gen(function* migrate() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					yield* attribution;
				})
			);
			app = createApp(runtime, { apiKeys: [API_KEY] });
		});

		afterEach(async () => {
			await runtime.dispose();
		});

		const seed = () =>
			runtime.runPromise(
				Effect.gen(function* seedDatabase() {
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					const now = new Date(T0);

					for (const [id, name] of [
						['dom_1', 'example.com'],
						['dom_2', 'other.example'],
					] as const) {
						yield* sql`insert into ${sql('domain')} ${sql.insert(
							encodeRow(encode, { createdAt: now, id, name, updatedAt: now })
						)}`;
					}
					yield* sql`insert into ${sql('subject')} ${sql.insert(
						encodeRow(encode, { createdAt: now, id: 'sub_1', updatedAt: now })
					)}`;
					for (const consent of CONSENTS) {
						yield* sql`insert into ${sql('consent')} ${sql.insert(
							encodeRow(encode, {
								consentAction: consent.action,
								domainId: consent.domainId ?? 'dom_1',
								experimentId: consent.experimentId ?? 'banner-shape',
								experimentVariant: consent.variant,
								givenAt: new Date(consent.givenAt ?? T0),
								id: consent.id,
								purposeIds: '[]',
								subjectId: 'sub_1',
								tenantId: consent.tenantId ?? null,
								timeToDecisionMs: consent.ms,
								uiSource: consent.surface,
							})
						)}`;
					}
				})
			);

		const summary = async (query = '') => {
			const response = await app.request(
				`/experiments/banner-shape/summary${query}`,
				authed
			);
			assert.strictEqual(response.status, 200, await response.clone().text());
			const body = await response.json();
			const parsed = v.safeParse(experimentSummaryOutputSchema, body);
			assert.isTrue(
				parsed.success,
				parsed.success ? '' : JSON.stringify(v.flatten(parsed.issues))
			);
			return body;
		};

		it('refuses a request with no API key', async () => {
			const response = await app.request('/experiments/banner-shape/summary');
			assert.strictEqual(response.status, 401);
			assert.deepStrictEqual(await response.json(), {
				cause: { code: 'UNAUTHORIZED' },
				message: 'Unauthorized',
			});
		});

		it('counts choices per arm by action and surface, with the median', async () => {
			await seed();
			const body = await summary();

			assert.deepStrictEqual(body, {
				experimentId: 'banner-shape',
				from: null,
				to: null,
				variants: [
					{
						byAction: { all: 4, custom: 1, necessary: 1 },
						bySurface: { banner: 4, dialog: 1, widget: 1 },
						choices: 6,
						// 100, 1000, 4000, 4200, 9000 — the null is not a sample.
						medianTimeToDecisionMs: 4000,
						variant: 'bar',
					},
					{
						byAction: { all: 1, necessary: 1 },
						bySurface: { banner: 1, dialog: 1 },
						choices: 2,
						medianTimeToDecisionMs: 4000,
						variant: 'floating',
					},
				],
			});
		});

		it('reads the exact median from the middle of the ordered values', async () => {
			// Seven and six samples, spread so that any median taken from a
			// prefix or a suffix of the ordered values is far from the real one.
			const odd = [3000, 1, 2000, 100, 2, 1000, 3];
			const even = [1000, 1, 150, 2, 900, 50];
			await runtime.runPromise(
				Effect.gen(function* seedSamples() {
					const sql = yield* SqlClient.SqlClient;
					const encode = yield* encoder;
					const now = new Date(T0);
					yield* sql`insert into ${sql('domain')} ${sql.insert(
						encodeRow(encode, {
							createdAt: now,
							id: 'dom_1',
							name: 'example.com',
							updatedAt: now,
						})
					)}`;
					yield* sql`insert into ${sql('subject')} ${sql.insert(
						encodeRow(encode, { createdAt: now, id: 'sub_1', updatedAt: now })
					)}`;
					const arms = [
						['odd', odd],
						['even', even],
					] as const;
					for (const [variant, samples] of arms) {
						for (const [index, ms] of samples.entries()) {
							yield* sql`insert into ${sql('consent')} ${sql.insert(
								encodeRow(encode, {
									consentAction: 'all',
									domainId: 'dom_1',
									experimentId: 'banner-shape',
									experimentVariant: variant,
									givenAt: now,
									id: `cns_${variant}_${index}`,
									purposeIds: '[]',
									subjectId: 'sub_1',
									tenantId: null,
									timeToDecisionMs: ms,
									uiSource: 'banner',
								})
							)}`;
						}
					}
				})
			);

			const body = await summary();
			assert.deepStrictEqual(
				body.variants.map(
					(arm: { variant: string; medianTimeToDecisionMs: number }) => [
						arm.variant,
						arm.medianTimeToDecisionMs,
					]
				),
				[
					// 1, 2, 50, 150, 900, 1000: the two middle values, averaged.
					['even', 100],
					// 1, 2, 3, 100, 1000, 2000, 3000: the fourth value.
					['odd', 100],
				]
			);
		});

		it('narrows to a window on givenAt', async () => {
			await seed();
			const from = new Date(T0 + HOUR).toISOString();
			const body = await summary(`?from=${from}`);

			assert.strictEqual(body.from, from);
			assert.deepStrictEqual(body.variants, [
				{
					byAction: { all: 1 },
					bySurface: { banner: 1 },
					choices: 1,
					medianTimeToDecisionMs: 1000,
					variant: 'bar',
				},
			]);

			const upTo = await summary(`?to=${new Date(T0).toISOString()}`);
			assert.strictEqual(
				upTo.variants.find((arm: { variant: string }) => arm.variant === 'bar')
					.choices,
				5
			);
		});

		it('treats a date-only `to` as the end of that day', async () => {
			await seed();
			// cns_5 is three hours after T0, on the same UTC day. A `to` that
			// stopped at midnight would leave it out.
			const day = new Date(T0).toISOString().slice(0, 10);
			const body = await summary(`?to=${day}`);

			assert.strictEqual(body.to, `${day}T23:59:59.999Z`);
			assert.strictEqual(
				body.variants.find((arm: { variant: string }) => arm.variant === 'bar')
					.choices,
				6
			);

			const from = await summary(`?from=${day}`);
			assert.strictEqual(from.from, `${day}T00:00:00.000Z`);
		});

		it('rejects a window that ends before it starts', async () => {
			const response = await app.request(
				`/experiments/banner-shape/summary?from=${new Date(
					T0 + HOUR
				).toISOString()}&to=${new Date(T0).toISOString()}`,
				authed
			);
			assert.strictEqual(response.status, 400);
			const body = await response.json();
			assert.strictEqual(body.cause.code, 'INPUT_VALIDATION_FAILED');
			assert.match(body.message, /from must not be later than to/u);
		});

		it('rejects an empty domain', async () => {
			const response = await app.request(
				'/experiments/banner-shape/summary?domain=',
				authed
			);
			assert.strictEqual(response.status, 400);
			const body = await response.json();
			assert.strictEqual(body.cause.code, 'INPUT_VALIDATION_FAILED');
			assert.match(body.message, /domain/u);
		});

		it('narrows to one domain', async () => {
			await seed();
			const body = await summary('?domain=other.example');

			assert.deepStrictEqual(body.variants, [
				{
					byAction: { all: 1 },
					bySurface: { widget: 1 },
					choices: 1,
					medianTimeToDecisionMs: 100,
					variant: 'bar',
				},
			]);
		});

		it('returns no arms for an experiment nobody has chosen under', async () => {
			await seed();
			const response = await app.request(
				'/experiments/does-not-exist/summary',
				authed
			);
			assert.strictEqual(response.status, 200);
			assert.deepStrictEqual(await response.json(), {
				experimentId: 'does-not-exist',
				from: null,
				to: null,
				variants: [],
			});
		});

		it('rejects an unparseable window bound', async () => {
			const response = await app.request(
				'/experiments/banner-shape/summary?from=yesterday',
				authed
			);
			assert.strictEqual(response.status, 400);
			const body = await response.json();
			assert.strictEqual(body.cause.code, 'INPUT_VALIDATION_FAILED');
			assert.match(
				body.message,
				/from: Expected an ISO 8601 date or timestamp/u
			);
		});

		it('lists the query parameters in the OpenAPI document', async () => {
			const spec = await (await app.request('/spec.json')).json();
			const operation = spec.paths['/experiments/{id}/summary'].get;
			const names = operation.parameters.map(
				(parameter: { in: string; name: string }) =>
					`${parameter.in}:${parameter.name}`
			);
			assert.includeMembers(names, ['query:domain', 'query:from', 'query:to']);
		});

		it('sees only its own tenant', async () => {
			await seed();
			const scoped = createApp(runtime, {
				apiKeys: [API_KEY],
				tenantId: 'tenant_other',
			});
			const response = await scoped.request(
				'/experiments/banner-shape/summary',
				authed
			);
			const body = await response.json();
			assert.deepStrictEqual(body.variants, [
				{
					byAction: { all: 1 },
					bySurface: { banner: 1 },
					choices: 1,
					medianTimeToDecisionMs: 100,
					variant: 'bar',
				},
			]);
		});
	});
}
