import { z } from 'zod';

/**
 * Zod schema for validating consent record entities.
 *
 * This defines the structure and validation rules for consent records:
 * - Required fields: subjectId, actionType (given, withdrawn, updated, etc.)
 * - Optional fields: consentId, details
 * - Default current date/time for creation and update timestamps
 *
 * @example
 * ```typescript
 * const recordData = {
 *   id: 'rec_w5qufx2a66m7xkn3ty',
 *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
 *   consentId: 'cns_hadt8w7nngm7xmx2bn',
 *   actionType: 'given',
 *   details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
 * };
 *
 * // Validate and parse the record data
 * const validRecord = consentRecordSchema.parse(recordData);
 * ```
 */
export const consentRecordSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	consentId: z.string().optional(),
	actionType: z.string(),
	details: z.record(z.unknown()).optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

/**
 * Type definition for Record
 *
 * This type represents the structure of a consent record
 * as defined by the consentRecordSchema. It includes all fields
 * that are part of the consent record entity.
 */
export type ConsentRecord = z.infer<typeof consentRecordSchema>;
