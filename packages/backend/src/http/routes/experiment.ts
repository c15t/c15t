/**
 * `GET /experiments/:id/summary` — per-arm choice counts for a banner
 * experiment.
 *
 * Registered by `createApp`. API-key only, like `GET /subjects`: it reports
 * aggregate counts rather than any one subject's record, but the counts are
 * still the tenant's data and there is no reason a browser should read them.
 *
 * ## This counts choices, not impressions
 *
 * A consent row is written when a subject acts. An impression that led to
 * nothing, and a dismissed opt-out notice, never reach the backend, so this
 * route cannot compute an opt-in *rate* — only the numerator. Compute rates
 * client-side by sending `c15t_surface_shown` and `c15t_choice_recorded` to
 * your analytics with `experiment.reportTo`; see
 * `docs/guides/banner-experiments.mdx`, "Report impressions and choices".
 *
 * What it can answer without any analytics tooling: how choices split by
 * action (`all`, `necessary`, `custom`) and by surface (`banner`, `dialog`,
 * `widget`) under each arm, and the median time to decision, over a window
 * and optionally one domain.
 *
 * ## The window
 *
 * `from`, `to` and `domain` are validated by `experimentSummaryQuerySchema`,
 * which is also what lists them in the OpenAPI document. A bound is an ISO
 * 8601 date or timestamp. A date-only `from` is the start of that day and a
 * date-only `to` is its end, both UTC, so `?from=2026-09-01&to=2026-09-30`
 * is the whole of September. A window that ends before it starts is a 400.
 *
 * Only consents written after migration 4 carry the attribution columns this
 * groups on. Older rows keep the arm inside `metadata` and are not counted.
 */

import {
	experimentSummaryOutputSchema,
	experimentSummaryQuerySchema,
} from '@c15t/schema';
import { Effect } from 'effect';
import { describeRoute, validator } from 'hono-openapi';
import * as v from 'valibot';

import { summarizeExperiment } from '../../repository/experiment';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError } from '../errors';

/** Milliseconds in a day, less one: what a date-only `to` is pushed to. */
const END_OF_DAY_MS = 86_400_000 - 1;

/** Whether the value is a date with no time part, `YYYY-MM-DD`. */
const isDateOnly = (value: string): boolean => value.length === 10;

/** An issue as the validator middleware reports it: Standard Schema shape. */
interface ValidationIssue {
	readonly message: string;
	readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
}

/** Same summary the body routes give for a rejected body. */
const describeIssues = (issues: readonly ValidationIssue[]): string =>
	issues
		.slice(0, 5)
		.map((issue) => {
			const path = issue.path
				?.map((segment) =>
					String(typeof segment === 'object' ? segment.key : segment)
				)
				.join('.');
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join('; ');

/**
 * The window's lower bound. A date-only value is midnight UTC, which is
 * what `Date` already does with the `YYYY-MM-DD` form.
 */
const lowerBound = (value: string | undefined): Date | undefined =>
	value === undefined ? undefined : new Date(value);

/**
 * The window's upper bound. A date-only value means the whole of that day,
 * so it is moved to the last millisecond before midnight. Millisecond
 * precision is what every engine's `givenAt` column keeps.
 */
const upperBound = (value: string | undefined): Date | undefined => {
	if (value === undefined) {
		return undefined;
	}
	const parsed = new Date(value);
	return isDateOnly(value)
		? new Date(parsed.getTime() + END_OF_DAY_MS)
		: parsed;
};

export const register = function register({
	app,
	options,
	run,
}: RouteContext): void {
	app.get(
		'/experiments/:id/summary',
		describeRoute({
			description:
				'Choices recorded under each arm of a banner experiment, split by ' +
				'consent action and surface, with the median time to decision. ' +
				'Impressions never reach the backend, so rates must be computed ' +
				'from the client-side reports.',
			security: [{ bearerAuth: [] }],
			summary: 'Summarise a banner experiment',
			tags: ['Experiment'],
		}),
		// Before validation, so a caller without a key learns nothing about
		// what the query accepts.
		(c, next) => {
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{ cause: { code: 'UNAUTHORIZED' }, message: 'Unauthorized' },
					401
				);
			}
			return next();
		},
		// Validates the query and lists its parameters in the OpenAPI document.
		// The hook replaces the middleware's own error body with the one every
		// other route uses for a rejected input.
		validator('query', experimentSummaryQuerySchema, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						cause: { code: 'INPUT_VALIDATION_FAILED' },
						message: `Invalid summary query: ${describeIssues(result.error)}`,
					},
					400
				);
			}
			return undefined;
		}),
		async (c) => {
			const experimentId = c.req.param('id');
			const query = c.req.valid('query');

			const result = await run(
				c,
				Effect.gen(function* result() {
					const from = lowerBound(query.from);
					const to = upperBound(query.to);
					if (from !== undefined && to !== undefined && from > to) {
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: 'from must not be later than to',
						});
					}

					const variants = yield* summarizeExperiment(experimentId, {
						domain: query.domain,
						from,
						to,
					});

					return {
						experimentId,
						from: from?.toISOString() ?? null,
						to: to?.toISOString() ?? null,
						variants,
					};
				})
			);

			if (!result.ok) {
				return c.json(result.failure.body, result.failure.status);
			}

			const checked = v.safeParse(experimentSummaryOutputSchema, result.value);
			if (!checked.success) {
				throw new Error(
					`Response does not satisfy experimentSummaryOutputSchema: ${JSON.stringify(
						v.flatten(checked.issues)
					)}`
				);
			}

			return c.json(result.value);
		}
	);
};
