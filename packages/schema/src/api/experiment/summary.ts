/**
 * GET /experiments/:id/summary schemas - Per-arm choice counts (requires API key).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

/** An ISO 8601 date or timestamp `Date.parse` accepts. */
const isoDateSchema = v.pipe(
	v.string(),
	v.check(
		(value) => !Number.isNaN(Date.parse(value)),
		'Expected an ISO 8601 date or timestamp'
	)
);

/**
 * GET /experiments/:id/summary query params
 */
export const experimentSummaryQuerySchema = v.object({
	/** Only consents recorded for this domain name. */
	domain: v.optional(
		v.pipe(v.string(), v.minLength(1), v.examples(['example.com']))
	),
	/** Only consents given at or after this instant. */
	from: v.optional(
		v.pipe(isoDateSchema, v.examples(['2026-09-01', '2026-09-01T00:00:00Z']))
	),
	/** Only consents given at or before this instant. */
	to: v.optional(v.pipe(isoDateSchema, v.examples(['2026-09-30T23:59:59Z']))),
});

/**
 * One arm of an experiment, as the summary reports it.
 */
export const experimentVariantSummarySchema = v.object({
	/** Consents recorded under this arm, `byAction` and `bySurface` summed. */
	byAction: v.record(v.string(), v.number()),
	bySurface: v.record(v.string(), v.number()),
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
export type ExperimentSummaryQuery = v.InferOutput<
	typeof experimentSummaryQuerySchema
>;
export type ExperimentSummaryOutput = v.InferOutput<
	typeof experimentSummaryOutputSchema
>;
export type ExperimentVariantSummary = v.InferOutput<
	typeof experimentVariantSummarySchema
>;
