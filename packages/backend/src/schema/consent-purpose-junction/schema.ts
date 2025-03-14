import { z } from 'zod';

/**
 * Zod schema for validating consent-purpose junction entities.
 *
 * This defines the structure and validation rules for junction records:
 * - Required fields: consentId, purposeId
 * - Default value of 'active' for status
 * - Default current date/time for creation and update timestamps
 * - Default current date/time for update timestamp
 *
 * @example
 * ```typescript
 * const junctionData = {
 *   id: 'pjx_w5qufx2a66m7xkn3ty',
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   purposeId: 'pur_e8zyhgozr3im7xj59it',
 *   status: 'active'
 * };
 *
 * // Validate and parse the junction data
 * const validJunction = consentPurposeJunctionSchema.parse(junctionData);
 * ```
 */
export const consentPurposeJunctionSchema = z.object({
	id: z.string(),
	consentId: z.string(),
	consentPurposeId: z.string(),
	status: z
		.enum(['active', 'withdrawn'], {
			errorMap: () => ({
				message: "Status must be either 'active' or 'withdrawn'",
			}),
		})
		.default('active'),

	metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for PurposeJunction
 *
 * This type represents the structure of a consent-purpose junction record
 * as defined by the consentPurposeJunctionSchema. It includes all fields
 * that are part of the junction entity.
 */
export type PurposeJunction = z.infer<typeof consentPurposeJunctionSchema>;
