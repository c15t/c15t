/**
 * GET /experiments/:id/summary schemas - Per-arm choice counts (requires an
 * API key).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

/** An ISO 8601 date (`2026-09-30`) or timestamp (`2026-09-30T23:59:59Z`). */
const isoDateOrTimestampSchema = v.union(
	[v.pipe(v.string(), v.isoDate()), v.pipe(v.string(), v.isoTimestamp())],
	'Expected an ISO 8601 date or timestamp'
);

/**
 * GET /experiments/:id/summary query params
 */
export const experimentSummaryQuerySchema = v.object({
	/** Only consents recorded for this domain name. */
	domain: v.optional(
		v.pipe(
			v.string(),
			v.minLength(1),
			v.description('Only consents recorded for this domain name.'),
			v.examples(['example.com'])
		)
	),
	/**
	 * Only consents given at or after this instant. A date without a time
	 * means the start of that day, UTC.
	 */
	from: v.optional(
		v.pipe(
			isoDateOrTimestampSchema,
			v.description(
				'Only consents given at or after this instant. A date without a ' +
					'time means the start of that day, UTC. Must not be later than `to`.'
			),
			v.examples(['2026-09-01', '2026-09-01T00:00:00Z'])
		)
	),
	/**
	 * Only consents given at or before this instant. A date without a time
	 * means the end of that day, UTC, so `to=2026-09-30` includes the 30th.
	 */
	to: v.optional(
		v.pipe(
			isoDateOrTimestampSchema,
			v.description(
				'Only consents given at or before this instant. A date without a ' +
					'time means the end of that day, UTC, so `2026-09-30` includes ' +
					'the whole of the 30th.'
			),
			v.examples(['2026-09-30', '2026-09-30T23:59:59Z'])
		)
	),
});

/**
 * One arm of an experiment, as the summary reports it.
 */
export const experimentVariantSummarySchema = v.object({
	/** Consents per `consentAction` (`all`, `necessary`, `custom`, …). */
	byAction: v.record(v.string(), v.number()),
	/** Consents per `uiSource` (`banner`, `dialog`, `widget`, …). */
	bySurface: v.record(v.string(), v.number()),
	/** Consents recorded under this arm, `byAction` and `bySurface` summed. */
	choices: v.pipe(v.number(), v.integer(), v.minValue(0)),
	/**
	 * Median `timeToDecisionMs` over the choices that carried one, or `null`
	 * when none did.
	 */
	medianTimeToDecisionMs: v.nullable(v.number()),
	variant: v.string(),
});

/**
 * GET /experiments/:id/summary output schema
 */
export const experimentSummaryOutputSchema = v.object({
	experimentId: v.string(),
	/** The `from` filter as applied, or `null` when unbounded. */
	from: v.nullable(v.string()),
	/** The `to` filter as applied, or `null` when unbounded. */
	to: v.nullable(v.string()),
	/** Sorted by arm name. Empty when no consent carries this experiment id. */
	variants: v.array(experimentVariantSummarySchema),
});

// Type exports
/**
 * Query parameters of `GET /experiments/:id/summary`: an optional `from`/`to`
 * window and an optional `domain` filter. Inferred from
 * {@link experimentSummaryQuerySchema}.
 */
export type ExperimentSummaryQuery = v.InferOutput<
	typeof experimentSummaryQuerySchema
>;
/**
 * Response body of `GET /experiments/:id/summary`: the experiment id, the
 * window as applied, and one {@link ExperimentVariantSummary} per arm. Inferred
 * from {@link experimentSummaryOutputSchema}.
 */
export type ExperimentSummaryOutput = v.InferOutput<
	typeof experimentSummaryOutputSchema
>;
/**
 * One arm of an experiment as the summary reports it: choices split by
 * consent action and surface, plus the median time to decision. Inferred from
 * {@link experimentVariantSummarySchema}.
 */
export type ExperimentVariantSummary = v.InferOutput<
	typeof experimentVariantSummarySchema
>;
