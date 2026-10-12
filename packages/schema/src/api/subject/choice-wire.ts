/**
 * v3 explicit-choice receipts on the wire (POST /subject).
 *
 * Structurally identical to the core record contract (one latest decision
 * per optional category with its own confirmation time and policy basis)
 * so a backend can validate what a client actually confirmed instead of
 * reading one `givenAt` for a merged boolean map. The names end in `Wire`
 * on purpose: core owns the record, this is only its transport shape.
 *
 * Structural checks only. `confirmedAt` must be a safe, non-negative epoch
 * millisecond integer inside the `Date` range; freshness and the
 * not-in-the-future bound take an explicit `now` at runtime and belong to
 * the reader. Round-tripping a receipt never stamps or renews it.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import {
	isPlainPolicyObject,
	POLICY_OPTIONAL_CATEGORIES,
} from '../../shared/policy-rule';

/** Plain object guard applied before every projection layer. */
const plainObjectSchema = v.custom<Record<string, unknown>>(
	(input) => isPlainPolicyObject(input),
	'Expected a plain object'
);

/** Largest epoch millisecond value `Date` can represent. */
const MAX_DATE_MS = 8_640_000_000_000_000;

/** Safe, non-negative epoch milliseconds inside the `Date` range. */
export const wireTimestampSchema = v.pipe(
	v.number(),
	v.integer(),
	v.minValue(0),
	v.maxValue(MAX_DATE_MS),
	v.description('Epoch milliseconds when the category was confirmed.')
);

/** Which policy contract a decision was confirmed against. */
export const subjectChoiceBasisWireSchema = v.pipe(
	plainObjectSchema,
	v.variant('kind', [
		v.strictObject({
			fingerprint: v.pipe(
				v.string(),
				v.minLength(1),
				v.description('Choice prompt fingerprint (domain choice, version 1).')
			),
			kind: v.literal('choice-v1'),
		}),
		v.strictObject({
			kind: v.literal('legacy-v2'),
			materialFingerprint: v.optional(
				v.pipe(
					v.string(),
					v.minLength(1),
					v.description(
						'v2 material policy fingerprint, when the record had one.'
					)
				)
			),
		}),
	])
);

/** Latest decision for one optional category. */
export const subjectCategoryReceiptWireSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		basis: subjectChoiceBasisWireSchema,
		confirmedAt: wireTimestampSchema,
		value: v.boolean(),
	})
);

const categoryReceiptEntries = Object.fromEntries(
	POLICY_OPTIONAL_CATEGORIES.map((category) => [
		category,
		v.optional(subjectCategoryReceiptWireSchema),
	])
) as Record<
	(typeof POLICY_OPTIONAL_CATEGORIES)[number],
	v.OptionalSchema<typeof subjectCategoryReceiptWireSchema, undefined>
>;

/**
 * Explicit category choices a client confirmed. Absent categories were not
 * confirmed by this action and keep whatever the backend already holds.
 */
export const subjectChoiceWireSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		categories: v.pipe(
			plainObjectSchema,
			v.strictObject(categoryReceiptEntries)
		),
		version: v.literal(3),
	})
);

export type SubjectChoiceBasisWire = v.InferOutput<
	typeof subjectChoiceBasisWireSchema
>;
export type SubjectCategoryReceiptWire = v.InferOutput<
	typeof subjectCategoryReceiptWireSchema
>;
export type SubjectChoiceWire = v.InferOutput<typeof subjectChoiceWireSchema>;
