/**
 * Vendor-level consent on the wire (POST /subject, GET /subject/:id).
 *
 * One confirmation time for the whole map: a vendor toggle is a single act,
 * unlike category receipts which each carry their own basis and expiry. The
 * map lists every vendor the client knew about at save time with its
 * granted flag, so a backend can store and replay the complete decision
 * without knowing the vendor list itself.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

import { isPlainPolicyObject } from '../../shared/policy-rule';
import { vendorIdSchema } from '../../shared/vendor';
import { wireTimestampSchema } from './choice-wire';

const plainObjectSchema = v.custom<Record<string, unknown>>(
	(input) => isPlainPolicyObject(input),
	'Expected a plain object'
);

/** Per-vendor grants a client confirmed in one action. */
export const vendorChoiceWireSchema = v.pipe(
	plainObjectSchema,
	v.strictObject({
		confirmedAt: v.pipe(
			wireTimestampSchema,
			v.description('Epoch milliseconds when the vendor grants were confirmed.')
		),
		grants: v.pipe(
			plainObjectSchema,
			v.record(vendorIdSchema, v.boolean()),
			v.description('Granted flag per declared vendor id.')
		),
		version: v.literal(1),
	})
);

export type VendorChoiceWire = v.InferOutput<typeof vendorChoiceWireSchema>;
