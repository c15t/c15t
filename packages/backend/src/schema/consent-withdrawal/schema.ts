import { z } from 'zod';

/**
 * Zod schema for validating consent withdrawal entities.
 *
 * This defines the structure and validation rules for consentWithdrawal records:
 * - Required fields: consentId, subjectId
 * - Optional fields: withdrawalReason, withdrawalMethod, ipAddress, metadata
 * - Default current date/time for creation and update timestamps
 *
 * @example
 * ```typescript
 * const withdrawalData = {
 *   id: 'wdr_w5qufx2a66m7xkn3ty',
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   withdrawalReason: 'No longer wish to receive marketing emails',
 *   withdrawalMethod: 'subject-initiated',
 *   ipAddress: '192.168.1.1'
 * };
 *
 * // Validate and parse the consentWithdrawal data
 * const validWithdrawal = consentWithdrawalSchema.parse(withdrawalData);
 * ```
 */
export const consentWithdrawalSchema = z.object({
	id: z.string(),
	consentId: z.string(),
	subjectId: z.string(),
	withdrawalReason: z.string().optional(),
	withdrawalMethod: z
		.enum(['subject-initiated', 'automatic-expiry', 'admin', 'api', 'other'])
		.default('subject-initiated'),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for Withdrawal
 *
 * This type represents the structure of a consent withdrawal record
 * as defined by the consentWithdrawalSchema. It includes all fields
 * that are part of the consentWithdrawal entity.
 */
export type Withdrawal = z.infer<typeof consentWithdrawalSchema>;
