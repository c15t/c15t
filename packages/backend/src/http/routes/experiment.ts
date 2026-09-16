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
 * Only consents written after migration 4 carry the attribution columns this
 * groups on. Older rows keep the arm inside `metadata` and are not counted.
 */

import { experimentSummaryOutputSchema } from '@c15t/schema';
import { Effect } from 'effect';
import { describeRoute } from 'hono-openapi';
import * as v from 'valibot';

import { summarizeExperiment } from '../../repository/experiment';
import { validateRequestAuth } from '../auth';
import type { RouteContext } from '../context';
import { BadRequestError } from '../errors';

/** Longest experiment id a consent row can carry; see `attributionFields`. */
const EXPERIMENT_ID_MAX = 128;

const parseBound = (
	value: string | undefined,
	field: 'from' | 'to'
): Date | undefined | BadRequestError => {
	if (value === undefined || value === '') {
		return undefined;
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return new BadRequestError({
			code: 'INPUT_VALIDATION_FAILED',
			message: `${field} must be an ISO 8601 date or timestamp`,
		});
	}
	return parsed;
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
		async (c) => {
			if (!validateRequestAuth(c.req.raw.headers, options.apiKeys)) {
				return c.json(
					{ cause: { code: 'UNAUTHORIZED' }, message: 'Unauthorized' },
					401
				);
			}

			const experimentId = c.req.param('id');
			const fromQuery = c.req.query('from');
			const toQuery = c.req.query('to');
			const domain = c.req.query('domain');

			const result = await run(
				c,
				Effect.gen(function* result() {
					if (experimentId.length > EXPERIMENT_ID_MAX) {
						// Longer than any stored id, so the answer is known without a
						// query; said so rather than answered with an empty list.
						return yield* new BadRequestError({
							code: 'INPUT_VALIDATION_FAILED',
							message: `experiment id must be at most ${EXPERIMENT_ID_MAX} characters`,
						});
					}
					const from = parseBound(fromQuery, 'from');
					if (from instanceof BadRequestError) {
						return yield* from;
					}
					const to = parseBound(toQuery, 'to');
					if (to instanceof BadRequestError) {
						return yield* to;
					}

					const variants = yield* summarizeExperiment(experimentId, {
						domain: domain === undefined || domain === '' ? undefined : domain,
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

			const parsed = v.safeParse(experimentSummaryOutputSchema, result.value);
			if (!parsed.success) {
				throw new Error(
					`Response does not satisfy experimentSummaryOutputSchema: ${JSON.stringify(
						v.flatten(parsed.issues)
					)}`
				);
			}

			return c.json(result.value);
		}
	);
};
