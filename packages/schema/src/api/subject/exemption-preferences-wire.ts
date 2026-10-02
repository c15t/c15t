/** Objection preferences for exempt processing. These are not consent receipts. */
import * as v from 'valibot';

import { isPlainPolicyObject } from '../../shared/policy-rule';
import { wireTimestampSchema } from './choice-wire';

const plainObjectSchema = v.custom<Record<string, unknown>>(
	(input) => isPlainPolicyObject(input),
	'Expected a plain object'
);

/** One explicit objection or reversal, preserving its original action time. */
export const exemptionPreferenceWireSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		confirmedAt: wireTimestampSchema,
		value: v.boolean(),
	})
);

/** Separate preference evidence, never authority for consent-required processing. */
export const exemptionPreferencesWireSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		categories: v.pipe(
			plainObjectSchema,
			v.strictObject({
				experience: v.optional(exemptionPreferenceWireSchema),
				functionality: v.optional(exemptionPreferenceWireSchema),
				marketing: v.optional(exemptionPreferenceWireSchema),
				measurement: v.optional(exemptionPreferenceWireSchema),
			})
		),
		version: v.literal(1),
	})
);

export type ExemptionPreferencesWire = v.InferOutput<
	typeof exemptionPreferencesWireSchema
>;
