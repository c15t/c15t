/**
 * Configured scripts on the wire (POST /subject).
 *
 * The scripts a page's loaders had configured when the subject acted, each
 * with only the fields that decide whether it may run. No source URL or
 * inline code is sent. A backend stores the list with the consent record
 * so it can later work out which scripts the recorded consent allowed.
 *
 * Entries are objects whose unknown keys are dropped, so a newer client
 * that sends more fields per script still saves against an older backend.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import {
	vendorCategoryConditionSchema,
	vendorIdSchema,
} from '../../shared/vendor';

/** Most entries one save may carry. */
export const MAX_SUBJECT_SCRIPTS = 256;

/** Deepest category condition an entry may carry. Matches core. */
export const MAX_SCRIPT_CONDITION_DEPTH = 16;

/**
 * Whether a condition nests no deeper than core lets a script's. Checked
 * before the recursive schema runs, so a deep tree cannot exhaust the
 * stack of an unauthenticated request.
 */
const withinConditionDepth = function withinConditionDepth(
	value: unknown,
	depth = 0
): boolean {
	if (typeof value !== 'object' || value === null) {
		return true;
	}
	if (depth >= MAX_SCRIPT_CONDITION_DEPTH) {
		return false;
	}
	return Object.values(value).every((operand) =>
		Array.isArray(operand)
			? operand.every((item) => withinConditionDepth(item, depth + 1))
			: withinConditionDepth(operand, depth + 1)
	);
};

// `lazy` sees the input first. OpenAPI generation calls the getter with
// `undefined` and gets the condition schema.
const scriptConditionSchema = v.lazy((input) =>
	withinConditionDepth(input)
		? vendorCategoryConditionSchema
		: v.never(
				`Category condition nests deeper than ${MAX_SCRIPT_CONDITION_DEPTH} levels.`
			)
);

const iabIdsSchema = v.pipe(
	v.array(v.pipe(v.number(), v.safeInteger(), v.minValue(1))),
	v.maxLength(64)
);

/** One configured script's gating fields. */
export const subjectScriptWireSchema = v.object({
	alwaysLoad: v.optional(
		v.pipe(v.literal(true), v.description('Loads regardless of consent.'))
	),
	callbackOnly: v.optional(
		v.pipe(
			v.literal(true),
			v.description('Mounts no element and only runs callbacks.')
		)
	),
	category: v.pipe(
		scriptConditionSchema,
		v.description('Category condition the script loads under.')
	),
	iabLegIntPurposes: v.optional(
		v.pipe(
			iabIdsSchema,
			v.description('IAB TCF purposes usable under legitimate interest.')
		)
	),
	iabPurposes: v.optional(
		v.pipe(iabIdsSchema, v.description('IAB TCF purposes needing consent.'))
	),
	iabSpecialFeatures: v.optional(
		v.pipe(iabIdsSchema, v.description('IAB TCF special features needed.'))
	),
	id: v.pipe(
		v.string(),
		v.minLength(1),
		v.maxLength(256),
		v.description('The script id configured on the page.')
	),
	persistAfterConsentRevoked: v.optional(
		v.pipe(
			v.literal(true),
			v.description('Stays on the page after consent is revoked.')
		)
	),
	vendor: v.optional(vendorIdSchema),
	vendorId: v.optional(
		v.pipe(
			v.union([
				v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
				v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
			]),
			v.description('IAB TCF vendor ID.')
		)
	),
});

/** Every script the page had configured when the subject acted. */
export const subjectScriptsWireSchema = v.pipe(
	v.array(subjectScriptWireSchema),
	v.maxLength(MAX_SUBJECT_SCRIPTS),
	v.description(
		'Gating fields of each script the page had configured when the subject acted, whether or not the consent let it load.'
	),
	v.examples([
		[
			{ category: 'measurement', id: 'google-analytics', vendorId: 755 },
			{ category: 'marketing', id: 'meta-pixel', vendor: 'meta-pixel' },
		],
	])
);

export type SubjectScriptWire = v.InferOutput<typeof subjectScriptWireSchema>;
export type SubjectScriptsWire = v.InferOutput<typeof subjectScriptsWireSchema>;
